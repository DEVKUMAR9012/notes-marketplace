const express = require('express');
const router = express.Router();
const https = require('https');

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !messages.length) {
      return res.status(400).json({ success: false, message: 'Messages required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'AI not configured' });
    }

    // Build Gemini conversation history
    const systemPrompt = `You are a helpful support assistant for Notes Marketplace — an online platform where Indian students buy and sell study notes.
Answer questions about: buying/selling notes, payments, account issues, refunds, note uploads, and general platform support.
Be friendly, concise, and helpful. Keep responses to 2-3 sentences max.
If asked something unrelated, politely redirect to Notes Marketplace support topics.`;

    // Gemini needs alternating user/model roles, starting with user
    const contents = [];
    
    // Add system context as first user message + model ack
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood! I am ready to help Notes Marketplace users.' }] });

    // Add conversation history
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    const body = JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: 256,
        temperature: 0.7
      }
    });

    const model = 'gemini-pro';
    const path = `/v1/models/${model}:generateContent?key=${apiKey}`;

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const reqHttp = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => { data += chunk; });
        response.on('end', () => {
          if (response.statusCode !== 200) {
            console.error('Gemini error:', response.statusCode, data);
            reject(new Error(`Gemini error ${response.statusCode}: ${data}`));
          } else {
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(new Error('Failed to parse Gemini response')); }
          }
        });
      });

      reqHttp.on('error', reject);
      reqHttp.write(body);
      reqHttp.end();
    });

    const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text
      || "I'm sorry, I couldn't process that. Please try again.";

    res.json({ success: true, reply });

  } catch (error) {
    console.error('AI chat error:', error.message);
    res.status(500).json({
      success: false,
      message: 'AI service error. Please try again.',
      detail: error.message
    });
  }
});

module.exports = router;
