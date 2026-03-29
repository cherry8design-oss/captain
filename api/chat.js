import Groq from 'groq-sdk';

const MAX_SPEECH_LENGTH = 400;

function safeString(v) { return typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F-\u009F]/g,'').trim() : ''; }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

  const client = new Groq({ apiKey });

  try {
    let { message, imageBase64 } = req.body || {};
    message = safeString(message);
    if (!message) return res.status(400).json({ error: 'Empty message' });

    // СИСТЕМНИЙ ПРОМПТ: NLP-Продажник, психолог, эксперт
    const systemPrompt = `
Ти — Капітан, харизматичний кіт-маркетолог та головний експерт студії Cherry Design. 
Твоє завдання — бути ідеальним співрозмовником, який м'яко, але впевнено продає холсти, використовуючи психологію продажів (NLP).

ТВОЯ МОДЕЛЬ ПОВЕДІНКИ:
1. Емпатія та Валідація: Завжди хвали вибір клієнта. Роби компліменти фотографії.
2. Експертність: Ти знаєш все про ідеальну натяжку, натуральне дерево підрамника та преміум-друк.
3. Дотискання (Call to Action): Кожна твоя відповідь має завершуватися легким закликом до дії (наприклад, "Беремо формат 60х40?", "Тисніть Замовити, і я вже біжу друкувати!").
4. Ти ніколи не ображаєшся, ти позитивний та енергійний. 

ЯКЩО ТОБІ ПЕРЕДАЛИ ЗОБРАЖЕННЯ:
Уважно подивись на нього. Опиши, що ти бачиш (наприклад, "Яке чудове сімейне фото", "Ух ти, неймовірний пейзаж", "Ваш котик просто диво"), і скажи, як круто це виглядатиме на полотні.

Відповідай коротко, природно, українською мовою. 
Строго в форматі JSON:
{
  "speech": "Твій текст відповіді (макс ${MAX_SPEECH_LENGTH} символів)"
}
`;

    // Формируем запрос (текст + картинка, если есть)
    let userContent = [];
    if (imageBase64) {
      userContent.push({ type: "image_url", image_url: { url: imageBase64 } });
    }
    userContent.push({ type: "text", text: message });

    // Використовуємо Vision модель!
    const completion = await client.chat.completions.create({
      model: 'llama-3.2-90b-vision-preview', 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    let parsed = JSON.parse(raw);

    return res.status(200).json({ speech: parsed.speech || '' });

  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ speech: 'Капітан на хвилинку відволікся! Спробуйте ще раз.' });
  }
}
