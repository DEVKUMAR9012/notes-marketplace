import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFileText, FiMessageSquare, FiCheckSquare, FiZap,
  FiCode, FiMap, FiMic, FiArrowRight,
} from 'react-icons/fi';
import '../styles/AIHub.css';
import NoteSummarizer  from '../components/AI/NoteSummarizer';
import PDFChat         from '../components/AI/PDFChat';
import QuizGenerator   from '../components/AI/QuizGenerator';
import AskAI           from '../components/AI/AskAI';
import CodeExplainer   from '../components/AI/CodeExplainer';
import RoadmapGenerator from '../components/AI/RoadmapGenerator';
import InterviewPrep   from '../components/AI/InterviewPrep';

// ── Tools config ───────────────────────────────────────────────────────────────
const TOOLS = [
  {
    id: 'summarizer',
    label: 'Summarize Notes',
    icon: FiFileText,
    desc: 'Upload notes & get smart summaries with key concepts highlighted',
    colorClass: 'blue',
    badge: 'popular',
    featured: true,
    component: NoteSummarizer,
  },
  {
    id: 'pdf-chat',
    label: 'PDF Chat',
    icon: FiMessageSquare,
    desc: 'Ask questions from your uploaded PDFs',
    colorClass: 'purple',
    component: PDFChat,
  },
  {
    id: 'quiz',
    label: 'Generate Quiz',
    icon: FiCheckSquare,
    desc: 'MCQs, flashcards & practice tests',
    colorClass: 'green',
    component: QuizGenerator,
  },
  {
    id: 'doubt-solver',
    label: 'Ask AI',
    icon: FiZap,
    desc: 'Get answers to any concept or doubt',
    colorClass: 'cyan',
    component: AskAI,
  },
  {
    id: 'code',
    label: 'Code Explainer',
    icon: FiCode,
    desc: 'Paste code → line-by-line explanation',
    colorClass: 'orange',
    component: CodeExplainer,
    badge: 'new',
  },
  {
    id: 'roadmap',
    label: 'Roadmap',
    icon: FiMap,
    desc: 'AI-generated study roadmaps for any topic',
    colorClass: 'rose',
    component: RoadmapGenerator,
    badge: 'new',
  },
  {
    id: 'interview',
    label: 'Interview Prep',
    icon: FiMic,
    desc: 'Mock interviews & viva preparation',
    colorClass: 'indigo',
    component: InterviewPrep,
    badge: 'new',
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return ['Good morning', '☀'];
  if (h < 17) return ['Good afternoon', '⛅'];
  return ['Good evening', '🌙'];
}

function ComingSoon({ tool }) {
  const Icon = tool.icon;
  return (
    <div className="ai-coming-soon">
      <div className={`ai-cs-icon ai-cs-icon--${tool.colorClass}`}>
        <Icon size={30} />
      </div>
      <h3>{tool.label}</h3>
      <p>{tool.desc}</p>
      <span className="badge-soon">🚀 Coming Soon</span>
    </div>
  );
}

export default function AIHub() {
  const [activeTool, setActiveTool] = React.useState(null);
  const [greeting, emoji] = getGreeting();
  const tool = activeTool ? TOOLS.find(t => t.id === activeTool) : null;

  return (
    <div className="ai-root">
      <AnimatePresence mode="wait">

        {/* ── HOME ──────────────────────────────────────────────── */}
        {!activeTool && (
          <motion.div
            key="home"
            className="ai-home"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            {/* Glow orbs */}
            <div className="glow-orb orb1" />
            <div className="glow-orb orb2" />
            <div className="glow-orb orb3" />

            {/* Header */}
            <div className="ai-header">
              <div className="ai-greeting">
                {greeting} <span>{emoji}</span>
              </div>
              <h1 className="ai-headline">
                What can I help<br />you with?
              </h1>
              <p className="ai-sub">
                Your AI-powered study companion — summarize notes, solve doubts,
                generate quizzes and more.
              </p>
            </div>

            {/* Grid */}
            <div className="ai-grid">
              {TOOLS.map((t, i) => {
                const Icon = t.icon;
                return (
                  <motion.div
                    key={t.id}
                    className={`ai-card ${t.colorClass}${t.featured ? ' featured' : ''}${t.soon ? ' soon' : ''}`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.055 }}
                    onClick={() => !t.soon && setActiveTool(t.id)}
                    role="button"
                    tabIndex={t.soon ? -1 : 0}
                    onKeyDown={e => e.key === 'Enter' && !t.soon && setActiveTool(t.id)}
                  >
                    <div className="ai-icon-wrap">
                      <Icon size={t.featured ? 22 : 18} />
                    </div>
                    <div className="ai-card-text">
                      <div className="ai-card-title">{t.label}</div>
                      <div className="ai-card-desc">{t.desc}</div>
                    </div>
                    {t.badge === 'popular' && (
                      <span className="badge-popular">Popular</span>
                    )}
                    {t.badge === 'new' && (
                      <span className="badge-popular" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>New ✨</span>
                    )}
                    {t.soon && <span className="badge-soon">Soon</span>}
                    {!t.soon && (
                      <FiArrowRight className="ai-arrow" size={16} />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── TOOL VIEW ─────────────────────────────────────────── */}
        {activeTool && (
          <motion.div
            key={activeTool}
            className="ai-tool-view"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.22 }}
          >
            {/* Top bar */}
            <div className="ai-tool-topbar">
              <button className="ai-back-btn" onClick={() => setActiveTool(null)}>
                ← Back
              </button>
              <span className={`ai-tool-badge ${tool?.colorClass}`}>
                {tool && <tool.icon size={13} />}
                {tool?.label}
              </span>
            </div>

            {/* Component */}
            <div className="ai-tool-body">
              {tool?.component ? <tool.component /> : <ComingSoon tool={tool} />}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
