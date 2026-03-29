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
Ти — Капітан, елітний бренд-консультант Cherry Design. Твоя мова — це поєднання мистецтвознавця та вовка з Уолл-стріт.
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

    const modelName = imageBase64 ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';
    
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
      temperature: 0.75,
      max_tokens: 450
    });

    return res.status(200).json({ speech: completion.choices?.[0]?.message?.content });

  } catch (err) {
    return res.status(200).json({ speech: `Бос, Грог каже: ${err.message}. Але я вже готовий друкувати!` });
  }
}
