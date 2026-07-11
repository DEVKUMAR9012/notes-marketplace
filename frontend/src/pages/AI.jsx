import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSidebar, FiEdit, FiSearch, FiFileText, 
  FiImage, FiBookOpen, FiArrowUp, FiX, 
  FiCheckSquare, FiZap, FiMap, FiMessageSquare,
  FiMic, FiStopCircle
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAwaitingStream, setIsAwaitingStream] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState('unknown'); // 'unknown' | 'granted' | 'denied'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const currentAiTextRef = useRef('');
  
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const { stream, abort } = useFetchStream();
  const recognitionRef = useRef(null);

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
  }, [messages, isStreaming]);

  const autoResizeTextarea = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [inputValue]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return ['Good morning', '☀️'];
    if (hour < 18) return ['Good afternoon', '⛅'];
    return ['Good evening', '🌙'];
  };

  const speakText = (text) => {
    try {
      if (!window.speechSynthesis) return;
      if (!text || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 1;
      window.speechSynthesis.speak(utter);
    } catch (err) {
      console.error('TTS error', err);
    }
  };

  const buildApiMessages = (messageList) => {
    return messageList.map((msg) => ({
      role: msg.role === 'ai' ? 'assistant' : msg.role,
      content: msg.text || '',
    }));
  };

  const copyAiMessage = async (msg) => {
    try {
      await navigator.clipboard.writeText(msg.text || '');
      setCopiedMessageId(msg.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition not supported in this browser.');
      return;
    }

    // Ensure mic permission is requested via getUserMedia for a reliable browser prompt
    const requestPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately stop the tracks we only needed to trigger permission
        stream.getTracks().forEach(t => t.stop());
        setMicPermission('granted');
        return true;
      } catch (err) {
        console.warn('Microphone permission denied or error', err);
        setMicPermission('denied');
        return false;
      }
    };

    try {
      requestPermission().then((allowed) => {
        if (!allowed) return; // user denied or no getUserMedia

        const rec = new SpeechRecognition();
        rec.lang = 'en-US';
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        rec.onresult = (event) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) final += res[0].transcript;
            else interim += res[0].transcript;
          }
          setInputValue(prev => {
            if (final) return (prev ? prev + ' ' : '') + final;
            return (prev ? prev + ' ' : '') + interim;
          });
        };

        rec.onend = () => {
          setIsRecording(false);
          recognitionRef.current = null;
        };
        rec.onerror = (e) => {
          console.error('Speech recognition error', e);
          setIsRecording(false);
          recognitionRef.current = null;
        };

        rec.start();
        recognitionRef.current = rec;
        setIsRecording(true);
      }).catch(e => {
        console.error('Permission request failed', e);
      });
    } catch (err) {
      console.error('startRecognition error', err);
    }
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

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
    setIsStreaming(true);
    setIsAwaitingStream(true);
    
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
        fetchChatHistory();
      }
    } catch (err) {
      console.error('Failed to save user message', err);
    }

    try {
      let promptText = userMsg.text;
      const documentTexts = userMsg.files.filter(f => f.type === 'document').map(f => f.extractedText).join('\n\n');
      if (documentTexts) {
        promptText += `\n\n--- Attached Document Context ---\n${documentTexts}`;
      }
      const imageFile = userMsg.files.find(f => f.type === 'image');
      const imagePayload = imageFile ? { base64: imageFile.base64, mimeType: imageFile.mimeType } : undefined;
      const aiMsgPlaceholder = { id: (Date.now() + 1).toString(), role: 'ai', text: '' };
      setMessages(prev => [...prev, aiMsgPlaceholder]);

      const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/ai/chat-stream`;
      let finalPrompt = promptText;

      if (mode === 'roadmap') {
        finalPrompt = `Generate a study roadmap for: ${promptText}`;
      } else if (mode === 'summarize') {
        finalPrompt = `Summarize the following notes:\n${promptText}`;
      }

      const apiMessages = buildApiMessages(newMessages);
      if (mode === 'summarize' || mode === 'explain' || mode === 'roadmap') {
        if (mode === 'summarize' || mode === 'roadmap') {
          apiMessages[apiMessages.length - 1].content = finalPrompt;
        }
        currentAiTextRef.current = '';
        await stream(
          apiUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              messages: apiMessages,
              mode,
              image: imagePayload,
            }),
          },
          (chunk) => {
            setIsAwaitingStream(false);
            currentAiTextRef.current += chunk;
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
              const last = newMsgs[newMsgs.length - 1];
              if (last?.role === 'ai') {
                newMsgs[newMsgs.length - 1] = {
                  ...last,
                  text: `Error: ${err.message || 'Failed to get response'}`,
                };
              }
              API.post('/ai/chats', { chatId: activeChatId, mode, messages: newMsgs }).catch(console.error);
              return newMsgs;
            });
          }
        );
        if (currentAiTextRef.current) {
          speakText(currentAiTextRef.current);
        }
        setMessages(prev => {
          API.post('/ai/chats', { chatId: activeChatId, mode, messages: prev }).catch(console.error);
          return prev;
        });
      } else {
        const { data } = await API.post('/ai/quiz/generate', {
          text: promptText,
          image: imagePayload,
          numQuestions: 5,
          difficulty: 'medium'
        });

        const mockComponent = (
          <div className="ai-mockup-quiz">
            {data.quiz.map((q, i) => (
              <div key={i} className="mb-4">
                <h4 className="mb-2">Q{i + 1}. {q.question}</h4>
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
      }
    } catch (err) {
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: `Error: ${err?.response?.data?.message || err.message || 'Something went wrong'}`
      };
      const updatedMsgs = [...newMessages, aiMsg];
      setMessages(updatedMsgs);
      API.post('/ai/chats', { chatId: activeChatId, mode, messages: updatedMsgs }).catch(console.error);
    } finally {
      setIsStreaming(false);
      setIsAwaitingStream(false);
      currentAiTextRef.current = '';
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
    setIsStreaming(false);
    setIsAwaitingStream(false);
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

  const filteredHistory = chatHistory.filter((c) =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedChats = {
    today: filteredHistory.filter(c => new Date(c.updatedAt) >= today),
    yesterday: filteredHistory.filter(c => {
      const d = new Date(c.updatedAt);
      return d >= yesterday && d < today;
    }),
    earlier: filteredHistory.filter(c => new Date(c.updatedAt) < yesterday)
  };

  const [greeting, emoji] = getGreeting();

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
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
          
          {filteredHistory.length === 0 && (
             <div className="ai-history-empty">
               {searchQuery ? 'No chats match your search.' : 'No recent chats'}
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
            <span className="ai-title">DEVAI</span>
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
                {greeting} {emoji}, <span>Dev</span>
              </div>
              <div className="ai-welcome-subtitle">
                Your intelligent dev assistant. Summarize notes, generate quizzes, <br/>solve doubts — all in one place.
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
              <AnimatePresence mode="popLayout">
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.18 }}
                    className={`ai-message ${msg.role}`}
                  >
                    <div className="ai-message-inner">
                      <div className={`ai-avatar ${msg.role}`}>
                        {msg.role === 'user' ? 'DS' : <FiZap size={16} />}
                      </div>
                      <div className="ai-message-content">
                        {msg.files && msg.files.map(f => (
                          <motion.div
                            key={f.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="ai-attachment-card"
                          >
                            <FiFileText size={16} />
                            <span>{f.name}</span>
                          </motion.div>
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
                            <>
                              <ReactMarkdown>{msg.text || ''}</ReactMarkdown>
                              {isStreaming && !isAwaitingStream && index === messages.length - 1 && (
                                <span className="ai-cursor" />
                              )}
                            </>
                          )}
                        </div>

                        {msg.role === 'ai' && msg.text && (
                          <div className="ai-msg-actions">
                            <button
                              className="ai-copy-btn"
                              onClick={() => copyAiMessage(msg)}
                            >
                              {copiedMessageId === msg.id ? 'Copied ✓' : 'Copy'}
                            </button>
                          </div>
                        )}

                        {/* Render mock UI components for AI responses */}
                        {msg.mockComponent}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator */}
              {isStreaming && isAwaitingStream && (
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
              ref={textareaRef}
              className="ai-textarea"
              placeholder="Ask DEVAI anything…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onInput={autoResizeTextarea}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isStreaming}
            />

            <div className="ai-input-footer">
              <div className="ai-input-tools">
                <button className="ai-tool-btn" onClick={() => handleAttach('pdf')}>
                  <FiFileText /> PDF
                </button>
                <button className="ai-tool-btn" onClick={() => handleAttach('image')}>
                  <FiImage /> Image
                </button>
                <button
                  className={`ai-tool-btn ${isRecording ? 'recording' : ''}`}
                  onClick={() => {
                    if (isRecording) stopRecognition();
                    else startRecognition();
                  }}
                  title={isRecording ? 'Stop recording' : 'Talk to AI'}
                >
                  <FiMic /> {isRecording ? 'Stop' : 'Talk'}
                </button>
                <button className="ai-tool-btn" onClick={() => handleAttach('notes')}>
                  <FiBookOpen /> My Notes
                </button>
              </div>
              {/* Microphone permission status */}
              {micPermission === 'denied' && (
                <div className="ai-mic-warning" style={{color: '#f87171', fontSize: 12, marginTop: 6}}>
                  Microphone blocked — allow access in your browser settings.
                </div>
              )}
              {micPermission === 'granted' && (
                <div className="ai-mic-success" style={{color: '#34d399', fontSize: 12, marginTop: 6}}>
                  Microphone access allowed.
                </div>
              )}
              
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              
              {isStreaming ? (
                <button
                  className="ai-stop-btn"
                  onClick={() => {
                    abort();
                    setIsStreaming(false);
                    setIsAwaitingStream(false);
                  }}
                  type="button"
                >
                  <FiStopCircle size={18} />
                </button>
              ) : (
                <button 
                  className="ai-send-btn" 
                  onClick={handleSend}
                  disabled={!inputValue.trim() && attachments.length === 0}
                >
                  <FiArrowUp size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="ai-disclaimer">
          DEVAI can make mistakes. Verify important info from your notes.
        </div>
      </div>
    </div>
  );
}
