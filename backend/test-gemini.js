// Quick Gemini API test - run with: node test-gemini.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const API_KEY = process.env.GEMINI_API_KEY;
  console.log('🔑 API Key:', API_KEY ? 'YES (' + API_KEY.slice(0,8) + '...)' : '❌ MISSING');
  if (!API_KEY) return;

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    console.log('📡 Calling Gemini 2.5 Flash...');
    const result = await model.generateContent('Say exactly: "Hello from Notes Marketplace AI!"');
    console.log('✅ SUCCESS:', result.response.text().trim());
  } catch (err) {
    console.log('❌ FAILED:', err.message);
  }
}

test();
