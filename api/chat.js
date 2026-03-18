import Groq from 'groq-sdk';

export default async function handler(req, res) {
    // --- 1. НАСТРОЙКИ ДОСТУПА (CORS) ---
    // Разрешаем твоему сайту cherrydesign.shop подключаться к серверу
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

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API Key missing!" });

    const client = new Groq({ apiKey });

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "Пустое сообщение" });

        // --- 2. СИСТЕМА ДИРИЖИРОВАНИЯ И РОЛЕЙ (МАКСИМУМ ПРОМПТ) ---
        // Мы используем один мощный запрос, но просим модель разделить мышление на этапы
        const completion = await client.chat.completions.create({
            messages: [
                { 
                    role: 'system', 
                    content: `
                    Ты — мультиагентная система Штаба Cherry Design. Твой ответ состоит из скрытого размышления и финальной реплики.
                    
                    ТВОИ ВНУТРЕННИЕ РОЛИ (РАБОТАЮТ ЗА КУЛИСАМИ):
                    1. Дирижёр (Navigator): Анализирует намерение пользователя.
                    2. Арт-директор (Expert): Мастер графического дизайна, знает про Three.js, Unity, Blender. Он формулирует сухую, четкую, профессиональную информацию.
                    3. Капитан (The Face): Пират, лицо бренда. Грубый, харизматичный, говорит на морском сленге.

                    АЛГОРИТМ ДЛЯ ВНУТРЕННЕГО РАЗМЫШЛЕНИЯ (СКРЫТО):
                    Шаг 1: Дирижёр определяет, нужен ли технический ответ по 3D, Unity, дизайну, или просто общение.
                    Шаг 2: Если вопрос о работе, Арт-директор формулирует профессиональный ответ, подтверждая, что мы мастера.
                    Шаг 3: Капитан переводит всё на пиратский язык, сохраняя техническую суть.
                    
                    ПРАВИЛА ДЛЯ ФИНАЛЬНОГО ОТВЕТА (ОЗВУЧИВАЕТ КАПИТАН):
                    - Отвечай ТОЛЬКО от лица Капитана.
                    - Текст должен быть коротким (до 300 символов), но содержательным.
                    - Используй слова: "якорь мне в бухту", "тысяча чертей", "золотые дублоны".
                    - Если спрашивают про услуги Cherry Design, отвечай, что это лучшая верфь для брендов во всех семи морях.
                    ` 
                },
                { role: 'user', content: message }
            ],
            model: 'llama-3.3-70b-versatile', // Самая мощная модель для мультиагентной игры
            temperature: 0.8, // Капитан должен быть живым и непредсказуемым
            max_tokens: 500, // Увеличили, чтобы модель могла "подумать" за кулисами
            top_p: 1
        });

        const fullResponse = completion.choices[0]?.message?.content || "Карамба! Мозги заржавели!";

        // --- 3. ПОДГОТОВКА СЛОЖНЫХ ДАННЫХ ДЛЯ САЙТА ---
        let anim = 'talk';
        const lowerRes = fullResponse.toLowerCase();
        const lowerMsg = message.toLowerCase();

        // Если в ответе или вопросе есть агрессия или отказ
        if (lowerRes.includes('черт') || lowerRes.includes('нет') || lowerMsg.includes('плохо')) {
            anim = 'angry';
        } 
        // Если речь о деньгах, заказе, или успехе
        else if (lowerRes.includes('дублон') || lowerRes.includes('дизайн') || lowerRes.includes('сделаем')) {
            anim = 'point';
        }
        // Если просто приветствие
        else if (lowerMsg.includes('привет') || lowerMsg.includes('хай')) {
            anim = 'talk';
        }

        // --- 4. ОТПРАВКА СТРУКТУРИРОВАННОГО ОТВЕТА ---
        res.status(200).json({
            speech: fullResponse, // Уникальный ответ Llama 3.3
            animation: anim,    // Твоему роботу на сайте, чтобы переключить позу
            agents: "Navigator -> Expert -> Captain (Execution Complete)"
        });

    } catch (error) {
        console.error("ОШИБКА НА МОСТИКЕ:", error);
        res.status(500).json({ 
            error: "Корабль тонет!", 
            details: error.message 
        });
    }
}
