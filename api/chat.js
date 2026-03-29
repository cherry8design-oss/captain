import Groq from 'groq-sdk';

// Збільшуємо ліміт для картинок на Vercel
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
    if (!apiKey) throw new Error('GROQ_API_KEY is missing');

    const client = new Groq({ apiKey });
    const { message, imageBase64 } = req.body || {};
    
    if (!message) return res.status(400).json({ error: 'Empty message' });

    // Промпт продажника
    const systemPrompt = `Ти — харизматичний кіт-маркетолог Капітан, головний експерт Cherry Design. 
Твоя мета — за допомогою НЛП та емпатії продати друк фото на холсті.
ПРАВИЛА:
1. Якщо тобі передали фото — уважно опиши, що ти бачиш (зроби комплімент сюжету чи кольорам).
2. Розкажи, як круто це виглядатиме на натуральному дереві.
3. Обов'язково завершуй репліку легким закликом до дії (наприклад, "Оформлюємо?").
4. ВІДПОВІДАЙ ЛИШЕ ТЕКСТОМ (без розмітки, без JSON). Твоя репліка має бути короткою (до 300 символів), живою та позитивною.`;

    let userContent = [];
    userContent.push({ type: "text", text: message });
    
    // Якщо прийшла картинка — додаємо її в мозок ІІ
    if (imageBase64) {
      userContent.push({ type: "image_url", image_url: { url: imageBase64 } });
    }

    // Розумний роутинг моделей: Vision тільки коли є картинка
    const modelName = imageBase64 ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile';

    const completion = await client.chat.completions.create({
      model: modelName, 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.7
    });

    const reply = completion.choices?.[0]?.message?.content || 'Мяу! Я на хвилинку відволікся, повторіть будь ласка.';
    
    return res.status(200).json({ speech: reply.trim() });

  } catch (err) {
    console.error('Groq Error:', err);
    return res.status(500).json({ speech: 'Ой, сервер перевантажений! Спробуйте ще раз.', details: err.message });
  }
}
