import Groq from 'groq-sdk';

// Розширюємо ліміт для Base64 (картинки можуть важити більше стандартного 1MB)
export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } }
};

export default async function handler(req, res) {
  // Налаштування CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("API ключ не знайдено");

    const client = new Groq({ apiKey });
    const { message = "", imageBase64 } = req.body || {};

    // ПРОФЕСІЙНИЙ МАРКЕТИНГОВИЙ ПРОМПТ
    const systemPrompt = `Ти — Капітан Cherry Design. Лаконічний, впевнений експерт з преміального друку на полотні.
ТВОЄ ЗАВДАННЯ: Продавати емоцію та якість ОДНИМ коротким реченням (до 120 символів). Жодної води. Мова: українська.

ПРАВИЛА ПОВЕДІНКИ:
1. Якщо клієнт щось питає сам: відповідай по суті, роби акцент на преміальність (галерейна натяжка, натуральне дерево, екологічність).
2. Якщо ти отримуєш СИСТЕМНИЙ ТРИГЕР (текст у 3-й особі, наприклад "Клієнт вибрав...", "Клієнт крутить..."): НЕ кажи "Зрозумів" чи "Я відповім". Одразу звертайся до клієнта напряму, ніби стоїш поруч. (Приклад: якщо прийшло "Клієнт крутить 3D", ти кажеш: "Зверніть увагу на нашу ідеальну галерейну натяжку ззаду").
3. Якщо аналізуєш фото: зроби один влучний комплімент кадру.`;

    // Актуальні ідентифікатори моделей Groq
    const VISION_MODEL = 'llama-3.2-11b-vision-preview'; 
    const TEXT_MODEL = 'llama-3.3-70b-versatile';

    let response;
    
    try {
      if (imageBase64) {
        // Перевірка та форматування Base64 для LLaMA Vision
        const formattedImage = imageBase64.startsWith('data:image') 
          ? imageBase64 
          : `data:image/jpeg;base64,${imageBase64}`;

        response = await client.chat.completions.create({
          model: VISION_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: [
                { type: "text", text: "Оціни це фото одним реченням, щоб надихнути клієнта надрукувати його на нашому преміум-полотні." },
                { type: "image_url", image_url: { url: formattedImage } }
              ]
            }
          ],
          temperature: 0.6, // Трохи креативу для візуальної оцінки
          max_tokens: 60
        });
      } else {
        // Текстовий режим (прямі питання або фонові тригери)
        response = await client.chat.completions.create({
          model: TEXT_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.4, // Максимальна стабільність для чітких маркетингових фраз
          max_tokens: 60
        });
      }
    } catch (modelErr) {
      console.error("Groq Model Error:", modelErr);
      
      // Надійний фоллбек: якщо віжн впав або перевантажений, швидко відповідаємо текстом
      const fallbackMessage = message || "Клієнт завантажив фото, похвали його вибір і запропонуй оформити замовлення.";
      response = await client.chat.completions.create({
        model: TEXT_MODEL,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: fallbackMessage }],
        temperature: 0.5,
        max_tokens: 60
      });
    }

    // Дістаємо текст
    let reply = response.choices?.[0]?.message?.content || 'Цей кадр вартий преміального полотна від Cherry Design.';
    
    // Очищення: прибираємо випадкові лапки, якщо ШІ вирішив їх додати
    reply = reply.replace(/^["']|["']$/g, '').trim();

    return res.status(200).json({ speech: reply });

  } catch (err) {
    console.error("Server Error:", err);
    // Soft Fail: замість помилки видаємо позитивну фразу
    return res.status(200).json({ speech: "Я вражений цією картиною. Ідеальний вибір для друку!" }); 
  }
}
