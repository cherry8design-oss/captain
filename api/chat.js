import Groq from 'groq-sdk';

export default async function handler(req, res) {
    // --- 1. НАСТРОЙКИ ДОСТУПА (CORS) ---
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
    if (!apiKey) return res.status(500).json({ error: "Ключ API не найден в Vercel!" });

    const client = new Groq({ apiKey });

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "Пустое сообщение" });

        // --- 2. СИСТЕМА ДИРИЖИРОВАНИЯ И РОЛЕЙ ---
        // Мы используем один мощный запрос, но просим модель разделить мышление на этапы
        const completion = await client.chat.completions.create({
            messages: [
                { 
                    role: 'system', 
                    content: `
                    Ты — мультиагентная система Cherry Design. Твой ответ должен состоять из скрытого размышления и финальной реплики.
                    
                    ТВОИ ВНУТРЕННИЕ РОЛИ:
                    1. Дирижёр (Navigator): Анализирует намерение пользователя.
                    2. Арт-директор (Expert): Мастер графического дизайна, знает про Cherry Design (логотипы, сайты, 3D визуализация).
                    3. Капитан (The Face): Пират, лицо бренда. Грубый, харизматичный, говорит на морском сленге.

                    АЛГОРИТМ:
                    Шаг 1: Дирижёр определяет, нужен ли совет по дизайну или просто общение.
                    Шаг 2: Если вопрос о работе, Арт-директор формулирует профессиональный ответ.
                    Шаг 3: Капитан переводит всё на пиратский язык, сохраняя суть.
                    
                    ПРАВИЛА ДЛЯ ФИНАЛЬНОГО ОТВЕТА:
                    - Отвечай ТОЛЬКО от лица Капитана.
                    - Текст должен быть коротким (до 300 символов).
                    - Используй слова: "якорь мне в бухту", "тысяча чертей", "золотые дублоны".
                    - Если спрашивают про Cherry Design, отвечай, что это лучшая верфь для брендов во всех семи морях.
                    ` 
                },
                { role: 'user', content: message }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.8,
            max_tokens: 500, // Увеличили лимит, чтобы модель могла "подумать"
            top_p: 1
        });

        const fullResponse = completion.choices[0]?.message?.content || "Карамба! Мозги заржавели!";

        // --- 3. ИНТЕЛЛЕКТУАЛЬНЫЙ ПОДБОР АНИМАЦИИ ---
        let anim = 'talk';
        const lowerRes = fullResponse.toLowerCase();
        const lowerMsg = message.toLowerCase();

        // Если в вопросе или ответе есть агрессия или отказ
        if (lowerRes.includes('черт') || lowerRes.includes('нет') || lowerMsg.includes('плохо')) {
            anim = 'angry';
        } 
        // Если речь о деньгах, заказе или успехе
        else if (lowerRes.includes('дублон') || lowerRes.includes('дизайн') || lowerRes.includes('сделаем')) {
            anim = 'point';
        }
        // Если просто приветствие
        else if (lowerMsg.includes('привет') || lowerMsg.includes('хай')) {
            anim = 'talk';
        }

        // --- 4. ОТПРАВКА РЕЗУЛЬТАТА ---
        res.status(200).json({
            speech: fullResponse,
            animation: anim,
            agent_log: "Multi-agent processing complete (Navigator -> Expert -> Captain)"
        });

    } catch (error) {
        console.error("ОШИБКА НА МОСТИКЕ:", error);
        res.status(500).json({ 
            error: "Корабль тонет!", 
            details: error.message 
        });
    }
}
