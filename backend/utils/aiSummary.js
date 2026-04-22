const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

/**
 * Generate a 2-sentence AI summary using Google Gemini.
 * Falls back to a metadata-only prompt if PDF text extraction fails.
 */
const generateAISummary = async (pdfFilePath, title, subject, itemType = 'note') => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️ GEMINI_API_KEY not set, skipping AI summary');
      return null;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let prompt;

    // Try to extract PDF text
    let pdfText = null;
    try {
      // pdf-parse may export as a function or as a default property depending on ESM/CommonJS interop
      const pdfParseModule = require('pdf-parse');
      const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule.default || pdfParseModule);

      let buffer;

      // Check if it is a remote url
      if (pdfFilePath && pdfFilePath.startsWith('http')) {
        const response = await fetch(pdfFilePath);
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else if (pdfFilePath) {
        buffer = fs.readFileSync(pdfFilePath);
      }

      if (buffer) {
        const data = await pdfParse(buffer);
        pdfText = data?.text ? String(data.text).slice(0, 2500) : null;
      }
    } catch (e) {
      console.log('PDF parse not available or failed downloading, using metadata-only summary', e?.message || e);
    }

    if (pdfText && pdfText.trim().length > 30) {
      prompt = `You are an assistant on a student notes marketplace. Read the following text extracted from a ${itemType} titled "${title}" on the subject "${subject}". 

Write exactly 2 short sentences (under 50 words total) summarizing:
1. What topics/content it covers
2. Who would benefit from it

Be specific. Do not start with "This note" or "This book".

Content:
${pdfText}`;
    } else {
      // Fallback: generate from metadata only
      prompt = `Write a 2-sentence description (under 40 words) for a student ${itemType} titled "${title}" about the subject "${subject}" sold on an academic marketplace. Be helpful and specific about who should buy it.`;
    }

    // Helper: retry with exponential backoff for transient 429/503 errors
    const retryGenerateContent = async (model, prompt, attempts = 3, baseDelay = 1000) => {
      let lastErr;
      for (let i = 0; i < attempts; i++) {
        try {
          return await model.generateContent(prompt);
        } catch (err) {
          lastErr = err;
          const msg = err?.message || '';
          const status = err?.response?.status || err?.status || null;
          const isTransient = status === 429 || status === 503 || /high demand|Service Unavailable|429|503/i.test(msg);
          if (i < attempts - 1 && isTransient) {
            const delay = baseDelay * Math.pow(2, i);
            console.warn(`AI generate attempt ${i + 1} failed (${msg}). Retrying in ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw err;
        }
      }
      throw lastErr;
    };

    // Try with retries and fall back to a simple heuristic summary if generation still fails
    let result;
    try {
      result = await retryGenerateContent(model, prompt, 3, 1000);
    } catch (err) {
      console.error('AI generation failed after retries:', err?.message || err);
      // Lightweight fallback summary if AI is unavailable
      const simpleFallback = () => {
        if (pdfText && pdfText.length > 80) {
          // Try to return the first two sentences from extracted text
          const sentences = pdfText.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean);
          return sentences.slice(0, 2).join(' ').slice(0, 200);
        }
        return `${title} — A concise ${itemType} about ${subject}, useful for students studying ${subject}.`;
      };
      const fallback = simpleFallback();
      console.log(`✅ AI Summary fallback for "${title}": ${fallback.slice(0, 60)}...`);
      return fallback;
    }

    // Extract text safely from the model response
    let summary = '';
    try {
      if (result?.response && typeof result.response.text === 'function') {
        summary = String(result.response.text()).trim();
      } else if (typeof result === 'string') {
        summary = result.trim();
      } else if (result?.outputText) {
        summary = String(result.outputText).trim();
      }
    } catch (err) {
      console.warn('Failed to read AI response text:', err?.message || err);
    }

    if (!summary) {
      const fallback = pdfText && pdfText.length > 80
        ? pdfText.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').slice(0, 200)
        : `${title} — A concise ${itemType} about ${subject}, useful for students studying ${subject}.`;
      console.log(`✅ AI Summary fallback (no text) for "${title}": ${fallback.slice(0, 60)}...`);
      return fallback;
    }

    console.log(`✅ AI Summary done for "${title}": ${summary.slice(0, 60)}...`);
    return summary;

  } catch (error) {
    console.error('❌ AI Summary error:', error.message);
    return null;
  }
};

module.exports = { generateAISummary };
