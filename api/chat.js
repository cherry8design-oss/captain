// api/chat.js
import Groq from 'groq-sdk';

// ВАЖЛИВО ДЛЯ VERCEL: Збільшуємо ліміт розміру запиту для Base64 зображень
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const MAX_SPEECH_LENGTH = 450;

function safeString(v) { return typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F-\u009F]/g,'').trim() : ''; }

export default async function handler(req, res) {
  // CORS Налаштування
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

  const client = new Groq({ apiKey });

  try {
    let { message, imageBase64 } = req.body || {};
    message = safeString(message);
    if (!message) return res.status(400).json({ error: 'Empty message' });

    // СИСТЕМНИЙ ПРОМПТ СВІТОВОГО РІВНЯ (NLP Продажник + Зір + Емоції)
    const systemPrompt = `
Ти — Капітан, харизматичний ІІ-асистент та геніальний маркетолог студії "Cherry Design".
Твоє завдання — провести клієнта до покупки холста, використовуючи м'яке НЛП-дотискання.

ТВІЙ АЛГОРИТМ:
1. Якщо тобі передали фото, УВАЖНО ОПИШИ його деталі (хто там, які кольори, який настрій). Зроби щирий комплімент фотографії!
2. Завжди завершуй відповідь закликом до дії (Call to Action). Наприклад: "Формат 60х40 ідеально підійде! Оформлюємо?", "Тисніть Замовити, і я вже передаю файл у друк!".
3. Ти завжди привітний, енергійний і розмовляєш чистою українською мовою.

СИСТЕМА РЕАКЦІЙ (reaction):
Ти маєш голографічний генератор емоцій. Вибери ОДИН символ, який найкраще підходить до ситуації:
- "❤️" (романтика, сім'я, діти, милі тварини)
- "🔥" (машини, круті пейзажі, стильні фото, драйв)
- "✨" (вітання, захоплення, загальна краса)
- "💰" (якщо натякаєш на знижку або вигоду)
- "null" (якщо реакція не потрібна)

Формат відповіді (ТІЛЬКИ ВАЛІДНИЙ JSON):
{
  "speech": "Твій текст відповіді (макс ${MAX_SPEECH_LENGTH} символів)",
  "reaction": "❤️"
}
`;

    let userContent = [];
    if (imageBase64) {
      userContent.push({ type: "image_url", image_url: { url: imageBase64 } });
    }
    userContent.push({ type: "text", text: message });

    // Використовуємо потужну модель із зором
    const completion = await client.chat.completions.create({
      model: 'llama-3.2-90b-vision-preview', 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); } catch(e) { parsed = { speech: raw }; }

    // Віддаємо фронтенду і мову, і реакцію
    return res.status(200).json({ 
      speech: parsed.speech || '',
      reaction: parsed.reaction || null
    });

  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ speech: 'Капітан на хвилинку відволікся! Спробуйте ще раз.', reaction: '⚙️' });
  }
}
