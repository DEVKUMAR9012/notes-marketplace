import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiMessageSquare, FiCopy } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { useFetchStream } from '../../hooks/useFetchStream';

const AskAI = () => {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('general');
  const [language, setLanguage] = useState('english');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const { stream, abort } = useFetchStream();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Abort ongoing request on unmount
  useEffect(() => abort, [abort]);

  const handleSendQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMsg = { role: 'user', text: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);
    setError('');

    // Create placeholder for AI message
    const aiMsgPlaceholder = { role: 'assistant', text: '' };
    setMessages(prev => [...prev, aiMsgPlaceholder]);

    const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/ai/doubt`;

    await stream(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          question: userMsg.text,
          context,
          language,
        }),
      },
      (chunk) => {
        // Update the last message (AI response) incrementally
        setMessages(prev => {
          const newMsgs = [...prev];
          const lastMsg = newMsgs[newMsgs.length - 1];
          if (lastMsg.role === 'assistant') {
            newMsgs[newMsgs.length - 1] = {
              ...lastMsg,
              text: lastMsg.text + chunk,
            };
          }
          return newMsgs;
        });
      },
      (err) => {
        setError(err.message || 'Failed to get response');
        // Remove the placeholder message on error
        setMessages(prev => prev.slice(0, -1));
      }
    );

    setLoading(false);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-[600px] bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-xl">
      {/* Header & Settings */}
      <div className="p-4 border-b border-gray-700 bg-gray-800/80 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center">
            <FiMessageSquare className="text-white" />
          </div>
          <span className="font-bold text-white">Ask AI Anything</span>
        </div>
        <div className="flex gap-3">
          <select
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="px-3 py-1.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
            aria-label="Select context"
          >
            <option value="general">General</option>
            <option value="programming">Programming/Coding</option>
            <option value="math">Mathematics</option>
            <option value="science">Science/Physics</option>
            <option value="history">History</option>
          </select>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-1.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
            aria-label="Select language"
          >
            <option value="english">English</option>
            <option value="hindi">Hindi</option>
          </select>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <FiMessageSquare className="text-6xl mb-4 text-cyan-500" />
            <h3 className="text-xl font-bold text-white mb-2">How can I help you study?</h3>
            <p className="text-gray-400 max-w-sm">
              Ask any concept, math problem, or doubt. I'll explain it simply and give you examples!
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`relative max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-cyan-600 text-white rounded-tr-sm'
                    : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-sm'
                }`}
              >
                {msg.role === 'assistant' && msg.text && (
                  <button
                    onClick={() => handleCopy(msg.text)}
                    className="absolute top-3 right-3 p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded transition-all"
                    title="Copy response"
                    aria-label="Copy response"
                  >
                    <FiCopy className="text-xs" />
                  </button>
                )}
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                ) : (
                  <div className="prose prose-invert max-w-none text-sm pr-6">
                    <ReactMarkdown
                      components={{
                        code: ({ children }) => (
                          <code className="bg-gray-900 px-1.5 py-0.5 rounded text-cyan-300">
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-gray-900 p-3 rounded-lg overflow-x-auto border border-gray-700">
                            {children}
                          </pre>
                        ),
                      }}
                    >
                      {msg.text || ''}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-2 items-center h-5">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="mx-4 p-3 mb-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => {
              setError('');
              handleSendQuestion({ preventDefault: () => {} });
            }}
            className="text-xs bg-red-500/20 px-2 py-1 rounded hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-gray-800/80 border-t border-gray-700">
        <form onSubmit={handleSendQuestion} className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question here..."
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
            aria-label="Your question"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
            aria-label="Send message"
          >
            <FiSend />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AskAI;
