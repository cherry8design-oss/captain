import Groq from 'groq-sdk';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Ключ API утерян за бортом!" });

    const client = new Groq({ apiKey });

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "Пустое послание" });

        const completion = await client.chat.completions.create({
            messages: [
                { 
                    role: 'system', 
                    content: `Ты — ИИ-система студии Cherry Design. 
                    ТВОЯ ЛОГИКА:
                    1. (Скрыто) Проанализируй вопрос как Навигатор. Если речь о 3D, сайтах или ценах — позови Арт-директора.
                    2. (Скрыто) Сформулируй точный ответ по услугам Cherry Design (мы профи в 3D, Unity и брендинге).
                    3. (Финально) Переведи всё в речь Капитана Пиратов. 

                    ПРАВИЛА:
                    - Отвечай ТОЛЬКО как Капитан (дерзко, с юмором, морской сленг).
                    - Ответ должен быть ЛАКОНИЧНЫМ (не более 180 символов), чтобы не взорвать текстовый пузырь.
                    - Твоя цель — продать услуги Cherry Design как лучшую верфь в мире.
                    - Обязательно выбери одну из эмоций: [talk], [angry], [point].`
                },
                { role: 'user', content: message }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.8,
            max_tokens: 300
        });

        const rawReply = completion.choices[0]?.message?.content || "Карамба! Онемел!";
        
        // Авто-определение анимации на основе текста
        let anim = 'talk';
        if (rawReply.includes('[angry]') || rawReply.toLowerCase().includes('черт')) anim = 'angry';
        if (rawReply.includes('[point]') || rawReply.toLowerCase().includes('дублон')) anim = 'point';
        
        // Чистим текст от технических тегов
        const cleanReply = rawReply.replace(/\[.*?\]/g, '').trim();

        res.status(200).json({ speech: cleanReply, animation: anim });

    } catch (error) {
        console.error(error);
        res.status(500).json({ speech: "Корабль идет ко дну!", animation: 'angry' });
    }
}
