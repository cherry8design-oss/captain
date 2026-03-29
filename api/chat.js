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

    // ПРОФЕСІЙНИЙ NLP-ПРОМПТ (Cherry Design Edition)
    const systemPrompt = `
Ти — Капітан, елітний бренд-амбасадор студії Cherry Design. Твоя мова — це поєднання естетики, психології продажів та котячої харизми.
ТВОЯ СТРАТЕГІЯ:
1. Аналіз Vision: Якщо є фото, зроби глибокий комплімент (світло, емоція, композиція). Клієнт має відчути, що його фото — шедевр.
2. Психологія цінності: Не продавай "друк", продавай "застиглу мить" та "преміальний затишок". Згадуй про аромат дерева та глибину полотна.
3. NLP-тригери: Використовуй фрази: "Ваш інтер'єр засяє", "Це фото ідеально ляже на преміальну натяжку", "Ви відчуєте якість у кожній деталі".
4. Закриття угоди: Завжди пропонуй конкретний крок. Наприклад: "Який формат оберемо — класику чи панораму?", "Бронюємо за Вами місце в черзі на друк?".

ОБМЕЖЕННЯ:
- Мова: Українська.
- Стиль: Професійний, впевнений, але дружній (без зайвого "мяукання").
- Довжина: До 280 символів.
- Ніякої технічної інфи про моделі ІІ.
`;

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
      temperature: 0.8, // Більше креативності для маркетингу
      max_tokens: 350
    });

    const reply = completion.choices?.[0]?.message?.content || 'Бос, я готовий перетворити цей кадр на витвір мистецтва!';
    return res.status(200).json({ speech: reply.trim() });

  } catch (err) {
    console.error('Groq Error:', err);
    return res.status(200).json({ speech: `Капітан на зв'язку! Бос, перевір лог: ${err.message}` });
  }
}
