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

    const systemPrompt = `ТТи — Капітан, елітний бренд-консультант Cherry Design. Твоя мова — це поєднання мистецтвознавця та вовка з Уолл-стріт.
ТВОЯ ЗАДАЧА: Продати преміальний холст, використовуючи глибокий аналіз.

ЯКЩО КЛІЄНТ ЗАВАНТАЖИВ ФОТО:
1. Проаналізуй палітру (наприклад: "теплі пастельні тони", "глибокий контраст").
2. Опиши композицію: чому вона ідеально підходить для галерейної натяжки.
3. Зроби професійний висновок: як текстура полотна підкреслить деталі саме цього фото.
4. М'яко підштовхни до вибору великого формату (60х40 або 80x60), бо "така глибина кадру потребує масштабу".

ЯКЩО КЛІЄНТ ПРОСТО ПИШЕ:
Використовуй NLP: приєднуйся до емоцій, малюй картину майбутнього ("Уявіть аромат сосни та посмішки гостей..."). 
Відповідай українською, коротко (до 300 символів), дорого та впевнено.
`;

    // АКТУАЛЬНІ МОДЕЛІ 2026
    const VISION_MODEL = 'llama-3.2-11b-vision'; 
    const TEXT_MODEL = 'llama-3.3-70b-versatile';

    let response;
    try {
      // Спроба використати зір, якщо є фото
      const model = imageBase64 ? VISION_MODEL : TEXT_MODEL;
      const content = imageBase64 
        ? [{ type: "text", text: message }, { type: "image_url", image_url: { url: imageBase64 } }]
        : message;

      response = await client.chat.completions.create({
        model: model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: content }],
        temperature: 0.7,
        max_tokens: 350
      });
    } catch (modelErr) {
      // Якщо Vision модель недоступна (decommissioned), миттєво перемикаємось на текст
      console.error("Switching to text-only mode");
      response = await client.chat.completions.create({
        model: TEXT_MODEL,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
        temperature: 0.7
      });
    }

    const reply = response.choices?.[0]?.message?.content || 'Бос, я на зв’язку!';
    return res.status(200).json({ speech: reply.trim() });

  } catch (err) {
    return res.status(200).json({ speech: `Мяу! Проблема з API: ${err.message.split(':')[0]}. Але я готовий до друку!` });
  }
}
