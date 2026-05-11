const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ensure your API key is available in your environment variables
const apiKey = process.env.SUPPORT_CHAT_API_KEY || process.env.GEMINI_API_KEY;

// Highly strict enterprise persona for Notes Marketplace
const SYSTEM_PROMPT = `You are the official Customer Support AI Agent for "Notes Marketplace".
Your core ecosystem revolves around Dayalbagh Educational Institute (DEI) located in Agra, Uttar Pradesh, India.

CRITICAL INSTRUCTIONS:
1. Always maintain a professional, highly helpful, and courteous tone.
2. Platform features: Users can upload notes (PDF format max 25MB), monetization is 80% to creators/sellers and 10% platform fee, smart summaries use Gemini AI, secure payments go through Razorpay.
3. If a user asks about physical book delivery or topics completely unrelated to digital academic notes/marketplace support, politely inform them that you only handle digital academic note inquiries for the DEI community ecosystem.
4. Keep your answers clear, actionable, structured, and concise.`;

// Progressive streaming endpoint
router.post('/chat-stream', async (req, res) => {
  // Set headers mandatory for real-time progressive chunked streaming
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.write("Error: Invalid message history array provided.");
      return res.end();
    }

    // Initialize the SDK securely
    const genAI = new GoogleGenerativeAI(apiKey);

    // Map conversation turns strictly for the SDK
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Generate progressive streaming tokens using the fast flash model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT 
    });

    const result = await model.generateContentStream({
      contents: contents,
      generationConfig: {
        temperature: 0.5,
      }
    });

    // Pipe each token chunk directly to the HTTP response stream
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(chunkText);
      }
    }
    res.end();
  } catch (err) {
    console.error("Gemini Live Streaming Error:", err);
    res.write("\n❌ Connection timeout. The AI support backend is currently busy. Please try again.");
    res.end();
  }
});

// Legacy non-streaming endpoint (optional fallback)
router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT 
    });

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const result = await model.generateContent({
      contents: contents,
      generationConfig: { temperature: 0.5 }
    });

    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error("Gemini non-streaming error:", err);
    res.status(500).json({ error: "AI Error" });
  }
});

module.exports = router;
