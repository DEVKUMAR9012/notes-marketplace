import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCode, FiCopy, FiCheck, FiRotateCw } from 'react-icons/fi';
import API from '../../utils/api';
import ReactMarkdown from 'react-markdown';

const LANGUAGES = [
  { value: 'auto',       label: '🔍 Auto Detect' },
  { value: 'javascript', label: '🟨 JavaScript'  },
  { value: 'python',     label: '🐍 Python'       },
  { value: 'java',       label: '☕ Java'          },
  { value: 'c',          label: '⚙️ C'            },
  { value: 'cpp',        label: '⚙️ C++'           },
  { value: 'typescript', label: '🔷 TypeScript'   },
  { value: 'html',       label: '🌐 HTML/CSS'     },
  { value: 'sql',        label: '🗄️ SQL'          },
  { value: 'kotlin',     label: '🎯 Kotlin'       },
];

const EXAMPLES = {
  javascript: `function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\nconsole.log(fibonacci(10));`,
  python:     `def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n    return arr`,
};

export default function CodeExplainer() {
  const [code,        setCode]        = useState('');
  const [language,    setLanguage]    = useState('auto');
  const [explanation, setExplanation] = useState('');
  const [step,        setStep]        = useState('input'); // input | loading | result
  const [error,       setError]       = useState('');
  const [copied,      setCopied]      = useState(false);

  const handleExplain = async (e) => {
    e?.preventDefault();
    if (!code.trim() || code.trim().length < 10) {
      setError('Please paste at least a few lines of code');
      return;
    }
    setStep('loading');
    setError('');
    try {
      const { data } = await API.post('/ai/explain-code', { code: code.trim(), language });
      setExplanation(data.explanation);
      setStep('result');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to explain code. Please try again.');
      setStep('input');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => { setCode(''); setExplanation(''); setStep('input'); setError(''); };

  const loadExample = () => {
    const ex = EXAMPLES[language] || EXAMPLES.javascript;
    setCode(ex);
    setLanguage(EXAMPLES[language] ? language : 'javascript');
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">

        {step === 'input' && (
          <motion.div key="input" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Language selector */}
            <div className="flex gap-3 items-center flex-wrap">
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                aria-label="Programming language"
              >
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <button onClick={loadExample} className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all">
                Load Example
              </button>
            </div>

            {/* Code textarea */}
            <div className="relative">
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={`Paste your ${language !== 'auto' ? language : ''} code here...`}
                className="w-full h-52 p-4 bg-gray-950 border border-gray-700 rounded-xl text-green-300 placeholder-gray-600 focus:outline-none focus:border-orange-500 font-mono text-sm resize-none"
                spellCheck={false}
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-600">{code.length} chars</div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">{error}</div>
            )}

            <button
              onClick={handleExplain}
              disabled={code.trim().length < 10}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-40 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <FiCode /> Explain This Code
            </button>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="animate-spin"><FiRotateCw className="text-4xl text-orange-500" /></div>
            <p className="text-gray-300 font-medium">AI is reading your code...</p>
            <p className="text-gray-500 text-sm">Analysing logic, functions, and potential issues</p>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Explanation card */}
            <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center">
                    <FiCode className="text-white text-sm" />
                  </div>
                  <span className="font-bold text-white text-sm">Code Explanation</span>
                </div>
                <button onClick={handleCopy} className="p-2 hover:bg-gray-700 rounded-lg transition" aria-label="Copy explanation">
                  {copied ? <FiCheck className="text-green-400" /> : <FiCopy className="text-gray-400 hover:text-white" />}
                </button>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    code: ({ children }) => <code className="bg-gray-950 px-1.5 py-0.5 rounded text-orange-300 font-mono text-xs">{children}</code>,
                    pre:  ({ children }) => <pre  className="bg-gray-950 p-3 rounded-lg overflow-x-auto border border-gray-800 text-sm">{children}</pre>,
                    h2:   ({ children }) => <h2   className="text-white text-base font-bold mt-4 mb-2">{children}</h2>,
                    h3:   ({ children }) => <h3   className="text-orange-400 text-sm font-bold mt-3 mb-1">{children}</h3>,
                    p:    ({ children }) => <p    className="text-gray-300 text-sm mb-2">{children}</p>,
                    li:   ({ children }) => <li   className="text-gray-300 text-sm">{children}</li>,
                  }}
                >{explanation}</ReactMarkdown>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleReset} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all">
                ← Back
              </button>
              <button onClick={handleReset} className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-xl transition-all">
                🔍 Explain Another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
