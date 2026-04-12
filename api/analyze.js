// ملف API الخادم — يستخدم Groq (مجاني وسريع)
export default async function handler(req, res) {

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'مفتاح GROQ_API_KEY غير موجود في Environment Variables على Vercel'
    });
  }

  const { content } = req.body || {};
  if (!content || content.trim().length < 10) {
    return res.status(400).json({ error: 'المحتوى قصير جداً' });
  }

  const prompt = `أنت محلل إعلامي متخصص في تحليل المحتوى الصحفي العربي.
قم بتحليل المحتوى التالي وأجب بـJSON فقط، بدون أي نص إضافي أو backticks أو Markdown.

المحتوى:
${content.slice(0, 4000)}

أرجع هذا JSON بالضبط:
{
  "summary": "ملخص من 2-3 جمل",
  "claims": ["ادعاء 1", "ادعاء 2", "ادعاء 3", "ادعاء 4"],
  "sentiment": { "ايجابي": 25, "محايد": 35, "سلبي": 28, "تحريضي": 12 },
  "bias": { "level": "منخفض او متوسط او عال", "type": "نوع التحيز", "frame": "الاطار الاعلامي" },
  "trust_score": 70,
  "suggestions": ["اقتراح 1", "اقتراح 2", "اقتراح 3", "اقتراح 4"]
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1500,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: 'أنت محلل إعلامي متخصص. أجب دائماً بـJSON فقط بدون أي نص إضافي.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq error:', response.status, errText);
      return res.status(502).json({
        error: 'Groq ' + response.status + ': ' + errText
      });
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '';

    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const result = JSON.parse(cleaned);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'خطأ داخلي: ' + error.message });
  }
}
