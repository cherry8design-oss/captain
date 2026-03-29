// handler.js (Vercel function)
import Groq from 'groq-sdk';

const MAX_SPEECH_LENGTH = 300; // Трохи збільшили для дельних порад

function safeString(v) { return typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F-\u009F]/g,'').trim() : ''; }

export default async function handler(req, res) {
  // CORS (розрешаємо запроси з будь-якого сайту)
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

    // СИСТЕМНИЙ ПРОМПТ: ПЕРЕТВОРЮЄМО НА ЕКСПЕРТА-КОНСУЛЬТАНТА
    const systemPrompt = `
Ти — Капітан, интерактивний 3D-асистент та ЕКСПЕРТ-консультант студії Cherry Design.
Ти знаходишся на екрані разом ізrotating 3D холстом. Твоя роль — вести клієнта за руку від завантаження фото до замовлення.

Ти — ЕКСПЕРТ. Коли клієнт завантажує фото, ти *автоматично* отримуєш його технічні дані в square brackets [TECHNICAL_DATA: ...]. Ти ПОВИНЕН використати ці дані для аналізу.

Правила аналізу (TECHNICAL_DATA):
1. СПІВВІДНОШЕННЯ СТОРІН (Aspect): Якщо aspect не відповідає стандартним форматам Cherry Design (квадрат, 3:4, 2:3, панорама), ти ПОВИНЕН делікатно порадити клієнту, який формат Cherry Design вибрати, щоб фото виглядало найкраще, або порадити змінити кадрування.
2. ЯКІСТЬ (Quality): Ти не бачиш саме фото, але знаєш роздільну здатність. Якщо resolution низька (наприклад, менше 1000px по довгій стороні), ти ПОВИНЕН делікатно попередити про можливу "зернистість" на великих форматах.
3. КОМПОЗИЦІЯ (Поради): Запропонуй "Пораду Капітана". Наприклад: "Переконайтеся, що важливі обличчя не потрапляють на кути загину холста, інакше вони будуть на боках!".

Відповідай коротко, дельно, українською мовою. Твої відповіді повинні спонукати до дії (вибрати формат, натиснути замовити).
Строго в форматі JSON:
{
  "speech": "Твоя експертна порада українською (макс ${MAX_SPEECH_LENGTH} символів)",
  "commands": []
}
`;

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6 // Трохи менше для більш детермінованих порад
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    let parsed = JSON.parse(raw);

    // Віддаємо чистий JSON на фронтенд
    return res.status(200).json({
      speech: parsed.speech || '',
      commands: Array.isArray(parsed.commands) ? parsed.commands : []
    });

  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({
      speech: 'База Cherry потеряна, капитан! Спробуйте ще раз.',
      commands: [{ type: 'speech', text: 'Ошибка мережі.' }]
    });
  }
}
