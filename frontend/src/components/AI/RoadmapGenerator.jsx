import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMap, FiCopy, FiCheck, FiRotateCw, FiDownload } from 'react-icons/fi';
import API from '../../utils/api';
import ReactMarkdown from 'react-markdown';

const DURATIONS = ['1 week', '2 weeks', '4 weeks', '6 weeks', '2 months', '3 months', '6 months'];
const LEVELS    = [
  { value: 'beginner',     label: '🌱 Beginner',     desc: 'No prior knowledge' },
  { value: 'intermediate', label: '⚡ Intermediate', desc: 'Some experience'    },
  { value: 'advanced',     label: '🔥 Advanced',     desc: 'Deep dive'         },
];

const POPULAR_TOPICS = ['Data Structures & Algorithms', 'Web Development', 'Machine Learning', 'System Design', 'React.js', 'Python', 'Database (SQL)', 'Computer Networks'];

export default function RoadmapGenerator() {
  const [topic,    setTopic]    = useState('');
  const [duration, setDuration] = useState('4 weeks');
  const [level,    setLevel]    = useState('beginner');
  const [roadmap,  setRoadmap]  = useState('');
  const [step,     setStep]     = useState('input');
  const [error,    setError]    = useState('');
  const [copied,   setCopied]   = useState(false);

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!topic.trim() || topic.trim().length < 3) {
      setError('Please enter a valid topic (e.g., "Python", "Machine Learning")');
      return;
    }
    setStep('loading');
    setError('');
    try {
      const { data } = await API.post('/ai/roadmap', { topic: topic.trim(), duration, level });
      setRoadmap(data.roadmap);
      setStep('result');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate roadmap. Please try again.');
      setStep('input');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roadmap);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([`# ${topic} — ${duration} Roadmap (${level})\n\n${roadmap}`], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${topic.replace(/\s+/g, '_')}_roadmap.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => { setTopic(''); setRoadmap(''); setStep('input'); setError(''); };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">

        {step === 'input' && (
          <motion.div key="input" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Topic input */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-300">What do you want to learn?</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate(e)}
                placeholder='e.g., "Machine Learning", "React.js", "DSA"'
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* Popular topics */}
            <div className="flex flex-wrap gap-2">
              {POPULAR_TOPICS.map(t => (
                <button key={t} onClick={() => setTopic(t)}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${topic === t ? 'border-rose-500 bg-rose-500/10 text-rose-300' : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'}`}>
                  {t}
                </button>
              ))}
            </div>

            {/* Duration + Level */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-300">Duration</label>
                <select value={duration} onChange={e => setDuration(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-rose-500"
                  aria-label="Study duration">
                  {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-300">Your Level</label>
                <div className="space-y-1">
                  {LEVELS.map(l => (
                    <button key={l.value} onClick={() => setLevel(l.value)}
                      className={`w-full px-3 py-1.5 rounded-lg border text-left text-sm transition-all flex justify-between items-center ${level === l.value ? 'border-rose-500 bg-rose-500/10 text-white' : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'}`}
                      aria-pressed={level === l.value}>
                      <span>{l.label}</span>
                      <span className="text-xs text-gray-500">{l.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">{error}</div>}

            <button onClick={handleGenerate} disabled={topic.trim().length < 3}
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 disabled:opacity-40 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
              <FiMap /> Generate My Roadmap
            </button>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="animate-spin"><FiRotateCw className="text-4xl text-rose-500" /></div>
            <p className="text-gray-300 font-medium">Building your personalised roadmap...</p>
            <p className="text-gray-500 text-sm">{topic} · {duration} · {level}</p>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-rose-600/20 to-pink-600/20 border border-rose-500/30 rounded-xl">
              <div>
                <p className="font-bold text-white">{topic}</p>
                <p className="text-xs text-gray-400">{duration} · {level} level</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCopy} className="p-2 hover:bg-gray-700 rounded-lg transition" aria-label="Copy roadmap">
                  {copied ? <FiCheck className="text-green-400" /> : <FiCopy className="text-gray-400 hover:text-white" />}
                </button>
                <button onClick={handleDownload} className="p-2 hover:bg-gray-700 rounded-lg transition" aria-label="Download roadmap as Markdown">
                  <FiDownload className="text-gray-400 hover:text-white" />
                </button>
              </div>
            </div>

            {/* Roadmap content */}
            <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-5 prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => <h2 className="text-white text-base font-bold mt-5 mb-2 border-b border-gray-700 pb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-rose-400 text-sm font-bold mt-3 mb-1">{children}</h3>,
                  h4: ({ children }) => <h4 className="text-gray-300 text-sm font-semibold mt-2 mb-1">{children}</h4>,
                  p:  ({ children }) => <p  className="text-gray-300 text-sm mb-2">{children}</p>,
                  li: ({ children }) => <li className="text-gray-300 text-sm">{children}</li>,
                  strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                }}
              >{roadmap}</ReactMarkdown>
            </div>

            <div className="flex gap-3">
              <button onClick={handleReset} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all">← Back</button>
              <button onClick={handleReset} className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all">🗺️ New Roadmap</button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
