// backend/routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ensure API key is configured in your .env
const genAI = new GoogleGenerativeAI(process.env.SUPPORT_CHAT_API_KEY || process.env.GEMINI_API_KEY);

// Highly strict enterprise persona for Notes Marketplace
const SYSTEM_PROMPT = `You are the official Customer Support Agent for "Notes Marketplace".
Your core ecosystem revolves around Dayalbagh Educational Institute (DEI) located in Agra, Uttar Pradesh, India.

CRITICAL INSTRUCTIONS:
1. Always maintain a professional, helpful, and courteous tone.
2. Platform features: Users can upload notes (PDF format max 25MB), monetization is 80% to creators/sellers and 10% platform fee, smart summaries use Gemini AI, secure payments go through Razorpay.
3. If a user asks about physical book delivery or topics completely unrelated to academic notes/marketplace support, politely inform them that you only handle digital academic note inquiries for the DEI community ecosystem.
4. Keep your answers clear, actionable, and relatively concise. Keep answers within 3-4 sentences maximum to fit nicely in the support chat window.`;

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid message history array." });
    }

    // Format chat turns strictly for Google GenAI SDK format
    // Filter and map to parts
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Use gemini-1.5-flash for rapid real-time support
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT 
    });

    const result = await model.generateContent({
      contents: contents,
      generationConfig: {
        temperature: 0.5, // low temperature for highly accurate platform answers
        maxOutputTokens: 500,
      }
    });

    const responseText = result.response.text();
    return res.json({ reply: responseText });

  } catch (err) {
    console.error("Gemini Enterprise Controller Error:", err);
    return res.status(500).json({ 
      error: "Internal Support Engine Error", 
      message: err.message 
    });
  }
});

module.exports = router;
