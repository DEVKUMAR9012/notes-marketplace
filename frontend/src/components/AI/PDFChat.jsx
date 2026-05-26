import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiUpload, FiTrash2, FiFile } from 'react-icons/fi';
import API from '../../utils/api';
import { useFetchStream } from '../../hooks/useFetchStream';

const PDFChat = () => {
  const [step, setStep] = useState('upload');
  const [pdfs, setPDFs] = useState([]);
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { stream, abort } = useFetchStream();

  useEffect(() => {
    fetchPDFs();
    return () => abort(); // abort any ongoing chat stream on unmount
  }, [abort]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchPDFs = async () => {
    try {
      const { data } = await API.get('/ai/pdf/list');
      setPDFs(data.pdfs);
    } catch (err) {
      console.error('Failed to fetch PDFs:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validExtensions = ['pdf', 'docx', 'txt', 'md'];
    const ext = file.name.toLowerCase().split('.').pop();
    if (!validExtensions.includes(ext)) {
      setError('Please upload a PDF, DOCX, TXT, or MD file');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const { data } = await API.post('/ai/pdf/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPDFs(prev => [...prev, {
        id: data.pdfId,
        filename: data.filename,
        pages: data.pages,
        uploadedAt: new Date(),
      }]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectPDF = (pdf) => {
    setSelectedPDF(pdf);
    setMessages([]);
    setQuestion('');
    setStep('chat');
  };

  const handleDeletePDF = async (pdfId, filename) => {
    if (!window.confirm(`Delete "${filename}"? This will remove the document and its chat history.`)) return;
    try {
      await API.delete(`/ai/pdf/${pdfId}`);
      setPDFs(prev => prev.filter(p => p.id !== pdfId));
      if (selectedPDF?.id === pdfId) {
        setStep('upload');
        setSelectedPDF(null);
      }
    } catch (err) {
      setError('Failed to delete document');
    }
  };

  const handleSendQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMsg = { role: 'user', text: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);
    setError('');

    // Placeholder for AI response
    const aiPlaceholder = { role: 'assistant', text: '' };
    setMessages(prev => [...prev, aiPlaceholder]);

    const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/ai/pdf/chat`;

    await stream(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          pdfId: selectedPDF.id,
          question: userMsg.text,
        }),
      },
      (chunk) => {
        setMessages(prev => {
          const newMsgs = [...prev];
          const last = newMsgs[newMsgs.length - 1];
          if (last.role === 'assistant') {
            newMsgs[newMsgs.length - 1] = { ...last, text: last.text + chunk };
          }
          return newMsgs;
        });
      },
      (err) => {
        setError(err.message || 'Failed to process question');
        setMessages(prev => prev.slice(0, -1)); // remove placeholder
      }
    );

    setLoading(false);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col space-y-4"
          >
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              aria-label="Upload file"
            >
              <FiUpload className="text-5xl text-gray-500 mb-4" />
              <p className="text-lg font-bold text-white mb-2">Upload your document</p>
              <p className="text-gray-400 text-sm text-center">Click to browse or drag and drop PDF, DOCX, TXT, or MD files here</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>

            {pdfs.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-300">Your Documents</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pdfs.map((pdf) => (
                    <motion.div
                      key={pdf.id}
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-600 cursor-pointer group"
                      onClick={() => handleSelectPDF(pdf)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FiFile className="text-blue-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{pdf.filename}</p>
                          <p className="text-xs text-gray-500">{pdf.pages > 1 ? `${pdf.pages} pages` : '1 page'}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePDF(pdf.id, pdf.filename); }}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded transition-all"
                        aria-label={`Delete ${pdf.filename}`}
                      >
                        <FiTrash2 className="text-red-400 text-sm" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {uploading && (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" />
                  <p className="text-gray-300">Uploading document...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">
                {error}
                <button onClick={() => setError('')} className="ml-2 text-xs underline">Dismiss</button>
              </div>
            )}
          </motion.div>
        )}

        {step === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 bg-gray-800/50 border-b border-gray-700 rounded-t-xl">
              <div className="flex items-center gap-2">
                <FiFile className="text-blue-400" />
                <div>
                  <p className="text-sm font-bold text-white truncate">{selectedPDF?.filename}</p>
                  <p className="text-xs text-gray-500">{selectedPDF?.pages} pages</p>
                </div>
              </div>
              <button
                onClick={() => { setStep('upload'); abort(); }}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-all"
              >
                ← Back
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-center">
                  <div>
                    <p className="text-2xl mb-2">💬</p>
                    <p className="text-gray-400">Ask anything about your document!</p>
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 px-4 py-3 rounded-lg">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce animation-delay-100" />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce animation-delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {error && (
              <div className="mx-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg flex justify-between">
                <span>{error}</span>
                <button onClick={() => setError('')} className="text-xs underline">Dismiss</button>
              </div>
            )}

            <form onSubmit={handleSendQuestion} className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask something about this document..."
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  aria-label="Your question about the document"
                />
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-all"
                  aria-label="Send question"
                >
                  <FiSend />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PDFChat;
