import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiCopy, FiCheck, FiRotateCw, FiDownload } from 'react-icons/fi';
import API from '../../utils/api';
import ReactMarkdown from 'react-markdown';

const INTERVIEW_TYPES = [
  { value: 'technical', label: '💻 Technical',   desc: 'Coding & concepts' },
  { value: 'hr',        label: '🤝 HR',          desc: 'Behavioural'       },
  { value: 'viva',      label: '📚 Viva/Oral',   desc: 'Academic exam'     },
  { value: 'case',      label: '📊 Case Study',  desc: 'Problem solving'   },
];

const ROLES = [
  { value: 'student',       label: '🎓 Student'             },
  { value: 'fresher',       label: '🌱 Fresher (0-1 yr)'    },
  { value: 'junior',        label: '⚡ Junior (1-3 yrs)'    },
  { value: 'professional',  label: '🔥 Mid-Senior (3+ yrs)' },
];

const POPULAR_SUBJECTS = ['Data Structures', 'Operating Systems', 'DBMS', 'Computer Networks', 'Machine Learning', 'React.js', 'System Design', 'OOPs Concepts'];

export default function InterviewPrep() {
  const [subject,   setSubject]   = useState('');
  const [role,      setRole]      = useState('student');
  const [type,      setType]      = useState('technical');
  const [questions, setQuestions] = useState('');
  const [step,      setStep]      = useState('input');
  const [error,     setError]     = useState('');
  const [copied,    setCopied]    = useState(false);

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!subject.trim() || subject.trim().length < 3) {
      setError('Please enter a subject (e.g., "Data Structures", "React.js")');
      return;
    }
    setStep('loading');
    setError('');
    try {
      const { data } = await API.post('/ai/interview-prep', { subject: subject.trim(), role, type });
      setQuestions(data.questions);
      setStep('result');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate questions. Please try again.');
      setStep('input');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(questions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([`# ${subject} — ${type} Interview Prep\n\n${questions}`], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${subject.replace(/\s+/g, '_')}_interview_prep.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => { setSubject(''); setQuestions(''); setStep('input'); setError(''); };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">

        {step === 'input' && (
          <motion.div key="input" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Subject */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-300">Subject / Topic</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate(e)}
                placeholder='e.g., "Data Structures", "Machine Learning", "React.js"'
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Popular subjects */}
            <div className="flex flex-wrap gap-2">
              {POPULAR_SUBJECTS.map(s => (
                <button key={s} onClick={() => setSubject(s)}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${subject === s ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'}`}>
                  {s}
                </button>
              ))}
            </div>

            {/* Interview Type */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-300">Interview Type</label>
              <div className="grid grid-cols-2 gap-2">
                {INTERVIEW_TYPES.map(t => (
                  <button key={t.value} onClick={() => setType(t.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${type === t.value ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'}`}
                    aria-pressed={type === t.value}>
                    <div className="text-sm font-bold text-white">{t.label}</div>
                    <div className="text-xs text-gray-500">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-300">Your Role / Experience</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => (
                  <button key={r.value} onClick={() => setRole(r.value)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${role === r.value ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'}`}
                    aria-pressed={role === r.value}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">{error}</div>}

            <button onClick={handleGenerate} disabled={subject.trim().length < 3}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
              <FiMic /> Generate Interview Questions
            </button>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="animate-spin"><FiRotateCw className="text-4xl text-indigo-500" /></div>
            <p className="text-gray-300 font-medium">Preparing your interview questions...</p>
            <p className="text-gray-500 text-sm">{subject} · {type} · {role}</p>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-xl">
              <div>
                <p className="font-bold text-white">{subject}</p>
                <p className="text-xs text-gray-400">{type} interview · {role}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCopy} className="p-2 hover:bg-gray-700 rounded-lg transition" aria-label="Copy questions">
                  {copied ? <FiCheck className="text-green-400" /> : <FiCopy className="text-gray-400 hover:text-white" />}
                </button>
                <button onClick={handleDownload} className="p-2 hover:bg-gray-700 rounded-lg transition" aria-label="Download as Markdown">
                  <FiDownload className="text-gray-400 hover:text-white" />
                </button>
              </div>
            </div>

            {/* Questions content */}
            <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-5 prose prose-invert prose-sm max-w-none max-h-[500px] overflow-y-auto">
              <ReactMarkdown
                components={{
                  h2:     ({ children }) => <h2     className="text-white text-base font-bold mt-4 mb-3 border-b border-gray-700 pb-1">{children}</h2>,
                  h3:     ({ children }) => <h3     className="text-indigo-400 text-sm font-bold mt-3 mb-1">{children}</h3>,
                  p:      ({ children }) => <p      className="text-gray-300 text-sm mb-2">{children}</p>,
                  li:     ({ children }) => <li     className="text-gray-300 text-sm">{children}</li>,
                  strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-indigo-500 pl-4 my-3 bg-indigo-500/5 rounded-r-lg py-2">
                      {children}
                    </blockquote>
                  ),
                }}
              >{questions}</ReactMarkdown>
            </div>

            <div className="flex gap-3">
              <button onClick={handleReset} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all">← Back</button>
              <button onClick={handleReset} className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all">🎤 New Session</button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
