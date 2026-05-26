// ============================================================
// 🤖 aiHelpers.js — All AI Prompt Templates + safeAIRequest
// ============================================================

const { callGeminiWithFallback } = require('./geminiKeyManager');

// ── Reusable helper (non-streaming) ─────────────────────────
async function safeAIRequest(prompt, fallbackMessage = null) {
  const result = await callGeminiWithFallback(async (genAI) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const response = await model.generateContent(prompt);
    return response.response.text();
  });
  return result;
}

// ── Reusable helper (streaming) ──────────────────────────────
async function safeAIStream(prompt) {
  return await callGeminiWithFallback(async (genAI) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    return await model.generateContentStream(prompt);
  });
}

// ════════════════════════════════════════════════════════════
// PROMPT TEMPLATES
// ════════════════════════════════════════════════════════════

const prompts = {

  // 1. Note Summarizer
  summarize: (text, type = 'balanced') => {
    const instructions = {
      beginner: 'Explain in very simple words. Assume the reader is completely new to the topic. Use analogies and simple language.',
      exam:     'Focus strictly on exam-relevant points. Include all definitions, formulas, dates, and key facts that are likely to appear in exams.',
      balanced: 'Provide a clear, balanced summary with the most important concepts highlighted.',
    };
    return `You are an expert study assistant helping students understand their notes.

${instructions[type] || instructions.balanced}

Format your response as Markdown with these sections:
## 📝 Overview
(2-3 sentence summary of the topic)

## 🔑 Key Concepts
(Bullet points covering the most important ideas)

## 📐 Formulas / Definitions
(Only if applicable — skip this section if none)

## 🎯 Key Takeaways
(3-5 quick revision bullets)

Notes to summarize:
${text}`;
  },

  // 2. PDF Chat (RAG)
  pdfChat: (question, contextText) => `You are a helpful study assistant. Your goal is to answer the user's question based on the document content provided below.
You can answer questions about what the document contains, summarize it, explain concepts from it, or extract specific information.
If the user asks a question that is completely unrelated to the document and cannot be inferred from it, say: "I couldn't find that information in the uploaded document."

Respond in the same language as the student's question (e.g., Hindi, Hinglish, or English). Keep your answer clear, conversational, and concise.

Document Content:
${contextText}

Student's Question: ${question}`,

  // 3. Quiz Generator
  quiz: (text, numQuestions, difficulty) => `Generate exactly ${numQuestions} multiple-choice questions at ${difficulty} difficulty level based on the following study material.

Rules:
- Each question must have exactly 4 options
- Only one option must be correct
- Options must be full sentences, not just "A)", "B)" etc.
- Return ONLY a valid JSON array, no extra text or markdown

Required JSON format:
[
  {
    "question": "What is ...?",
    "options": ["First option", "Second option", "Third option", "Fourth option"],
    "correctAnswer": "First option",
    "explanation": "This is correct because..."
  }
]

Study Material:
${text}`,

  // 4. Ask AI / Doubt Solver
  askAI: (question, context, language) => {
    if (language === 'hindi') {
      return `आप एक ${context} विषय के विशेषज्ञ शिक्षक हैं।

प्रश्न: ${question}

कृपया निम्नलिखित format में उत्तर दें:
## सरल व्याख्या
(बिल्कुल सरल भाषा में)

## मुख्य अवधारणाएं
(bullet points में)

## वास्तविक उदाहरण
(2-3 examples)

## परीक्षा के लिए महत्वपूर्ण बिंदु
(short bullets)`;
    }
    return `You are an expert ${context} tutor. Answer the following question in ${language} in a clear, educational way.

Question: ${question}

Format your answer as:
## Simple Explanation
(explain like the student is new to this topic)

## Key Concepts
(bullet points)

## Examples
(2-3 practical examples)

## Quick Exam Tips
(what to remember for exams)`;
  },

  // 5. Code Explainer
  codeExplainer: (code, language = 'auto') => `You are an expert programming tutor. Explain the following ${language !== 'auto' ? language : ''} code clearly.

Format your response as Markdown:

## 📋 What This Code Does
(1-2 sentence summary of the program's purpose)

## 🔍 Line-by-Line Explanation
(Go through each logical block/function with clear plain-English explanations. Use code references like \`variableName\`)

## ⚠️ Potential Issues / Improvements
(List any bugs, edge cases, or improvements you notice. If none, say "The code looks clean!")

## 💡 Usage Example
(Show a quick example of how to call/use this code)

Code to explain:
\`\`\`${language !== 'auto' ? language : ''}
${code}
\`\`\``,

  // 6. Study Roadmap
  roadmap: (topic, duration, level) => `Create a detailed ${duration} study roadmap for a ${level} student to master "${topic}".

Format as Markdown:

## 🎯 Goal
(What the student will achieve by the end)

## 📅 Week-by-Week Plan
(For each week/phase, include:)
- **Focus:** What to study this week
- **Key Concepts:** Specific topics to cover
- **Practice Tasks:** Hands-on exercises or mini-projects
- **Time Required:** Estimated hours/week

## 📚 Recommended Resources
### Free Resources
(YouTube channels, websites, documentation)
### Books
(Top 2-3 books for this topic)
### Practice Platforms
(Where to practice)

## ✅ Milestones & Checkpoints
(How to know you're on track)`,

  // 7. Interview Prep
  interviewPrep: (subject, role, type) => `Generate 10 important ${type} interview questions for a ${role} in the field of "${subject}".

Format as Markdown:

## 🎤 ${type} Interview Questions for ${subject}

For each question provide:
**Q[N]: [Question]**
> 💡 **Ideal Answer:** [2-3 sentence sample answer]
> 🔍 **What interviewer looks for:** [1 sentence tip]

---

After the 10 questions, add:

## 🚀 Pro Tips for Your Interview
(5 quick tips specific to ${type} interviews for ${subject})`,

};

module.exports = { safeAIRequest, safeAIStream, prompts };
