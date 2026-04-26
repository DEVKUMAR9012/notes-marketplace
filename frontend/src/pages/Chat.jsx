import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import API, { API_BASE_URL } from '../utils/api';
import './Chat.css';

// ── Helper: Format time
const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ── Helper: Read Receipt Icons
const getReceiptIcon = (msg, userId, participants) => {
  if (msg.readBy?.some(id => String(id) !== userId)) return <span className="receipt read">✓✓</span>; // Blue Double Tick
  if (msg.deliveredTo?.some(id => String(id) !== userId)) return <span className="receipt delivered">✓✓</span>; // Grey Double Tick
  return <span className="receipt sent">✓</span>; // Single Tick
};

// ── Avatar Component
const Avatar = ({ user, size = 40, isOnline }) => {
  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url.replace(/\\/g, '/')}`;
  };
  const src = getImageUrl(user?.profileImage) || user?.avatar;
  const initials = user?.name?.charAt(0)?.toUpperCase() || '?';
  return (
    <div className="chat-avatar-wrapper" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={user?.name} className="chat-avatar" />
      ) : (
        <div className="chat-avatar initials" style={{ fontSize: size * 0.4 }}>{initials}</div>
      )}
      {isOnline && <div className="online-indicator"></div>}
    </div>
  );
};

export default function Chat() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  // ── State
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  
  // Typing & UI states
  const [typingUser, setTypingUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [uploading, setUploading] = useState(false);
  const [warningMsg, setWarningMsg] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  // ✅ FIX: Keep activeChat in a ref so socket listeners always get the latest value
  const activeChatRef = useRef(null);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  // ── Load Conversations
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/chat');
      setConversations(res.data.chats);
      const counts = {};
      res.data.chats.forEach(c => { counts[c._id] = c.unreadCounts?.[String(user._id)] || 0; });
      setUnreadCounts(counts);
    } catch (err) { console.error('Failed to load conversations:', err); }
    finally { setLoading(false); }
  }, [user._id]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Load Messages for Active Chat
  useEffect(() => {
    if (!activeChat) return;
    const fetchMessages = async () => {
      try {
        setMsgLoading(true);
        const res = await API.get(`/chat/${activeChat._id}/messages`);
        setMessages(res.data.messages);
      } catch (err) { console.error(err); } 
      finally { setMsgLoading(false); }
    };
    fetchMessages();
    API.put(`/chat/${activeChat._id}/read`).catch(() => {});
    setUnreadCounts(prev => ({ ...prev, [activeChat._id]: 0 }));
  }, [activeChat]);

  // ── Socket Events
  useEffect(() => {
    if (!socket || !activeChat) return;
    socket.emit('join_chat', activeChat._id);
    // Tell sender we opened the chat (delivered/read logic)
    socket.emit('messages_delivered', { chatId: activeChat._id });

    return () => { socket.emit('leave_chat', activeChat._id); };
  }, [socket, activeChat]);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg) => {
      const currentChat = activeChatRef.current;
      if (currentChat && msg.chat === currentChat._id) {
        // ✅ Use functional update to avoid stale state
        setMessages(prev => {
          // Prevent duplicate messages
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        API.put(`/chat/${currentChat._id}/read`).catch(() => {});
        socket.emit('messages_delivered', { chatId: currentChat._id });
      }
    };

    const onConversationUpdated = ({ chatId, lastMessage, unreadCount }) => {
      setConversations(prev => prev.map(c => c._id === chatId ? { ...c, lastMessage } : c));
      if (!activeChat || activeChat._id !== chatId) {
        setUnreadCounts(prev => ({ ...prev, [chatId]: unreadCount }));
        // Play notification sound
        new Audio('/sounds/notification.mp3').play().catch(()=>{});
      }
    };

    const onUserTyping = ({ userId, name }) => {
      if (userId !== String(user._id)) setTypingUser(name);
    };
    const onUserStoppedTyping = () => setTypingUser(null);
    const onUserStatus = ({ userId, isOnline, lastSeen }) => {
      setConversations(prev => prev.map(c => {
        const pIndex = c.participants.findIndex(p => p._id === userId);
        if(pIndex > -1) {
            const newP = [...c.participants];
            newP[pIndex] = {...newP[pIndex], isOnline, lastSeen};
            return {...c, participants: newP};
        }
        return c;
      }));
      if(activeChat && activeChat.participants.some(p => p._id === userId)) {
         setActiveChat(prev => {
             const newP = prev.participants.map(p => p._id === userId ? {...p, isOnline, lastSeen} : p);
             return {...prev, participants: newP};
         });
      }
    };

    const onWarning = ({ text }) => { setWarningMsg(text); };

    socket.on('new_message', onNewMessage);
    socket.on('conversation_updated', onConversationUpdated);
    socket.on('user_typing', onUserTyping);
    socket.on('user_stopped_typing', onUserStoppedTyping);
    socket.on('user_status', onUserStatus);
    socket.on('personal_info_warning', onWarning);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('conversation_updated', onConversationUpdated);
      socket.off('user_typing', onUserTyping);
      socket.off('user_stopped_typing', onUserStoppedTyping);
      socket.off('user_status', onUserStatus);
      socket.off('personal_info_warning', onWarning);
    };
  }, [socket, activeChat, user._id]);

  // ── Send Message
  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !activeChat || !socket) return;
    socket.emit('send_message', { chatId: activeChat._id, text });
    setInputText('');
    socket.emit('typing_stop', { chatId: activeChat._id });
  };

  const handleForceSend = () => {
    if (!warningMsg || !activeChat || !socket) return;
    socket.emit('force_send_message', { chatId: activeChat._id, text: warningMsg });
    setWarningMsg(null);
    setInputText('');
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (!socket || !activeChat) return;
    socket.emit('typing_start', { chatId: activeChat._id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { socket.emit('typing_stop', { chatId: activeChat._id }); }, 1500);
  };

  // ── Quick Replies
  const sendQuickReply = (text) => {
    if (!activeChat || !socket) return;
    socket.emit('send_message', { chatId: activeChat._id, text, quickReply: text });
  };

  // ── File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;
    if (file.size > 10 * 1024 * 1024) return alert("File size must be under 10MB");

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setUploading(true);
      const res = await API.post(`/chat/${activeChat._id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // the socket will broadcast the new message automatically
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
      e.target.value = null; // reset input
    }
  };

  // ── User Search
  useEffect(() => {
    if (searchQuery.length < 2) return setSearchResults([]);
    const t = setTimeout(async () => {
      try {
        const res = await API.get(`/chat/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data.users);
      } catch (e) { }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const startChat = async (recipient) => {
    try {
      const res = await API.post('/chat', { recipientId: recipient._id });
      const newChat = res.data.chat;
      setConversations(prev => prev.find(c => c._id === newChat._id) ? prev : [newChat, ...prev]);
      setActiveChat(newChat);
      setShowSearch(false);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (location.state?.startChatWith) {
      startChat(location.state.startChatWith);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const otherParticipant = activeChat?.participants?.find(p => String(p._id) !== String(user._id));

  return (
    <div className="chat-page">
      {/* ──────── LEFT PANEL: Inbox ──────── */}
      <aside className={`chat-sidebar ${activeChat ? 'hidden-mobile' : ''}`}>
        <div className="sidebar-header">
          <h2>Messages {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && <span className="badge">{Object.values(unreadCounts).reduce((a, b) => a + b, 0)}</span>}</h2>
          <button onClick={() => setShowSearch(!showSearch)}>✏️</button>
        </div>

        {showSearch && (
          <div className="search-box">
            <input type="text" placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
            {searchResults.map(u => (
              <div key={u._id} className="search-result" onClick={() => startChat(u)}>
                <Avatar user={u} size={32} isOnline={u.isOnline} />
                <span>{u.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="chat-list">
          {conversations.map(chat => {
            const other = chat.participants.find(p => String(p._id) !== String(user._id));
            const unread = unreadCounts[chat._id] || 0;
            return (
              <div key={chat._id} className={`chat-item ${activeChat?._id === chat._id ? 'active' : ''}`} onClick={() => setActiveChat(chat)}>
                <Avatar user={other} size={48} isOnline={other?.isOnline} />
                <div className="chat-item-info">
                  <div className="chat-item-top">
                    <span className="name">{other?.name}</span>
                    <span className="time">{chat.lastMessage?.sentAt && formatTime(chat.lastMessage.sentAt)}</span>
                  </div>
                  <div className="preview">
                    {chat.lastMessage?.type === 'file' ? '📎 File attached' : chat.lastMessage?.text || 'No messages yet'}
                  </div>
                </div>
                {unread > 0 && <span className="unread-badge">{unread}</span>}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ──────── RIGHT PANEL: Thread ──────── */}
      <main className={`chat-main ${!activeChat ? 'hidden-mobile' : ''}`}>
        {!activeChat ? (
          <div className="welcome"><h2>Select a chat to start messaging</h2></div>
        ) : (
          <>
            <div className="chat-header">
              <button className="back-btn" onClick={() => setActiveChat(null)}>←</button>
              <Link to={`/profile/${otherParticipant?._id}`} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                <Avatar user={otherParticipant} size={40} isOnline={otherParticipant?.isOnline} />
              </Link>
              <div className="header-info">
                <h3>
                  <Link to={`/profile/${otherParticipant?._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {otherParticipant?.name}
                  </Link>
                  {otherParticipant?.totalSales > 0 && <span className="verified" title="Verified Seller">✓</span>}
                </h3>
                <span className="status">{typingUser ? 'typing...' : (otherParticipant?.isOnline ? 'Online' : `Last seen: ${otherParticipant?.lastSeen ? formatTime(otherParticipant.lastSeen) : 'N/A'}`)}</span>
              </div>
              <div className="header-actions">
                <button title="Report/Block">⋮</button>
              </div>
            </div>

            <div className="messages-area">
              {messages.map(msg => {
                const isMine = String(msg.sender?._id || msg.sender) === String(user._id);
                return (
                  <div key={msg._id} className={`message-row ${isMine ? 'mine' : 'theirs'}`}>
                    <div className="message-bubble">
                      {msg.fileUrl ? (
                        msg.fileType === 'image' ? (
                           <img src={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${API_BASE_URL}${msg.fileUrl.startsWith('/') ? '' : '/'}${msg.fileUrl.replace(/\\/g, '/')}`} alt="attachment" className="msg-image" />
                        ) : (
                           <a href={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${API_BASE_URL}${msg.fileUrl.startsWith('/') ? '' : '/'}${msg.fileUrl.replace(/\\/g, '/')}`} target="_blank" rel="noreferrer" className="msg-pdf">📎 View Document</a>
                        )
                      ) : null}
                      {msg.text && <p>{msg.text}</p>}
                      <div className="msg-meta">
                        <span>{formatTime(msg.createdAt)}</span>
                        {isMine && getReceiptIcon(msg, user._id, activeChat.participants)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies for buyers communicating with sellers */}
            {messages.length < 5 && (
              <div className="quick-replies">
                <button onClick={() => sendQuickReply("Is this note still available?")}>👋 Is this available?</button>
                <button onClick={() => sendQuickReply("Can you share a sample page?")}>📄 Share sample</button>
                <button onClick={() => sendQuickReply("Can we negotiate the price?")}>💰 Discuss price</button>
              </div>
            )}

            {/* Warning Dialog */}
            {warningMsg && (
              <div className="warning-banner">
                <p>⚠️ <strong>Safety Warning:</strong> Sharing phone numbers or UPI IDs is against our policy and can lead to fraud.</p>
                <button onClick={handleForceSend}>Send Anyway</button>
                <button onClick={() => setWarningMsg(null)}>Cancel</button>
              </div>
            )}

            <div className="input-area">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf" style={{display: 'none'}} />
              <button className="attach-btn" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                {uploading ? '⏳' : '📎'}
              </button>
              <input type="text" value={inputText} onChange={handleTyping} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Type a message..." />
              <button className="send-btn" onClick={handleSend}>➤</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
