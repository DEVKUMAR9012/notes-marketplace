import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiCopy, FiRefreshCw, FiFileText, FiCheck } from 'react-icons/fi';
import API from '../../utils/api';
import ReactMarkdown from 'react-markdown';

const NoteSummarizer = () => {
  const [step, setStep] = useState('input'); // input | loading | result
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [type, setType] = useState('balanced');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setText(event.target?.result || '');
      setError('');
    };
    reader.readAsText(file);
  };

  const handleSummarize = async (e) => {
    e.preventDefault();

    if (!text.trim() || text.trim().length < 50) {
      setError('Please enter at least 50 characters of text');
      return;
    }

    setLoading(true);
    setError('');
    setStep('loading');

    try {
      const { data } = await API.post('/ai/summarize', {
        text: text.trim(),
        type,
      });

      setSummary(data.summary);
      setStep('result');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to summarize notes');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([summary], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `summary_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleReset = () => {
    setText('');
    setSummary('');
    setStep('input');
    setError('');
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {/* ═══ INPUT STEP ═══ */}
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Type Selector */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'balanced', label: 'Balanced', desc: 'General summary' },
                { id: 'beginner', label: 'Beginner', desc: 'Simple explanation' },
                { id: 'exam', label: 'Exam', desc: 'Exam-focused' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    type === t.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
                  }`}
                >
                  <div className="font-bold text-sm text-white">{t.label}</div>
                  <div className="text-xs text-gray-400 mt-1">{t.desc}</div>
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-300">Your Notes</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your notes here... (minimum 50 characters)"
                className="w-full h-48 p-4 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="text-xs text-gray-400">
                {text.length} / 50 characters
              </div>
            </div>

            {/* File Upload */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-all"
              >
                📄 Upload Text File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSummarize}
              disabled={loading || text.trim().length < 50}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
            >
              {loading ? '⚡ Summarizing...' : '✨ Generate Summary'}
            </button>
          </motion.div>
        )}

        {/* ═══ LOADING STEP ═══ */}
        {step === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 space-y-4"
          >
            <div className="animate-spin">
              <FiRefreshCw className="text-4xl text-blue-500" />
            </div>
            <p className="text-gray-300 font-medium">AI is summarizing your notes...</p>
            <p className="text-gray-500 text-sm">This usually takes 5-10 seconds</p>
          </motion.div>
        )}

        {/* ═══ RESULT STEP ═══ */}
        {step === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Result Box */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <FiFileText className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">AI-Generated Summary</p>
                    <p className="text-xs text-gray-500">
                      {type === 'exam'
                        ? 'Exam-focused'
                        : type === 'beginner'
                        ? 'Beginner-friendly'
                        : 'Balanced'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-all"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <FiCheck className="text-green-400" />
                    ) : (
                      <FiCopy className="text-gray-400 hover:text-white" />
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-all"
                    title="Download"
                  >
                    <FiDownload className="text-gray-400 hover:text-white" />
                  </button>
                </div>
              </div>

              {/* Summary Content */}
              <div className="prose prose-invert max-w-none text-sm">
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2 className="text-lg font-bold text-white mt-4 mb-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-bold text-blue-400 mt-3 mb-2">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-300 mb-2">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1 text-gray-300 mb-3">
                        {children}
                      </ul>
                    ),
                    li: ({ children }) => <li>{children}</li>,
                    code: ({ children }) => (
                      <code className="bg-gray-900/50 px-2 py-1 rounded text-orange-300 text-xs">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {summary}
                </ReactMarkdown>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all"
              >
                ← Back
              </button>
              <button
                onClick={() => setText('')}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl transition-all"
              >
                📝 Summarize Another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NoteSummarizer;
