// ملف API الخادم — يحمي مفتاح Anthropic ويتصل بـ Claude
export default async function handler(req, res) {
  // السماح فقط بطلبات POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // رؤوس CORS للسماح بالطلبات من المتصفح
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { content } = req.body;

  if (!content || content.trim().length < 10) {
    return res.status(400).json({ error: 'المحتوى قصير جداً' });
  }

  // مفتاح API يُقرأ من متغيرات البيئة (آمن — لا يظهر للمستخدم)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'مفتاح API غير مضبوط في البيئة' });
  }

  const prompt = `أنت محلل إعلامي متخصص ومتمرس في تحليل المحتوى الصحفي العربي.
قم بتحليل المحتوى التالي بدقة واحترافية عالية.
أجب بـJSON فقط بدون أي نص إضافي أو Markdown أو backticks.

المحتوى:
${content.slice(0, 4000)}

أرجع JSON بهذا الهيكل بالضبط:
{
  "summary": "ملخص احترافي موجز من 2-3 جمل للمحتوى",
  "claims": [
    "الادعاء أو المعلومة الرئيسية الأولى",
    "الادعاء أو المعلومة الرئيسية الثانية",
    "الادعاء أو المعلومة الرئيسية الثالثة",
    "الادعاء أو المعلومة الرئيسية الرابعة"
  ],
  "sentiment": {
    "إيجابي": 25,
    "محايد": 35,
    "سلبي": 28,
    "تحريضي": 12
  },
  "bias": {
    "level": "منخفض أو متوسط أو عالٍ",
    "type": "وصف نوع التحيز المكتشف أو غيابه",
    "frame": "الإطار الإعلامي المستخدم (صراعي، إنساني، اقتصادي...)"
  },
  "trust_score": 70,
  "suggestions": [
    "زاوية تحقيق مقترحة للصحفي",
    "سؤال جوهري يجب البحث عن إجابته",
    "مصدر أو جهة يُنصح بالتواصل معها",
    "خطوة تحقق عملية للتحقق من الادعاءات"
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'خطأ من خادم الذكاء الاصطناعي' });
    }

    const data = await response.json();
    const rawText = data.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('');

    // تنظيف الرد وتحويله إلى JSON
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const result = JSON.parse(cleaned);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: 'فشل في تحليل المحتوى، يرجى المحاولة مجدداً' });
  }
}
