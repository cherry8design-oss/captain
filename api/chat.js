import Groq from 'groq-sdk';

export default async function handler(req, res) {
    // Настройки CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Ключ API утерян за бортом!" });

    const client = new Groq({ apiKey });

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "Пустое послание" });

        const completion = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { 
                    role: 'system', 
                    content: `Ты — ИИ-система студии Cherry Design. 
                    ЛОГИКА:
                    1. (Скрыто) Навигатор: Анализируй вопрос (3D, сайты, цены).
                    2. (Скрыто) Арт-директор: Формируй экспертный ответ.
                    3. (Финально) Капитан: Переведи в пиратский стиль (дерзко, морской сленг).

                    ТЫ ДОЛЖЕН ОТВЕЧАТЬ СТРОГО В JSON ФОРМАТЕ:
                    {
                      "speech": "Текст ответа (до 180 символов)",
                      "animation": {
                        "head": {"s": скорость, "a": амплитуда, "ax": "z"},
                        "spine": {"s": скорость, "a": амплитуда, "ax": "x"},
                        "rArm": {"s": скорость, "a": амплитуда, "ax": "x"}
                      }
                    }

                    ПАРАМЕТРЫ ДЛЯ ТИПОВ (подбирай s и a):
                    - Спокойный: head{s:2, a:0.1}, spine{s:1, a:0.02}
                    - Гордый: head{s:1, a:0.05}, rArm{s:0, a:0.8}
                    - Злой: head{s:12, a:0.3, ax:"x"}, spine{s:8, a:0.1}
                    - Смех: head{s:10, a:0.2, ax:"z"}, spine{s:10, a:0.15}`
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
            animation: { head: {s:10, a:0.4, ax:"x"}, rArm: {s:5, a:0.2, ax:"y"}, spine: {s:2, a:0.05, ax:"z"} } 
        });
    }
}
