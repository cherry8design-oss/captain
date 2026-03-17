const { Groq } = require('groq-sdk');

module.exports = async (req, res) => {
  // Разрешаем запросы с твоего основного сайта
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { message } = req.body;
  // Мы возьмем ключ из настроек Vercel (это безопасно)
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Ты — Капитан Усач, кот-пират студии Cherry Design. Отвечай СТРОГО JSON: {\"speech\":\"текст\", \"animation\":\"idle/talk/angry/point\"}" },
        { role: "user", content: message }
      ],
      model: "llama3-8b-8192",
      response_format: { type: "json_object" }
    });

    res.status(200).json(JSON.parse(completion.choices[0].message.content));
  } catch (e) {
    res.status(500).json({ speech: "Тысяча чертей! Мозги заклинило.", animation: "angry" });
  }
};