import Groq from 'groq-sdk';

// Дозволяємо Vercel приймати фото до 4МБ
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

    const systemPrompt = `
Ти — Капітан, елітний бренд-амбасадор Cherry Design. Твоя мова — це психологія продажів та естетика.
ТВОЯ СТРАТЕГІЯ:
1. Аналіз Vision: Якщо є фото, зроби глибокий комплімент композиції. Клієнт має відчути, що його фото — шедевр.
2. Психологія: Не продавай друк, продавай "застиглу емоцію" та "преміальний затишок".
3. Закриття: Завжди пропонуй конкретний крок. Наприклад: "Який формат оберемо — 60х40 чи панораму?".
Відповідай коротко (до 280 символів) українською мовою. Без технічного жаргону.
`;

    // Тільки ці моделі зараз працюють стабільно
    const modelName = imageBase64 ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';
    const userContent = imageBase64 
      ? [{ type: "text", text: message }, { type: "image_url", image_url: { url: imageBase64 } }]
      : message;

    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.8,
      max_tokens: 350
    });

    const reply = completion.choices?.[0]?.message?.content || 'Бос, я на зв’язку!';
    return res.status(200).json({ speech: reply.trim() });

  } catch (err) {
    console.error('Groq Error:', err);
    return res.status(200).json({ speech: `Мяу! Помилка: ${err.message}. Спробуй ще раз!` });
  }
}
