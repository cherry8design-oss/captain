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

    const systemPrompt = `Ти — Капітан, елітний бренд-амбасадор Cherry Design. 
Твоя мета — продати друк на холсті. Будь професійним психологом та маркетологом.
1. Хвали вибір клієнта. 2. Описуй естетику (дерево, текстура полотна). 3. Закривай угоду запитанням про розмір.
Відповідай коротко (до 250 символів) українською мовою.`;

    // ВИПРАВЛЕНО: Використовуємо тільки актуальні моделі
    // Якщо Vision-модель відсутня, ми просто шлемо текст, щоб чат не падав
    let modelName = 'llama-3.3-70b-versatile'; 
    let userContent = message;

    if (imageBase64) {
      // Спробуємо використати актуальну Vision модель, якщо вона доступна
      modelName = 'llama-3.2-11b-vision-preview'; 
      userContent = [
        { type: "text", text: message },
        { type: "image_url", image_url: { url: imageBase64 } }
      ];
    }

    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.7
    });

    const reply = completion.choices?.[0]?.message?.content || 'Бос, я на зв’язку!';
    return res.status(200).json({ speech: reply.trim() });

  } catch (err) {
    console.error('Groq Error:', err);
    // Якщо Vision модель видала помилку "decommissioned", Капітан ввічливо перепросить
    return res.status(200).json({ speech: `Мяу! Бос, Groq знову міняє моделі (Помилка: ${err.message.split('{')[0]}). Але я все одно готовий працювати!` });
  }
}
