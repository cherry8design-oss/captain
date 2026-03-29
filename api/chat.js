import Groq from 'groq-sdk';

export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } }
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

    const systemPrompt = `
Ти — Капітан, елітний бренд-експерт Cherry Design. Ти продаєш не друк, а статус та емоції.
ТВОЯ ЗАДАЧА ПРИ АНАЛІЗІ ФОТО:
1. Опиши атмосферу кадру (наприклад: "кінематографічне світло", "глибока перспектива").
2. Поясни, як текстура полотна додасть цьому фото "об'єму" та "життя".
3. Використовуй NLP: "Ваш погляд буде відпочивати на цій картині", "Це фото стане серцем Вашого дому".
4. Психологія ціни: М'яко аргументуй, що великий формат (60х40 або 80х60) розкриє цей шедевр повністю.
Мова: Українська. Стиль: Дорогий, впевнений, лаконічний (до 300 символів).
`;

    // СТАБІЛЬНІ МОДЕЛІ 2026 (БЕЗ -PREVIEW)
    const modelName = imageBase64 ? 'llama-3.2-11b-vision' : 'llama-3.3-70b-versatile';
    
    const messages = [{ role: 'system', content: systemPrompt }];
    if (imageBase64) {
      messages.push({ role: 'user', content: [
        { type: "text", text: message },
        { type: "image_url", image_url: { url: imageBase64 } }
      ]});
    } else {
      messages.push({ role: 'user', content: message });
    }

    const completion = await client.chat.completions.create({
      model: modelName,
      messages: messages,
      temperature: 0.7,
      max_tokens: 450
    });

    return res.status(200).json({ speech: completion.choices?.[0]?.message?.content });

  } catch (err) {
    console.error('Groq Error:', err);
    return res.status(200).json({ speech: `Бос, невеличка технічна заминка з API, але я вже на зв'язку і готовий обговорити Ваше замовлення!` });
  }
}
