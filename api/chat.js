import Groq from 'groq-sdk';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Ключ API утерян!" });

    const client = new Groq({ apiKey });

    try {
        const { message } = req.body;
        const completion = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { 
                    role: 'system', 
                    content: `Ты — Капитан ИИ студии Cherry Design. 
                    Твоя цель: продать услуги (3D, Unity, Брендинг) и управлять своим 3D-телом.
                    
                    ОТВЕЧАЙ СТРОГО В JSON:
                    {
                      "speech": "Текст (пиратский сленг, до 180 симв.)",
                      "animation": {
                        "head": {"s": скорость, "a": амплитуда, "ax": "z"},
                        "spine": {"s": скорость, "a": амплитуда, "ax": "x"},
                        "rArm": {"s": скорость, "a": амплитуда, "ax": "x"}
                      }
                    }

                    ХОРЕОГРАФИЯ (настраивай параметры s и a):
                    - Гордый: head{s:1, a:0.1}, rArm{s:0, a:0.8} (застыл в жесте)
                    - Веселый: head{s:8, a:0.2}, spine{s:6, a:0.1}
                    - Злой: head{s:15, a:0.4, ax:"x"}, spine{s:10, a:0.1}
                    - Умный: head{s:2, a:0.1, ax:"z"}, spine{s:1, a:0.02}`
                },
                { role: 'user', content: message }
            ],
            response_format: { type: "json_object" }
        });

        res.status(200).json(JSON.parse(completion.choices[0].message.content));
    } catch (e) {
        res.status(500).json({ speech: "Карамба! Ошибка в трюме!", animation: {head:{s:2,a:0.1,ax:"z"}} });
    }
}
