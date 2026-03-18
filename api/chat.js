import Groq from 'groq-sdk';

export default async function handler(req, res) {
    // 1. Настройки CORS
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

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API Key missing" });

    const client = new Groq({ apiKey });

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "No message" });

        // 2. ЗАПРОС К НОВОЙ МОДЕЛИ
        const completion = await client.chat.completions.create({
            messages: [
                { 
                    role: 'system', 
                    content: 'Ты Капитан пиратского корабля. Отвечай очень коротко (1-2 фразы), дерзко и по-пиратски. Используй морской сленг.' 
                },
                { role: 'user', content: message }
            ],
            // МЕНЯЕМ НА ЭТУ МОДЕЛЬ:
            model: 'llama-3.3-70b-versatile',
            temperature: 0.6,
            max_tokens: 100
        });

        const replyText = completion.choices[0]?.message?.content || "Карамба, я онемел!";

        res.status(200).json({
            speech: replyText,
            animation: 'talk'
        });

    } catch (error) {
        console.error("ОШИБКА GROQ:", error);
        res.status(500).json({ error: "Ошибка на борту!", details: error.message });
    }
}
