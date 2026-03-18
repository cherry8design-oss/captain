import Groq from 'groq-sdk';

export default async function handler(req, res) {
    // 1. Настройки CORS — разрешаем твоему сайту cherrydesign.shop подключаться
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Позже можно заменить на твой домен
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

    // 2. Проверка ключа API
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.error("ОШИБКА: GROQ_API_KEY не найден в переменных Vercel");
        return res.status(500).json({ error: "Ошибка конфигурации сервера" });
    }

    const client = new Groq({ apiKey });

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "Пустое сообщение" });

        // 3. Запрос к новой бесплатной модели Llama 3.3
        const completion = await client.chat.completions.create({
            messages: [
                { 
                    role: 'system', 
                    content: 'Ты — Капитан пиратского корабля. Твоя задача: отвечать коротко (не более 2 фраз), использовать пиратский сленг (якорь мне в бухту, карамба, тысяча чертей) и быть немного дерзким.' 
                },
                { role: 'user', content: message }
            ],
            model: 'llama-3.3-70b-versatile', // Самая новая и мощная модель
            temperature: 0.8,
            max_tokens: 100
        });

        const replyText = completion.choices[0]?.message?.content || "Карамба! Я потерял дар речи!";

        // 4. Логика выбора анимации для робота
        let anim = 'talk'; // По умолчанию машет рукой
        const lowerText = replyText.toLowerCase();
        
        if (lowerText.includes('нет') || lowerText.includes('не') || lowerText.includes('черт')) {
            anim = 'angry'; // Злится
        } else if (lowerText.includes('да') || lowerText.includes('конечно') || lowerText.includes('так точно')) {
            anim = 'point'; // Показывает класс
        }

        // Отправляем результат на сайт
        res.status(200).json({
            speech: replyText,
            animation: anim
        });

    } catch (error) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА GROQ:", error);
        res.status(500).json({ 
            error: "Связь с капитаном прервана!",
            details: error.message 
        });
    }
}
