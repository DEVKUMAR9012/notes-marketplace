import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSidebar, FiEdit, FiSearch, FiFileText, 
  FiImage, FiBookOpen, FiArrowUp, FiX, 
  FiCheckSquare, FiZap, FiMap, FiMessageSquare
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { useFetchStream } from '../hooks/useFetchStream';
import API from '../utils/api';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import '../styles/AIHub.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ── Mock Data ───────────────────────────────────────────────────────────────
const MODES = [
  { id: 'summarize', label: 'Summarize', icon: FiFileText },
  { id: 'quiz', label: 'Quiz', icon: FiCheckSquare },
  { id: 'explain', label: 'Explain', icon: FiZap },
  { id: 'roadmap', label: 'Roadmap', icon: FiMap }
];

const SUGGESTIONS = [
  { id: 1, title: 'Summarize Notes', subtitle: 'Upload PDF and get smart summary', icon: FiFileText },
  { id: 2, title: 'Generate Quiz', subtitle: 'MCQs, flashcards & practice tests', icon: FiCheckSquare },
  { id: 3, title: 'Ask a Concept', subtitle: 'Explain any topic simply', icon: FiZap },
  { id: 4, title: 'Study Roadmap', subtitle: 'AI-generated exam prep plan', icon: FiMap }
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function AIHub() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [mode, setMode] = useState('summarize');
  const [isTyping, setIsTyping] = useState(false);
  
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { stream, abort } = useFetchStream();

  const fetchChatHistory = async () => {
    try {
      const { data } = await API.get('/ai/chats');
      setChatHistory(data.chats || []);
    } catch (err) {
      console.error('Failed to fetch chat history', err);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  // Abort ongoing requests if unmounted
  useEffect(() => abort, [abort]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleAttach = (type) => {
    if (fileInputRef.current) {
      if (type === 'image') {
        fileInputRef.current.accept = 'image/png, image/jpeg, image/jpg';
      } else if (type === 'pdf') {
        fileInputRef.current.accept = '.pdf';
      } else {
        fileInputRef.current.accept = '.pdf,.txt,.docx';
      }
      fileInputRef.current.click();
    }
  };

  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(' ') + '\n';
    }
    return fullText;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const ext = file.name.split('.').pop().toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg'].includes(ext);
    
    const newAttach = { id: Date.now(), name: file.name };

    try {
      if (isImage) {
        newAttach.type = 'image';
        newAttach.mimeType = file.type;
        const reader = new FileReader();
        reader.onload = (event) => {
          newAttach.base64 = event.target.result.split(',')[1];
          setAttachments(prev => [...prev, newAttach]);
        };
        reader.readAsDataURL(file);
      } else {
        newAttach.type = 'document';
        if (ext === 'txt') {
          const reader = new FileReader();
          reader.onload = (event) => {
            newAttach.extractedText = event.target?.result || '';
            setAttachments(prev => [...prev, newAttach]);
          };
          reader.readAsText(file);
        } else if (ext === 'pdf') {
          newAttach.extractedText = await extractTextFromPDF(file);
          setAttachments(prev => [...prev, newAttach]);
        } else if (ext === 'docx') {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          newAttach.extractedText = result.value;
          setAttachments(prev => [...prev, newAttach]);
        }
      }
    } catch (err) {
      console.error('File extraction failed', err);
    }
    // reset input
    e.target.value = '';
  };

  const removeAttachment = (id) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const handleSend = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;
    
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      files: [...attachments]
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setAttachments([]);
    setIsTyping(true);
    
    // Save user message immediately to get a chatId if it's a new chat
    let activeChatId = currentChatId;
    try {
      const { data } = await API.post('/ai/chats', {
        chatId: activeChatId,
        mode,
        messages: newMessages
      });
      if (!activeChatId && data.chat) {
        activeChatId = data.chat._id;
        setCurrentChatId(activeChatId);
        fetchChatHistory(); // refresh sidebar for the new chat title
      }
    } catch (err) {
      console.error('Failed to save user message', err);
    }

    try {
      // 1. Prepare payload with extracted text & image
      let promptText = userMsg.text;
      const documentTexts = userMsg.files.filter(f => f.type === 'document').map(f => f.extractedText).join('\n\n');
      if (documentTexts) {
        promptText += `\n\n--- Attached Document Context ---\n${documentTexts}`;
      }
      
      const imageFile = userMsg.files.find(f => f.type === 'image');
      const imagePayload = imageFile ? { base64: imageFile.base64, mimeType: imageFile.mimeType } : undefined;

      if (mode === 'explain' || mode === 'roadmap') {
        const aiMsgPlaceholder = { id: Date.now() + 1, role: 'ai', text: '' };
        setMessages(prev => [...prev, aiMsgPlaceholder]);
        setIsTyping(false);

        const finalPrompt = mode === 'roadmap' ? `Generate a study roadmap for: ${promptText}` : promptText;
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
              question: finalPrompt,
              context: 'general',
              language: 'english',
              image: imagePayload
            }),
          },
          (chunk) => {
            setMessages(prev => {
              const newMsgs = [...prev];
              const lastMsg = newMsgs[newMsgs.length - 1];
              if (lastMsg.role === 'ai') {
                newMsgs[newMsgs.length - 1] = {
                  ...lastMsg,
                  text: (lastMsg.text || '') + chunk,
                };
              }
              return newMsgs;
            });
          },
          (err) => {
            setMessages(prev => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1].text = `Error: ${err.message || 'Failed to get response'}`;
              // Save error message to backend
              API.post('/ai/chats', { chatId: activeChatId, mode, messages: newMsgs }).catch(console.error);
              return newMsgs;
            });
          }
        );
        // After stream finishes, save the final complete AI message
        setMessages(prev => {
           API.post('/ai/chats', { chatId: activeChatId, mode, messages: prev }).catch(console.error);
           return prev;
        });
      } else if (mode === 'quiz') {
        const { data } = await API.post('/ai/quiz/generate', {
          text: promptText,
          image: imagePayload,
          numQuestions: 5,
          difficulty: 'medium'
        });
        
        setIsTyping(false);
        const mockComponent = (
          <div className="ai-mockup-quiz">
            {data.quiz.map((q, i) => (
              <div key={i} className="mb-4">
                <h4 className="mb-2">Q{i+1}. {q.question}</h4>
                {q.options.map((opt, j) => (
                  <div key={j} className="ai-quiz-option">{opt}</div>
                ))}
              </div>
            ))}
          </div>
        );
        
        const aiMsg = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: 'Here is your generated quiz:',
          mockComponent
        };
        const updatedMsgs = [...newMessages, aiMsg];
        setMessages(updatedMsgs);
        API.post('/ai/chats', { chatId: activeChatId, mode, messages: updatedMsgs }).catch(console.error);
      } else if (mode === 'summarize') {
        const { data } = await API.post('/ai/summarize', {
          text: promptText,
          image: imagePayload,
          type: 'balanced'
        });
        
        const aiMsg = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: data.summary,
        };
        const updatedMsgs = [...newMessages, aiMsg];
        setMessages(updatedMsgs);
        API.post('/ai/chats', { chatId: activeChatId, mode, messages: updatedMsgs }).catch(console.error);
      }
    } catch (err) {
      setIsTyping(false);
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: `Error: ${err?.response?.data?.message || err.message || 'Something went wrong'}`
      };
      const updatedMsgs = [...newMessages, aiMsg];
      setMessages(updatedMsgs);
      API.post('/ai/chats', { chatId: activeChatId, mode, messages: updatedMsgs }).catch(console.error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setInputValue('');
    setAttachments([]);
    setIsTyping(false);
  };

  const loadChat = async (chatId) => {
    try {
      const { data } = await API.get(`/ai/chats/${chatId}`);
      if (data.chat) {
        setCurrentChatId(data.chat._id);
        setMode(data.chat.mode || 'summarize');
        setMessages(data.chat.messages || []);
        if (window.innerWidth <= 768) setSidebarOpen(false); // auto-close sidebar on mobile after selection
      }
    } catch (err) {
      console.error('Failed to load chat', err);
    }
  };

  // Group chats by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groupedChats = {
    today: chatHistory.filter(c => new Date(c.updatedAt) >= today),
    yesterday: chatHistory.filter(c => {
      const d = new Date(c.updatedAt);
      return d >= yesterday && d < today;
    }),
    earlier: chatHistory.filter(c => new Date(c.updatedAt) < yesterday)
  };

  return (
    <div className="ai-root">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="ai-sidebar-overlay" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <div className={`ai-sidebar ${!sidebarOpen ? 'closed' : ''}`}>
        <div className="ai-sidebar-header">
          <button className="ai-new-chat-btn" onClick={handleNewChat}>
            <FiEdit size={16} /> New chat
          </button>
        </div>

        <div className="ai-sidebar-search">
          <input type="text" placeholder="Search chats..." />
        </div>

        <div className="ai-sidebar-content">
          {groupedChats.today.length > 0 && (
            <div className="ai-history-group">
              <div className="ai-history-title">Today</div>
              {groupedChats.today.map(c => (
                <div key={c._id} className={`ai-history-item ${currentChatId === c._id ? 'active' : ''}`} onClick={() => loadChat(c._id)}>
                  <FiMessageSquare size={14} /> {c.title}
                </div>
              ))}
            </div>
          )}

          {groupedChats.yesterday.length > 0 && (
            <div className="ai-history-group">
              <div className="ai-history-title">Yesterday</div>
              {groupedChats.yesterday.map(c => (
                <div key={c._id} className={`ai-history-item ${currentChatId === c._id ? 'active' : ''}`} onClick={() => loadChat(c._id)}>
                  <FiMessageSquare size={14} /> {c.title}
                </div>
              ))}
            </div>
          )}

          {groupedChats.earlier.length > 0 && (
            <div className="ai-history-group">
              <div className="ai-history-title">Earlier</div>
              {groupedChats.earlier.map(c => (
                <div key={c._id} className={`ai-history-item ${currentChatId === c._id ? 'active' : ''}`} onClick={() => loadChat(c._id)}>
                  <FiMessageSquare size={14} /> {c.title}
                </div>
              ))}
            </div>
          )}
          
          {chatHistory.length === 0 && (
             <div className="ai-history-item" style={{opacity: 0.5, cursor: 'default'}}>
               No recent chats
             </div>
          )}
        </div>

        <div className="ai-sidebar-footer">
          <div className="ai-user-avatar">DS</div>
          <div className="ai-user-info">
            <div className="ai-user-name">Dev Soni</div>
            <div className="ai-user-plan">DEI Agra - Auto</div>
          </div>
        </div>
      </div>

      {/* ── Main Chat Area ─────────────────────────────────────── */}
      <div className="ai-main">
        {/* Topbar */}
        <div className="ai-topbar">
          <div className="ai-topbar-left">
            <button className="ai-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FiSidebar size={20} />
            </button>
            <span className="ai-title">NotesHere AI</span>
          </div>

          <div className="ai-topbar-right">
            <select 
              className="ai-mode-select" 
              value={mode} 
              onChange={(e) => setMode(e.target.value)}
            >
              {MODES.map(m => (
                <option key={m.id} value={m.id}>{m.label} Mode</option>
              ))}
            </select>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="ai-chat-feed">
          {messages.length === 0 ? (
            /* Welcome Screen (hides when messages exist) */
            <div className="ai-welcome-screen">
              <div className="ai-welcome-logo">
                <FiZap size={32} />
              </div>
              <div className="ai-welcome-title">
                Good afternoon, <span>Dev</span>
              </div>
              <div className="ai-welcome-subtitle">
                Your AI study companion. Summarize notes, generate quizzes, <br/>solve doubts — all in one place.
              </div>

              <div className="ai-suggestion-grid">
                {SUGGESTIONS.map(sug => (
                  <div key={sug.id} className="ai-suggestion-card" onClick={() => {
                    setInputValue(sug.title);
                  }}>
                    <div className="ai-suggestion-icon"><sug.icon size={18} /></div>
                    <div className="ai-suggestion-text">
                      <h4>{sug.title}</h4>
                      <p>{sug.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div className="ai-messages-wrapper">
              {messages.map(msg => (
                <div key={msg.id} className={`ai-message ${msg.role}`}>
                  <div className="ai-message-inner">
                    <div className={`ai-avatar ${msg.role}`}>
                      {msg.role === 'user' ? 'DS' : <FiZap size={16} />}
                    </div>
                    <div className="ai-message-content">
                      {msg.files && msg.files.map(f => (
                        <div key={f.id} className="ai-attachment-card">
                          <FiFileText size={16} />
                          <span>{f.name}</span>
                        </div>
                      ))}
                      
                      <div className="prose prose-invert max-w-none text-sm">
                        {msg.role === 'user' ? (
                          msg.text.split('\n').map((line, i) => (
                            <React.Fragment key={i}>
                              {line}
                              {i !== msg.text.split('\n').length - 1 && <br />}
                            </React.Fragment>
                          ))
                        ) : (
                          <ReactMarkdown>{msg.text || ''}</ReactMarkdown>
                        )}
                      </div>

                      {/* Render mock UI components for AI responses */}
                      {msg.mockComponent}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="ai-message ai">
                  <div className="ai-message-inner">
                    <div className="ai-avatar bot"><FiZap size={16} /></div>
                    <div className="ai-message-content">
                      <div className="ai-typing-indicator">
                        <div className="ai-dot"></div>
                        <div className="ai-dot"></div>
                        <div className="ai-dot"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Auto-scroll anchor */}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="ai-input-container">
          <div className="ai-input-wrapper">
            
            {/* Attachment Pills */}
            {attachments.length > 0 && (
              <div className="ai-attachments-bar">
                <AnimatePresence>
                  {attachments.map(a => (
                    <motion.div 
                      key={a.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="ai-pill"
                    >
                      <FiFileText size={12} />
                      {a.name}
                      <button className="ai-pill-close" onClick={() => removeAttachment(a.id)}>
                        <FiX size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            <textarea 
              className="ai-textarea"
              placeholder="Ask anything about your notes..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />

            <div className="ai-input-footer">
              <div className="ai-input-tools">
                <button className="ai-tool-btn" onClick={() => handleAttach('pdf')}>
                  <FiFileText /> PDF
                </button>
                <button className="ai-tool-btn" onClick={() => handleAttach('image')}>
                  <FiImage /> Image
                </button>
                <button className="ai-tool-btn" onClick={() => handleAttach('notes')}>
                  <FiBookOpen /> My Notes
                </button>
              </div>
              
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              
              <button 
                className="ai-send-btn" 
                onClick={handleSend}
                disabled={!inputValue.trim() && attachments.length === 0}
              >
                <FiArrowUp size={18} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="ai-disclaimer">
          NotesHere AI can make mistakes. Verify important info from your notes.
        </div>
      </div>
    </div>
  );
}
