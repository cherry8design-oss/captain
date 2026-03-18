import Groq from 'groq-sdk';

export default async function handler(req, res) {
    // 1. Настройки CORS (чтобы сайт cherrydesign.shop мог общаться с сервером)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Ответ на предварительную проверку браузера
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Инициализация клиента ВНУТРИ функции
    // Проверяем, есть ли ключ в настройках Vercel
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Ключ GROQ_API_KEY не найден!");
        return res.status(500).json({ error: "Ключ API не настроен на сервере" });
    }

    const client = new Groq({ apiKey });

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "Сообщение пустое" });

        // 3. Запрос к нейросети
        const completion = await client.chat.completions.create({
            messages: [
                { role: 'system', content: 'Ты Капитан. Отвечай коротко, дерзко и по-пиратски. Используй морской сленг.' },
                { role: 'user', content: message }
            ],
            model: 'mixtral-8x7b-32768',
        });

        const replyText = completion.choices[0]?.message?.content || "Карамба, я онемел!";

        // 4. Отправляем ответ роботу
        res.status(200).json({
            speech: replyText,
            animation: 'talk'
        });

    } catch (error) {
        console.error("ОШИБКА GROQ:", error);
        res.status(500).json({ error: "Оборвался канат связи!", details: error.message });
    }
}
