import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import API, { API_BASE_URL } from '../utils/api';
import './Chat.css';

// ── Helper: Format time
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  const [imgError, setImgError] = useState(false);

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url.replace(/\\/g, '/')}`;
  };
  
  const src = getImageUrl(user?.profileImage) || user?.avatar;
  const initials = user?.name?.charAt(0)?.toUpperCase() || '?';
  
  return (
    <div className="chat-avatar-wrapper" style={{ width: size, height: size }}>
      {src && !imgError ? (
        <img 
          src={src} 
          alt={user?.name} 
          className="chat-avatar" 
          onError={() => setImgError(true)} 
        />
      ) : (
        <div className="chat-avatar initials" style={{ fontSize: size * 0.4 }}>{initials}</div>
      )}
      {isOnline && <div className="online-indicator"></div>}
    </div>
  );
};

// ── FIX 1: Typing Dots Component ────────────────────────────────────────────
const TypingBubble = ({ name }) => (
  <div className="message-row theirs">
    <div className="message-bubble typing-bubble">
      <div className="typing-indicator">
        <span /><span /><span />
      </div>
      {name && <p className="typing-name">{name} is typing…</p>}
    </div>
  </div>
);
// ────────────────────────────────────────────────────────────────────────────

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

  // Group Chat & Suggestions State
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Instagram Chat Features State
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  // ✅ FIX: Keep activeChat in a ref so socket listeners always get the latest value
  const activeChatRef = useRef(null);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages, typingUser]);

  // ── Load Suggested Users
  useEffect(() => {
    API.get('/chat/users/suggestions').then(res => setSuggestedUsers(res.data.users)).catch(()=>{});
  }, []);

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

  // ✅ Reload conversations when socket reconnects (auto-refresh like WhatsApp)
  useEffect(() => {
    if (!socket) return;
    const onReconnect = () => {
      console.log('🔄 Socket reconnected — reloading data...');
      loadConversations();
      const current = activeChatRef.current;
      if (current) {
        API.get(`/chat/${current._id}/messages`)
          .then(r => setMessages(r.data.messages))
          .catch(() => {});
      }
    };
    socket.on('connect', onReconnect);
    return () => socket.off('connect', onReconnect);
  }, [socket, loadConversations]);

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
    setTypingUser(null);
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
      setConversations(prev => {
        const exists = prev.some(c => c._id === chatId);
        if (!exists) {
          // ✅ New chat not in list yet — reload full list
          loadConversations();
          return prev;
        }
        // ✅ Update lastMessage and move to TOP (WhatsApp style)
        const updated = prev.map(c => c._id === chatId ? { ...c, lastMessage } : c);
        const chatIndex = updated.findIndex(c => c._id === chatId);
        if (chatIndex > 0) {
          const [moved] = updated.splice(chatIndex, 1);
          updated.unshift(moved); // move to top
        }
        return updated;
      });
      if (!activeChat || activeChat._id !== chatId) {
        setUnreadCounts(prev => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
        // Play notification sound
        new Audio('/sounds/notification.mp3').play().catch(()=>{});
      }
    };

    const onUserTyping = ({ userId, name }) => {
      if (userId !== String(user._id)) setTypingUser({ userId, name });
    };
    const onUserStoppedTyping = ({ userId }) => {
      if (userId !== String(user._id)) setTypingUser(null);
    };
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

    const onMessagesDelivered = ({ chatId, deliveredTo }) => {
      const current = activeChatRef.current;
      if (current && chatId === current._id) {
        setMessages(prev => prev.map(m => {
          if (String(m.sender?._id || m.sender) === String(user._id)) {
            const already = m.deliveredTo?.map(String) || [];
            if (!already.includes(String(deliveredTo))) {
              return { ...m, deliveredTo: [...already, String(deliveredTo)] };
            }
          }
          return m;
        }));
      }
    };

    const onMessageReacted = ({ msgId, reactions }) => {
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, reactions } : m));
    };

    const onMessageDeleted = ({ msgId }) => {
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isDeleted: true, text: '', fileUrl: null } : m));
    };

    socket.on('new_message',          onNewMessage);
    socket.on('conversation_updated', onConversationUpdated);
    socket.on('user_typing',          onUserTyping);
    socket.on('user_stopped_typing',  onUserStoppedTyping);
    socket.on('user_status',          onUserStatus);
    socket.on('personal_info_warning',onWarning);
    socket.on('messages_delivery_update', onMessagesDelivered);
    socket.on('message_reacted',      onMessageReacted);
    socket.on('message_deleted',      onMessageDeleted);

    return () => {
      socket.off('new_message',          onNewMessage);
      socket.off('conversation_updated', onConversationUpdated);
      socket.off('user_typing',          onUserTyping);
      socket.off('user_stopped_typing',  onUserStoppedTyping);
      socket.off('user_status',          onUserStatus);
      socket.off('personal_info_warning',onWarning);
      socket.off('messages_delivery_update', onMessagesDelivered);
      socket.off('message_reacted',      onMessageReacted);
      socket.off('message_deleted',      onMessageDeleted);
    };
  }, [socket, activeChat, user._id]);

  // ── Instagram Features
  const handleReact = async (msgId, emoji = '❤️') => {
    try {
      await API.post(`/chat/messages/${msgId}/react`, { emoji });
    } catch (e) { console.error(e); }
  };

  const handleUnsend = async (msgId) => {
    try {
      await API.delete(`/chat/messages/${msgId}`);
      setHoveredMsg(null);
    } catch (e) { console.error(e); }
  };

  // ── Send Message
  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !activeChat || !socket) return;
    socket.emit('send_message', { chatId: activeChat._id, text, replyTo: replyingTo?._id });
    setInputText('');
    setReplyingTo(null);
    clearTimeout(typingTimeoutRef.current);
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
      setSearchQuery('');
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (location.state?.startChatWith) {
      startChat(location.state.startChatWith);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const handleCreateGroup = async () => {
    if (selectedUsers.length < 1 || !groupName.trim()) return alert('Select users and enter a group name');
    try {
      const res = await API.post('/chat/group', {
        userIds: selectedUsers.map(u => u._id),
        chatName: groupName
      });
      const newChat = res.data.chat;
      setConversations(prev => [newChat, ...prev]);
      setActiveChat(newChat);
      setShowSearch(false);
      setIsCreatingGroup(false);
      setGroupName('');
      setSelectedUsers([]);
    } catch (e) {
      console.error(e);
      alert('Failed to create group');
    }
  };

  const toggleUserSelection = (u) => {
    if (selectedUsers.find(su => su._id === u._id)) {
      setSelectedUsers(prev => prev.filter(su => su._id !== u._id));
    } else {
      setSelectedUsers(prev => [...prev, u]);
    }
  };

  const isGroup = activeChat?.isGroupChat;
  const otherParticipant = !isGroup ? activeChat?.participants?.find(p => String(p._id) !== String(user._id)) : null;
  const chatTitle = isGroup ? activeChat.chatName : otherParticipant?.name;
  const chatStatus = isGroup 
    ? `${activeChat.participants.length} participants` 
    : (otherParticipant?.isOnline ? 'Online' : `Last seen: ${otherParticipant?.lastSeen ? formatTime(otherParticipant.lastSeen) : 'N/A'}`);

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
            <div className="search-header">
              <input type="text" placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
              <button className="create-group-btn" onClick={() => setIsCreatingGroup(!isCreatingGroup)}>
                {isCreatingGroup ? 'Cancel' : 'Group'}
              </button>
            </div>
            
            {isCreatingGroup && (
              <div className="group-creation-panel">
                <input type="text" placeholder="Group Name" value={groupName} onChange={e => setGroupName(e.target.value)} />
                <div className="selected-users-chips">
                  {selectedUsers.map(u => (
                    <span key={u._id} className="user-chip" onClick={() => toggleUserSelection(u)}>
                      {u.name} ✕
                    </span>
                  ))}
                </div>
                {selectedUsers.length > 0 && <button className="submit-group-btn" onClick={handleCreateGroup}>Create</button>}
              </div>
            )}

            <div className="search-results-area">
              {(searchQuery.length < 2 ? suggestedUsers : searchResults).map(u => (
                <div key={u._id} className="search-result" onClick={() => isCreatingGroup ? toggleUserSelection(u) : startChat(u)}>
                  <Avatar user={u} size={32} isOnline={u.isOnline} />
                  <span>{u.name}</span>
                  {isCreatingGroup && (
                    <input type="checkbox" readOnly checked={!!selectedUsers.find(su => su._id === u._id)} />
                  )}
                </div>
              ))}
              {searchQuery.length < 2 && suggestedUsers.length > 0 && <div className="suggestions-label">Suggested Users</div>}
            </div>
          </div>
        )}

        <div className="chat-list">
          {conversations.map(chat => {
            const isGrp = chat.isGroupChat;
            const other = !isGrp ? chat.participants.find(p => String(p._id) !== String(user._id)) : null;
            const unread = unreadCounts[chat._id] || 0;
            const title = isGrp ? chat.chatName : other?.name;
            const isOnline = isGrp ? false : other?.isOnline;
            
            return (
              <div key={chat._id} className={`chat-item ${activeChat?._id === chat._id ? 'active' : ''}`} onClick={() => setActiveChat(chat)}>
                {isGrp ? (
                  <div className="chat-avatar initials" style={{ width: 48, height: 48, fontSize: 20 }}>{title?.charAt(0)?.toUpperCase()}</div>
                ) : (
                  <Avatar user={other} size={48} isOnline={isOnline} />
                )}
                <div className="chat-item-info">
                  <div className="chat-item-top">
                    <span className="name">{title}</span>
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
              {isGroup ? (
                 <div className="chat-avatar initials" style={{ width: 40, height: 40, fontSize: 16 }}>{chatTitle?.charAt(0)?.toUpperCase()}</div>
              ) : (
                <Link to={`/profile/${otherParticipant?._id}`} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                  <Avatar user={otherParticipant} size={40} isOnline={otherParticipant?.isOnline} />
                </Link>
              )}
              <div className="header-info">
                <h3>
                  {isGroup ? (
                    chatTitle
                  ) : (
                    <Link to={`/profile/${otherParticipant?._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {chatTitle}
                    </Link>
                  )}
                  {!isGroup && otherParticipant?.totalSales > 0 && <span className="verified" title="Verified Seller">✓</span>}
                </h3>
                <span className={`status ${typingUser ? 'typing-status' : ''}`}>
                  {typingUser ? `${typingUser.name} is typing…` : chatStatus}
                </span>
              </div>
              <div className="header-actions">
                <button title="Report/Block">⋮</button>
              </div>
            </div>

            <div className="messages-area">
              {messages.map((msg, idx) => {
                const isMine = String(msg.sender?._id || msg.sender) === String(user._id);
                const prevMsg = messages[idx - 1];
                const nextMsg = messages[idx + 1];
                const isFirstInGroup = !prevMsg || String(prevMsg.sender?._id || prevMsg.sender) !== String(msg.sender?._id || msg.sender);
                const isLastInGroup = !nextMsg || String(nextMsg.sender?._id || nextMsg.sender) !== String(msg.sender?._id || msg.sender);
                
                return (
                  <div 
                    key={msg._id} 
                    className={`message-row ${isMine ? 'mine' : 'theirs'} ${isFirstInGroup ? 'first' : ''} ${isLastInGroup ? 'last' : ''}`}
                    onMouseEnter={() => setHoveredMsg(msg._id)}
                    onMouseLeave={() => setHoveredMsg(null)}
                  >
                    {hoveredMsg === msg._id && !msg.isDeleted && (
                      <div className={`msg-actions ${isMine ? 'mine-actions' : 'theirs-actions'}`}>
                        <button onClick={() => handleReact(msg._id, '❤️')} title="Like">❤️</button>
                        <button onClick={() => setReplyingTo(msg)} title="Reply">↩️</button>
                        {isMine && <button onClick={() => handleUnsend(msg._id)} title="Unsend">🗑️</button>}
                      </div>
                    )}
                    
                    <div className="message-bubble" onDoubleClick={() => !msg.isDeleted && handleReact(msg._id, '❤️')}>
                      {msg.isDeleted ? (
                        <p className="deleted-text"><i>This message was unsent</i></p>
                      ) : (
                        <>
                          {isGroup && !isMine && msg.sender && isFirstInGroup && <div className="sender-name">{msg.sender.name}</div>}
                          {msg.replyTo && !msg.replyTo.isDeleted && (
                            <div className="quoted-msg">
                              <span className="quote-sender">{msg.replyTo.sender?.name || 'Someone'}</span>
                              <p>{msg.replyTo.text || 'Attachment'}</p>
                            </div>
                          )}
                          {msg.replyTo && msg.replyTo.isDeleted && (
                             <div className="quoted-msg deleted"><i>Original message was unsent</i></div>
                          )}
                          {msg.fileUrl ? (
                            msg.fileType === 'image' ? (
                               <img src={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${API_BASE_URL}${msg.fileUrl.startsWith('/') ? '' : '/'}${msg.fileUrl.replace(/\\/g, '/')}`} alt="attachment" className="msg-image" />
                            ) : (
                               <a href={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${API_BASE_URL}${msg.fileUrl.startsWith('/') ? '' : '/'}${msg.fileUrl.replace(/\\/g, '/')}`} target="_blank" rel="noreferrer" className="msg-pdf">📎 View Document</a>
                            )
                          ) : null}
                          {msg.text && <p>{msg.text}</p>}
                          
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="reactions-display">
                              {Object.values(msg.reactions).slice(0, 3).map((r, i) => <span key={i} className="react-icon">{r}</span>)}
                              {Object.keys(msg.reactions).length > 1 && <span className="react-count">{Object.keys(msg.reactions).length}</span>}
                            </div>
                          )}
                          
                          <div className="msg-meta">
                            <span>{formatTime(msg.createdAt)}</span>
                            {isMine && getReceiptIcon(msg, user._id, activeChat.participants)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* FIX 1: Typing bubble — shows INSIDE messages area like WhatsApp */}
              {typingUser && <TypingBubble name={typingUser.name} />}

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

            <div className="input-container">
              {replyingTo && (
                <div className="reply-preview">
                  <div className="reply-content">
                    <span className="reply-name">Replying to {replyingTo.sender?.name || 'Someone'}</span>
                    <p>{replyingTo.text || 'Attachment'}</p>
                  </div>
                  <button className="cancel-reply" onClick={() => setReplyingTo(null)}>✕</button>
                </div>
              )}
              <div className="input-area">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf" style={{display: 'none'}} />
                <button className="attach-btn" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                  {uploading ? '⏳' : '📎'}
                </button>
                <input type="text" value={inputText} onChange={handleTyping} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Message..." />
                <button className="send-btn" onClick={handleSend}>➤</button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
