import Groq from 'groq-sdk';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', 'https://cherrydesign.shop'); // Лучше указать домен явно
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
            model: 'llama-3.3-70b-versatile',
            messages: [
                { 
                    role: 'system', 
                    content: `Ты — ИИ-система студии Cherry Design. 
                    ЛОГИКА:
                    1. Навигатор: Анализируй вопрос (3D, сайты, цены).
                    2. Арт-директор: Формируй экспертный ответ.
                    3. Капитан: Переводи в пиратский стиль (дерзко, морской сленг, до 180 символов).

                    ТЫ ДОЛЖЕН ОТВЕЧАТЬ СТРОГО В JSON ФОРМАТЕ:
                    {
                      "speech": "текст ответа",
                      "anim_type": "talk|angry|point", 
                      "animation": {
                        "head": {"s": скорость, "a": амплитуда, "ax": "x|y|z"},
                        "rArm": {"s": скорость, "a": амплитуда, "ax": "x|y|z"},
                        "spine": {"s": скорость, "a": амплитуда, "ax": "z"}
                      }
                    }

                    ПАРАМЕТРЫ ДЛЯ ТИПОВ:
                    - talk (спокойный): head {s:2, a:0.05}, spine {s:1, a:0.02}
                    - angry (кричит): head {s:15, a:0.3, ax:"x"}, rArm {s:10, a:0.5, ax:"z"}
                    - point (указывает): head {s:2, a:0.1, ax:"y"}, rArm {s:0, a:1.2, ax:"x"}`
                },
                { role: 'user', content: message }
            ],
            // ВАЖНО: заставляем модель выдавать чистый JSON
            response_format: { type: "json_object" },
            temperature: 0.8,
        });

        const data = JSON.parse(completion.choices[0]?.message?.content);
        
        // Отправляем всё на фронтенд
        res.status(200).json(data);

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            speech: "Корабль идет ко дну! Связь оборвана!", 
            animation: { head: {s:10, a:0.4, ax:"x"}, rArm: {s:5, a:0.2, ax:"y"}, spine: {s:2, a:0.05, ax:"z"} } 
        });
    }
}
