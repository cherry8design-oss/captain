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

    // Елітний NLP-промпт
    const systemPrompt = `Ти — Капітан, елітний експерт Cherry Design. Твоя мова — це психологія естетики.
СТРАТЕГІЯ: 
1. Якщо є фото: зроби комплімент стилю, світлу чи емоції. Клієнт має відчути, що це фото варте галереї.
2. Продавай не папір, а "центр тяжіння в інтер'єрі" та "аромат справжнього дерева".
3. Використовуй NLP-закриття: "Який формат зробить цей кадр величним — класика чи гранд-панорама?".
Мова: Українська. Стиль: Впевнений, дорогий. Довжина: до 280 символів.`;

    const modelName = imageBase64 ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';
    
    let content = [{ type: "text", text: message }];
    if (imageBase64) content.push({ type: "image_url", image_url: { url: imageBase64 } });

    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content }
      ],
      temperature: 0.7,
      max_tokens: 400
    });

    const reply = completion.choices?.[0]?.message?.content || 'Бос, я на зв’язку, готовий створювати шедевр!';
    return res.status(200).json({ speech: reply.trim() });

  } catch (err) {
    console.error('Groq Error:', err);
    // Повертаємо 200, щоб Капітан сам озвучив помилку, а не вішав сайт
    return res.status(200).json({ speech: `Мяу! Бос, Groq каже: ${err.message.split(' (')[0]}. Але я все одно готовий до друку!` });
  }
}
