import Groq from 'groq-sdk';

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export default async function handler(req, res) {
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

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "No message" });

        const completion = await client.chat.completions.create({
            messages: [
                { role: 'system', content: 'Ты Капитан. Отвечай коротко и по-пиратски.' },
                { role: 'user', content: message }
            ],
            model: 'mixtral-8x7b-32768',
        });

        const replyText = completion.choices[0]?.message?.content || "Карамба!";

        res.status(200).json({
            speech: replyText,
            animation: 'talk'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error on deck!" });
    }
}
