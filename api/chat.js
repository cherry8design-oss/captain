// api/chat.js
import Groq from 'groq-sdk';
import fetch from 'node-fetch';

const MAX_MESSAGE_LENGTH = 3000;
const MAX_SPEECH_LENGTH = 180;
const ALLOWED_BASE_ANIMS = new Set(['idle','thinking','explaining','angry']);

function safeString(v){ if(typeof v !== 'string') return ''; return v.replace(/[\u0000-\u001F\u007F-\u009F]/g,'').trim(); }
function validateChoreoOverrides(obj){
  if(!obj || typeof obj !== 'object') return {};
  const out = {};
  for(const k of Object.keys(obj)){
    const v = obj[k];
    if(!v || typeof v !== 'object') continue;
    out[k] = { s: Number(v.s) || 0, a: Number(v.a) || 0, ax: typeof v.ax === 'string' ? v.ax : undefined };
  }
  return out;
}

// Upstash publish (optional). Если не настроен, просто noop.
async function upstashPublish(channel, message){
  const url = process.env.UPSTASH_REST_URL;
  const token = process.env.UPSTASH_REST_TOKEN;
  if(!url || !token) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ channel, message })
    });
  } catch(e){
    console.warn('Upstash publish failed', e?.message || e);
  }
}

export default async function handler(req, res){
  // CORS
  res.setHeader('Access-Control-Allow-Credentials','true');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');

  if(req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GROQ_API_KEY;
  if(!apiKey) {
    console.error('GROQ_API_KEY missing');
    return res.status(500).json({ error: 'GROQ_API_KEY missing' });
  }

  const client = new Groq({ apiKey });

  try {
    const body = req.body || {};
    let { message, context, userId, priority } = body;
    message = safeString(message || '');
    if(!message) return res.status(400).json({ error: 'Empty message' });
    if(message.length > MAX_MESSAGE_LENGTH) return res.status(400).json({ error: 'Message too long' });

    context = (context && typeof context === 'object') ? context : {};
    userId = safeString(userId || 'global');
    priority = Number(priority || 0);
    const mouseX = typeof context.mouseX === 'number' ? context.mouseX : (context?.mouseX ? Number(context.mouseX) : 0);

    const systemPrompt = `
Ты — ИИ-Дирижер студии Cherry Design.
Внутри себя последовательно: Навигатор, Арт-директор, затем Капитан и Хореограф.
Контекст: cursorX=${mouseX}.
Отвечай строго JSON:
{
  "speech":"... (<= ${MAX_SPEECH_LENGTH} chars)",
  "baseAnim":"idle|thinking|explaining|angry",
  "choreoOverrides":{...},
  "commands":[
    { "type":"move", "x":1.2, "z":-0.5, "priority": 40 },
    { "type":"animation", "name":"wave", "priority":30 }
  ]
}
`;

    console.log('chat request', { userId, message: message.slice(0,200), mouseX, priority });

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    console.log('LLM raw preview:', String(raw).slice(0,1000));

    let parsed = null;
    try {
      parsed = (typeof raw === 'object') ? raw : JSON.parse(String(raw).trim());
    } catch(e){
      const s = String(raw);
      const a = s.indexOf('{'), b = s.lastIndexOf('}');
      if(a >= 0 && b > a) {
        try { parsed = JSON.parse(s.slice(a, b+1)); } catch(e2){ parsed = null; }
      }
    }

    if(!parsed || typeof parsed !== 'object'){
      console.warn('Model returned invalid JSON', String(raw).slice(0,1000));
      return res.status(502).json({ error: 'Model returned invalid JSON', raw: String(raw).slice(0,1000) });
    }

    const speech = safeString(parsed.speech || '').slice(0, MAX_SPEECH_LENGTH);
    const baseAnim = ALLOWED_BASE_ANIMS.has(safeString(parsed.baseAnim || 'idle')) ? parsed.baseAnim : 'idle';
    const choreoOverrides = validateChoreoOverrides(parsed.choreoOverrides || {});
    const commands = Array.isArray(parsed.commands) ? parsed.commands : [];

    const normalized = [];
    for(const cmd of commands){
      if(!cmd || typeof cmd !== 'object' || !cmd.type) continue;
      const type = safeString(cmd.type);
      const cmdPriority = Number(cmd.priority || priority || 0);
      if(type === 'move' && typeof cmd.x === 'number' && typeof cmd.z === 'number'){
        normalized.push({ type:'move', x: Number(cmd.x), z: Number(cmd.z), priority: cmdPriority });
      } else if(type === 'animation' && typeof cmd.name === 'string'){
        normalized.push({ type:'animation', name: safeString(cmd.name), priority: cmdPriority });
      } else if(type === 'speech' && typeof cmd.text === 'string'){
        normalized.push({ type:'speech', text: safeString(cmd.text).slice(0, MAX_SPEECH_LENGTH), priority: cmdPriority });
      }
    }

    // publish commands (optional)
    for(const c of normalized){
      const payload = { type: 'orchestrator.command', command: c, meta: { from: 'chat', timestamp: Date.now() } };
      const channel = `user:${userId}`;
      await upstashPublish(channel, payload);
    }

    const decision = { speech, baseAnim, choreoOverrides, commands: normalized, meta: { timestamp: Date.now() } };
    await upstashPublish(`user:${userId}:decision`, decision);

    return res.status(200).json(decision);

  } catch (err) {
    console.error('chat handler error', err);
    return res.status(500).json({
      speech: 'Корабль идет ко дну! Связь оборвана!',
      baseAnim: 'angry',
      choreoOverrides: { head:{s:10,a:0.4,ax:'x'} },
      meta: { error: String(err?.message || err), timestamp: Date.now() }
    });
  }
}
