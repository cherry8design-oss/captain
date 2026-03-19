import Groq from 'groq-sdk';

export default async function handler(req, res) {
    // Твои настройки CORS (сохранены расширенные заголовки)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // В будущем для безопасности можно поменять на 'https://cherrydesign.shop'
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Обработка preflight-запроса браузера
    if (req.method === 'OPTIONS') return res.status(200).end();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Ключ API утерян за бортом!" });

    const client = new Groq({ apiKey });

    try {
        // Теперь принимаем не только message, но и context (позицию мыши от Агента-Наблюдателя)
        const { message, context } = req.body;
        if (!message) return res.status(400).json({ error: "Пустое послание" });

        const completion = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { 
                    role: 'system', 
                    content: `Ты — ИИ-Дирижер студии Cherry Design. 

                    ЛОГИКА АГЕНТОВ (Выполняй внутри себя пошагово, клиенту отдавай только финал):
                    1. (Скрыто) Навигатор: Анализируй вопрос (3D, сайты, цены, дизайн).
                    2. (Скрыто) Арт-директор: Формируй экспертный ответ.
                    3. (Финально) Капитан: Переведи ответ в пиратский стиль (дерзко, морской сленг, максимум 180 символов).
                    4. (Финально) Хореограф: Подбери анимацию под настроение ответа.

                    КОНТЕКСТ ОТ НАБЛЮДАТЕЛЯ:
                    Курсор пользователя по оси X: ${context?.mouseX || 0}. (Если < 0 — курсор слева от Капитана, если > 0 — справа. Можешь упомянуть это, если уместно).

                    ТЫ ДОЛЖЕН ОТВЕЧАТЬ СТРОГО В JSON ФОРМАТЕ:
                    {
                      "speech": "Текст ответа (до 180 символов)",
                      "baseAnim": "idle" | "thinking" | "explaining" | "angry",
                      "choreoOverrides": {
                        "head": {"s": 2, "a": 0.1, "ax": "z"},
                        "spine": {"s": 1, "a": 0.05, "ax": "x"},
                        "rArm": {"s": 4, "a": 0.2, "ax": "x"}
                      }
                    }

                    ПАРАМЕТРЫ ДЛЯ ХОРЕОГРАФА (подбирай baseAnim и при необходимости переопределяй оси/скорость в choreoOverrides):
                    - Спокойный ответ: baseAnim "idle", choreoOverrides можно оставить пустым {}.
                    - Гордый/Объясняет: baseAnim "explaining", choreoOverrides для rArm {s: 5, a: 0.8}.
                    - Злой/Шутит: baseAnim "angry", choreoOverrides для head {s: 12, a: 0.3, ax: "x"}.`
                },
                { role: 'user', content: message }
            ],
            response_format: { type: "json_object" },
            temperature: 0.8
        });

        const data = JSON.parse(completion.choices[0]?.message?.content || "{}");
        res.status(200).json(data);

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            speech: "Корабль идет ко дну! Связь оборвана!", 
            baseAnim: "angry", // ИИ-Хореограф включает гнев при ошибке
            choreoOverrides: { head: {s:10, a:0.4, ax:"x"}, rArm: {s:5, a:0.2, ax:"y"}, spine: {s:2, a:0.05, ax:"z"} } 
        });
    }
}
