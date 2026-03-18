import Groq from 'groq-sdk';

export default async function handler(req, res) {
    // Настройки CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    try {
        const { message } = req.body;

        const completion = await client.chat.completions.create({
            messages: [
                { 
                    role: 'system', 
                    content: `Ты — мультиагентная система Cherry Design. Твои роли: 
                    1. Навигатор (анализ вопроса), 
                    2. Арт-директор (знаток 3D, Unity, сайтов), 
                    3. Капитан (лицо бренда).
                    
                    ПРАВИЛА:
                    - Отвечай ТОЛЬКО как Капитан (пиратский сленг, дерзость).
                    - Если вопрос по 3D/дизайну — отвечай по сути, но по-пиратски.
                    - Ответ должен быть КОРОТКИМ (до 200 символов), чтобы влезть в облако чата.
                    - Используй слова: "дублоны", "якорь мне в бухту", "карамба".`
                },
                { role: 'user', content: message }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.8,
            max_tokens: 150
        });

        const reply = completion.choices[0]?.message?.content || "Карамба! Тишина на палубе!";

        // Логика выбора анимации
        let anim = 'talk'; 
        if (reply.includes('черт') || reply.includes('карамба')) anim = 'angry';
        if (reply.includes('дублон') || reply.includes('дизайн')) anim = 'point';

        res.status(200).json({ speech: reply, animation: anim });

    } catch (error) {
        res.status(500).json({ speech: "Корабль тонет, капитан!", animation: 'angry' });
    }
}
