import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFileText, FiCpu, FiBook, FiCode,
  FiCalendar, FiMic, FiZap, FiArrowLeft,
  FiSend, FiPaperclip, FiX, FiMessageSquare,
} from 'react-icons/fi';
import '../styles/AIHub.css';
import NoteSummarizer from '../components/AI/NoteSummarizer';
import PDFChat from '../components/AI/PDFChat';
import QuizGenerator from '../components/AI/QuizGenerator';
import AskAI from '../components/AI/AskAI';

// ── Quick-action chips ─────────────────────────────────────────────────────────
const TOOLS = [
  { id: 'summarizer',   label: 'Summarize Notes', icon: FiFileText, color: '#3b82f6', desc: 'Upload notes & get smart summaries with key points', component: NoteSummarizer, available: true },
  { id: 'pdf-chat',     label: 'PDF Chat',         icon: FiCpu,      color: '#a855f7', desc: 'Ask questions directly from your uploaded PDFs', component: PDFChat, available: true },
  { id: 'quiz',         label: 'Generate Quiz',    icon: FiBook,     color: '#10b981', desc: 'Auto-generate MCQs, flashcards & practice tests', component: QuizGenerator, available: true },
  { id: 'doubt-solver', label: 'Ask AI',           icon: FiZap,      color: '#06b6d4', desc: 'Get answers to any concept or doubt', component: AskAI, available: true },
  { id: 'code',         label: 'Code Explainer',   icon: FiCode,     color: '#f97316', desc: 'Paste code → Get line-by-line explanation', component: null, available: false },
  { id: 'roadmap',      label: 'Roadmap',          icon: FiCalendar, color: '#8b5cf6', desc: 'AI-generated study roadmaps for any topic', component: null, available: false },
  { id: 'interview',   label: 'Interview Prep',    icon: FiMic,      color: '#ef4444', desc: 'Mock interviews & viva preparation', component: null, available: false },
];

// ── Greeting time logic ────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── ComingSoon placeholder ─────────────────────────────────────────────────────
function ComingSoon({ tool }) {
  return (
    <div className="ai-coming-soon">
      <div className="ai-cs-icon" style={{ background: tool.color + '22', border: `1.5px solid ${tool.color}55` }}>
        <tool.icon size={32} style={{ color: tool.color }} />
      </div>
      <h3>{tool.label}</h3>
      <p>{tool.desc}</p>
      <span className="ai-cs-badge">🚀 Coming Soon</span>
    </div>
  );
}

// ── Main Hub ──────────────────────────────────────────────────────────────────
export default function AIHub() {
  const [activeTool, setActiveTool] = useState(null);

  const tool = activeTool ? TOOLS.find(t => t.id === activeTool) : null;

  return (
    <div className="ai-root">
      <AnimatePresence mode="wait">
        {!activeTool ? (
          // ── HOME SCREEN ──
          <motion.div
            key="home"
            className="ai-home"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {/* Greeting */}
            <div className="ai-greeting">
              <span className="ai-greeting-sub">{getGreeting()} 👋</span>
              <h1 className="ai-greeting-title">What can I help you with?</h1>
              <p className="ai-greeting-desc">
                Your AI-powered study companion — summarize notes, solve doubts, generate quizzes and more.
              </p>
            </div>

            {/* Tool chips */}
            <div className="ai-tools-grid">
              {TOOLS.map((t, i) => (
                <motion.button
                  key={t.id}
                  className={`ai-tool-chip ${!t.available ? 'ai-tool-chip--dim' : ''}`}
                  style={{ '--chip-color': t.color }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={t.available ? { scale: 1.02, y: -2 } : {}}
                  whileTap={t.available ? { scale: 0.97 } : {}}
                  onClick={() => setActiveTool(t.id)}
                >
                  <span className="ai-chip-icon" style={{ background: t.color + '22' }}>
                    <t.icon size={18} style={{ color: t.color }} />
                  </span>
                  <span className="ai-chip-text">
                    <span className="ai-chip-label">{t.label}</span>
                    <span className="ai-chip-desc">{t.desc}</span>
                  </span>
                  {!t.available && <span className="ai-chip-soon">Soon</span>}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          // ── TOOL SCREEN ──
          <motion.div
            key={activeTool}
            className="ai-tool-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
          >
            {/* Top bar */}
            <div className="ai-tool-topbar">
              <button className="ai-back-btn" onClick={() => setActiveTool(null)}>
                <FiArrowLeft size={18} />
                <span>Back</span>
              </button>
              <div className="ai-tool-label">
                <span className="ai-tool-badge" style={{ background: tool?.color + '22', borderColor: tool?.color + '55' }}>
                  {tool && <tool.icon size={14} style={{ color: tool.color }} />}
                  <span style={{ color: tool?.color }}>{tool?.label}</span>
                </span>
              </div>
            </div>

            {/* Component area */}
            <div className="ai-tool-body">
              {tool?.component ? (
                <tool.component />
              ) : (
                <ComingSoon tool={tool} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
