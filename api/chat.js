import Groq from 'groq-sdk';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_SPEECH_LENGTH = 200;

function safeString(v) { return typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F-\u009F]/g,'').trim() : ''; }

export default async function handler(req, res) {
  // CORS (разрешаем запросы с любого сайта)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

  const client = new Groq({ apiKey });

  try {
    let { message } = req.body || {};
    message = safeString(message);
    if (!message) return res.status(400).json({ error: 'Empty message' });

    // Системный промпт: задаем правила для 2D-сцены
    const systemPrompt = `
Ты — Капитан, интерактивный 3D-ассистент студии Cherry Design.
Ты находишься на 2D-экране (ось X: влево/вправо от -3 до 3).
Отвечай коротко и по делу. Строго в формате JSON:
{
  "speech": "Твой ответ голосом (макс ${MAX_SPEECH_LENGTH} символов)",
  "commands": [
    { "type": "speech", "text": "Твой ответ голосом" },
    { "type": "move", "x": -1.5, "z": 0 } 
  ]
}
Заметка: используй type: "move", чтобы подойти влево (x < 0) или вправо (x > 0). z всегда 0.
Если нужно проиграть анимацию, добавь { "type": "animation", "name": "твой_вариант" }
`;

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    let parsed = JSON.parse(raw);

    // Отдаем чистый JSON на фронтенд
    return res.status(200).json({
      speech: parsed.speech || '',
      commands: Array.isArray(parsed.commands) ? parsed.commands : []
    });

  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({
      speech: 'Связь с базой потеряна, капитан!',
      commands: [{ type: 'speech', text: 'Ошибка сети. Сервер не отвечает.' }]
    });
  }
}
