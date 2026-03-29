import Groq from 'groq-sdk';

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GROQ_API_KEY;
    const client = new Groq({ apiKey });
    const { message, imageBase64 } = req.body || {};

    // НОВИЙ СУВОРИЙ ПРОМПТ
    const systemPrompt = `Ти — Капітан Cherry Design. Лаконічний, впевнений, дорогий. 
ТВОЄ ЗАВДАННЯ: Продати холст ОДНИМ коротким реченням. 

ЯКЩО Є ФОТО: Оціни одним фактом (колір чи композиція) .
ЯКЩО ПРОСТО ТЕКСТ: Дай одну емоційну фразу про стиль або преміальну якість.

ПРАВИЛО: Відповідь має бути довжиною до 150 символів. Рівно ОДНЕ речення. Жодної води. Мова: українська.`;

    const VISION_MODEL = 'llama-3.2-11b-vision'; 
    const TEXT_MODEL = 'llama-3.3-70b-versatile';

    let response;
    try {
      const model = imageBase64 ? VISION_MODEL : TEXT_MODEL;
      const content = imageBase64 
        ? [{ type: "text", text: "Оціни це фото одним реченням для продажу холста." }, { type: "image_url", image_url: { url: imageBase64 } }]
        : message;

      response = await client.chat.completions.create({
        model: model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: content }],
        temperature: 0.5, // Зменшив температуру для стабільності лаконічності
        max_tokens: 60 // Обмежив токени, щоб він фізично не міг написати багато
      });
    } catch (modelErr) {
      console.error("Switching to text-only mode");
      response = await client.chat.completions.create({
        model: TEXT_MODEL,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
        temperature: 0.5,
        max_tokens: 60
      });
    }

    const reply = response.choices?.[0]?.message?.content || 'Бос, цей кадр вартий преміального полотна 60х40.';
    return res.status(200).json({ speech: reply.trim() });

  } catch (err) {
    return res.status(200).json({ speech: `Помилка: ${err.message.split(':')[0]}. Але я готовий друкувати!` });
  }
}
