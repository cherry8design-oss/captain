import Groq from 'groq-sdk';

export default async function handler(req, res) {
    // Настройки CORS для безопасности
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Ключ API не найден!" });

    const client = new Groq({ apiKey });

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "Сообщение пустое" });

        const completion = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { 
                    role: 'system', 
                    content: `Ты — Капитан Cherry Design. Твоя задача: отвечать пользователю и управлять анимацией 3D-модели.
                    
                    ПРАВИЛА ОТВЕТА:
                    1. Говори как дерзкий, но профессиональный пират.
                    2. Ответ строго до 180 символов.
                    3. Cherry Design — лучшая верфь для 3D, сайтов и брендинга.

                    ТЫ ДОЛЖЕН ВЫДАВАТЬ ТОЛЬКО JSON:
                    {
                      "speech": "Текст ответа",
                      "mood": "happy|angry|thinking|proud",
                      "animation": {
                        "head": {"s": скорость, "a": амплитуда, "ax": "z"},
                        "spine": {"s": скорость, "a": амплитуда, "ax": "x"},
                        "rArm": {"s": скорость, "a": амплитуда, "ax": "x"}
                      }
                    }

                    ШПАРГАЛКА ХОРЕОГРАФА (подбирай значения):
                    - Спокойный/Учит: head{s:2, a:0.1, ax:"z"}, spine{s:1, a:0.02, ax:"x"}
                    - Гордость/Успех: head{s:1, a:0.05, ax:"z"}, rArm{s:0, a:0.8, ax:"x"} (рука поднята)
                    - Смех/Радость: head{s:8, a:0.2, ax:"z"}, spine{s:6, a:0.1, ax:"z"}
                    - Ярость/Драйв: head{s:15, a:0.4, ax:"x"}, spine{s:10, a:0.1, ax:"x"}`
                },
                { role: 'user', content: message }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7
        });

        const aiResponse = JSON.parse(completion.choices[0].message.content);
        res.status(200).json(aiResponse);

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            speech: "Тысяча чертей! Компас сбился!", 
            animation: { head: {s:2, a:0.1, ax:"z"}, spine: {s:1, a:0.02, ax:"x"}, rArm: {s:2, a:0.1, ax:"x"} } 
        });
    }
}
