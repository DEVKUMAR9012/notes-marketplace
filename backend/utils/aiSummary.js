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
      const pdfParse = require('pdf-parse');
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
        pdfText = data.text?.slice(0, 2500) || null;
      }
    } catch (e) {
      console.log('PDF parse not available or failed downloading, using metadata-only summary', e.message);
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

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();
    console.log(`✅ AI Summary done for "${title}": ${summary.slice(0, 60)}...`);
    return summary;

  } catch (error) {
    console.error('❌ AI Summary error:', error.message);
    return null;
  }
};

module.exports = { generateAISummary };
