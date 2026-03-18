const Groq = require('groq-sdk');

// Инициализируем клиента
const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Экспортируем функцию по классическому стандарту Vercel
module.exports = async function handler(req, res) {
    // 1. НАСТРОЙКИ CORS (пропускаем запросы с твоего сайта)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Если это предварительный запрос от браузера (OPTIONS) - говорим "всё ок"
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Разрешен только метод POST' });
    }

    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Нет сообщения от пользователя' });
        }

        // 2. ЗАПРОС К НЕЙРОСЕТИ GROQ
        const completion = await client.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'Ты Капитан пиратского корабля. Отвечай коротко, дерзко, используй пиратский сленг.'
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            model: 'mixtral-8x7b-32768', // Модель Groq
            temperature: 0.7,
            max_tokens: 150
        });

        const replyText = completion.choices[0]?.message?.content || "Карамба, я потерял дар речи!";

        // 3. ВЫБИРАЕМ АНИМАЦИЮ В ЗАВИСИМОСТИ ОТ ТЕКСТА
        let anim = 'idle';
        let lowerReply = replyText.toLowerCase();
        
        if (replyText.includes('!')) anim = 'talk'; // Машет рукой
        if (lowerReply.includes('якорь') || lowerReply.includes('черт') || lowerReply.includes('карамба')) anim = 'angry'; // Бьет кулаком
        if (lowerReply.includes('капитан') || lowerReply.includes('да')) anim = 'point'; // Показывает палец вверх

        // 4. ОТПРАВЛЯЕМ ОТВЕТ НА САЙТ
        res.status(200).json({
            speech: replyText,
            animation: anim
        });

    } catch (error) {
        console.error("Ошибка API Groq:", error);
        res.status(500).json({ error: "Ошибка связи с капитанским мостиком!" });
    }
};
