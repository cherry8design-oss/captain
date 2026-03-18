import Groq from 'groq-sdk';

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export default async function handler(req, res) {
    // 1. Настройки CORS (чтобы сайт мог достучаться до сервера)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Метод не разрешен' });
    }

    try {
        const { message } = req.body;

        const completion = await client.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'Ты Капитан пиратского корабля. Отвечай коротко, по-пиратски, используй сленг.'
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            model: 'mixtral-8x7b-32768',
            temperature: 0.7,
        });

        const replyText = completion.choices[0]?.message?.content || "Карамба, я онемел!";

        // Простая логика выбора анимации
        let anim = 'talk';
        if (replyText.toLowerCase().includes('нет') || replyText.toLowerCase().includes('не')) anim = 'angry';

        res.status(200).json({
            speech: replyText,
            animation: anim
        });

    } catch (error) {
        console.error("Ошибка:", error);
        res.status(500).json({ error: "Ошибка на капитанском мостике!" });
    }
}
