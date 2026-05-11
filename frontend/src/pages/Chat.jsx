import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import API, { API_BASE_URL } from '../utils/api';
import {
  FiSearch, FiPhone, FiMoreVertical, FiArrowLeft, FiSettings,
  FiX, FiCheck, FiBell, FiShield, FiSliders, FiMaximize2, FiPhoneCall, FiSend
} from 'react-icons/fi';
import './Chat.css';

// ─── Highly strict dynamic time formatter
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
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

// ─── Centered Date Divider Capsule Formatter
const isDifferentDay = (d1, d2) => {
  if (!d1 || !d2) return true;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return date1.toDateString() !== date2.toDateString();
};

const formatDateSeparator = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};

// ─── Distinct Avatar Background Coloring per User
const AVATAR_COLORS = [
  { bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#ffffff' }, // Violet
  { bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#ffffff' }, // Blue
  { bg: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: '#ffffff' }, // Emerald
  { bg: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', color: '#ffffff' }, // Amber
  { bg: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', color: '#ffffff' }, // Pink
  { bg: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)', color: '#ffffff' }, // Cyan
];

const getAvatarStyle = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

// ─── Read Receipts
const getReceiptIcon = (msg, userId, privacyActive) => {
  if (privacyActive) return <span className="receipt sent" title="Sent privately">✓</span>;
  if (msg.readBy?.some(id => String(id) !== String(userId))) return <span className="receipt read" title="Read">✓✓</span>;
  if (msg.deliveredTo?.some(id => String(id) !== String(userId))) return <span className="receipt delivered" title="Delivered">✓✓</span>;
  return <span className="receipt sent" title="Sent">✓</span>;
};

// ─── Safely map attachment URLs
const getAttachmentUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const cleanUrl = url.replace(/\\/g, '/');
  return `${API_BASE_URL}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
};

// ─── Custom Click-Outside Hook (with Escape key support)
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, handler]);
}

// ─── Distinct Avatar Component
const Avatar = ({ user, size = 38, isOnline }) => {
  const [imgError, setImgError] = useState(false);
  const styleObj = getAvatarStyle(user?.name || '?');

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
        <img src={src} alt={user?.name} className="chat-avatar" onError={() => setImgError(true)} />
      ) : (
        <div className="chat-avatar initials" style={{ background: styleObj.bg, color: styleObj.color, fontSize: size * 0.45 }}>
          {initials}
        </div>
      )}
      {isOnline && <div className="online-dot-badge" />}
    </div>
  );
};

// ─── Animated Typing Dots
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

export default function Chat() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  // ─── Persistent Local Settings Mapping
  const defaultChatSettings = { muteAlerts: false, backdropAccent: 'dark', readReceiptPrivacy: false };
  const [chatSettings, setChatSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('app_chat_prefs');
      return stored ? JSON.parse(stored) : defaultChatSettings;
    } catch {
      return defaultChatSettings;
    }
  });

  const updateChatSetting = (key, value) => {
    setChatSettings(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('app_chat_prefs', JSON.stringify(updated));
      return updated;
    });
  };

  // ─── State buffers
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);

  // Layout overlays & dropdowns
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef(null);
  useOnClickOutside(headerMenuRef, () => setHeaderMenuOpen(false));

  // Audio streams & live call buffers
  const [activeCallPayload, setActiveCallPayload] = useState(null); // { incoming: bool, callerName: str, roomUrl: str }
  const ringtoneRef = useRef(null);

  // Search & Segment filters
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all', 'unread', 'buyers'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  // Interaction buffers
  const [typingUser, setTypingUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [uploading, setUploading] = useState(false);
  const [warningMsg, setWarningMsg] = useState(null);
  const [pendingForceSend, setPendingForceSend] = useState(''); // #2: original text before warning
  const [toast, setToast] = useState(null);

  // Groups buffer
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Insta quotes & hover bars
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredMsg, setHoveredMsg] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingEmittedRef = useRef(false);
  const isInitialScrollRef = useRef(true);
  const toastTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);

  const activeChatRef = useRef(null);
  useEffect(() => {
    activeChatRef.current = activeChat;
    isInitialScrollRef.current = true;
  }, [activeChat]);

  // Dynamic scroll mapping
  useEffect(() => {
    if (!messagesEndRef.current) return;
    if (isInitialScrollRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      setTimeout(() => { isInitialScrollRef.current = false; }, 100);
    } else {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
    };
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  // #18: Pooled Audio instance — avoids new Audio() on every notification (prevents memory leaks)
  const notificationAudioRef = useRef(null);
  const triggerSoundFeedback = useCallback((asset) => {
    if (chatSettings.muteAlerts) return;
    try {
      if (!notificationAudioRef.current || notificationAudioRef.current.src !== `/sounds/${asset}`) {
        notificationAudioRef.current = new Audio(`/sounds/${asset}`);
        notificationAudioRef.current.volume = 0.5;
      }
      notificationAudioRef.current.currentTime = 0;
      notificationAudioRef.current.play().catch(() => {});
    } catch { }
  }, [chatSettings.muteAlerts]);

  // ─── Fetch catalogs
  useEffect(() => {
    API.get('/chat/users/suggestions').then(res => setSuggestedUsers(res.data.users)).catch(() => { });
  }, []);

  const loadConversations = useCallback(async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const res = await API.get('/chat');
      setConversations(res.data.chats);
      const counts = {};
      res.data.chats.forEach(c => { counts[c._id] = c.unreadCounts?.[String(user._id)] || 0; });
      setUnreadCounts(counts);
    } catch (err) { console.error('Failed to load catalogs:', err); }
    finally { setLoading(false); }
  }, [user?._id]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Reconcile dropped socket frames automatically
  useEffect(() => {
    if (!socket) return;
    const onReconnect = () => {
      loadConversations();
      const current = activeChatRef.current;
      if (current) {
        API.get(`/chat/${current._id}/messages`)
          .then(r => setMessages(r.data.messages))
          .catch(() => { });
      }
    };
    socket.on('connect', onReconnect);
    return () => socket.off('connect', onReconnect);
  }, [socket, loadConversations]);

  // Load message buffers
  useEffect(() => {
    if (!activeChat?._id) return;
    const chatId = activeChat._id;
    const fetchMessages = async () => {
      try {
        setMsgLoading(true);
        const res = await API.get(`/chat/${chatId}/messages`);
        setMessages(res.data.messages);
      } catch (err) { console.error(err); }
      finally { setMsgLoading(false); }
    };
    fetchMessages();

    if (!chatSettings.readReceiptPrivacy) {
      API.put(`/chat/${chatId}/read`).catch(() => { });
    }
    setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));
    setTypingUser(null);
  }, [activeChat?._id, chatSettings.readReceiptPrivacy]);

  useEffect(() => {
    if (!socket || !activeChat?._id) return;
    socket.emit('join_chat', activeChat._id);
    if (!chatSettings.readReceiptPrivacy) {
      socket.emit('messages_delivered', { chatId: activeChat._id });
    }
    return () => { socket.emit('leave_chat', activeChat._id); };
  }, [socket, activeChat, chatSettings.readReceiptPrivacy]);

  // ─── Real-time Audio Call Signaling Listeners
  useEffect(() => {
    if (!socket || !user?._id) return;

    const handleIncomingCall = ({ callerName, roomUrl }) => {
      setActiveCallPayload({ incoming: true, callerName, roomUrl });
      if (!chatSettings.muteAlerts) {
        try {
          ringtoneRef.current = new Audio('/sounds/ringtone.mp3');
          ringtoneRef.current.loop = true;
          ringtoneRef.current.volume = 0.8;
          ringtoneRef.current.play().catch(() => { });
        } catch (e) { }
      }
    };

    socket.on('incoming_audio_call', handleIncomingCall);
    return () => { socket.off('incoming_audio_call', handleIncomingCall); };
  }, [socket, user?._id, chatSettings.muteAlerts]);

  // Real-time Message Event Listeners
  useEffect(() => {
    if (!socket || !user?._id) return;

    const onNewMessage = (msg) => {
      const currentChat = activeChatRef.current;
      if (currentChat && msg.chat === currentChat._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        if (!chatSettings.readReceiptPrivacy) {
          API.put(`/chat/${currentChat._id}/read`).catch(() => { });
          socket.emit('messages_delivered', { chatId: currentChat._id });
        }
      }
    };

    const onConversationUpdated = ({ chatId, lastMessage }) => {
      setConversations(prev => {
        const exists = prev.some(c => c._id === chatId);
        if (!exists) {
          // #4: fetch only the new conversation instead of full refetch
          API.get(`/chat/${chatId}`)
            .then(r => setConversations(p => [r.data.chat, ...p]))
            .catch(() => loadConversations()); // fallback
          return prev;
        }
        // #1: guard lastMessage.text against nested object shape
        const safeLastMsg = lastMessage
          ? {
              ...lastMessage,
              text: typeof lastMessage.text === 'string'
                ? lastMessage.text
                : lastMessage.text?.text ?? '',
            }
          : lastMessage;
        const updated = prev.map(c => c._id === chatId ? { ...c, lastMessage: safeLastMsg } : c);
        const chatIndex = updated.findIndex(c => c._id === chatId);
        if (chatIndex > 0) {
          const [moved] = updated.splice(chatIndex, 1);
          updated.unshift(moved);
        }
        return updated;
      });
      if (!activeChatRef.current || activeChatRef.current._id !== chatId) {
        setUnreadCounts(prev => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
        triggerSoundFeedback('notification.mp3');
      }
    };

    const onUserTyping = ({ userId, name }) => {
      if (String(userId) !== String(user._id)) setTypingUser({ userId, name });
    };
    const onUserStoppedTyping = ({ userId }) => {
      if (String(userId) !== String(user._id)) setTypingUser(null);
    };
    const onUserStatus = ({ userId, isOnline, lastSeen }) => {
      setConversations(prev => prev.map(c => {
        const pIndex = c.participants?.findIndex(p => String(p._id) === String(userId));
        if (pIndex > -1) {
          const newP = [...c.participants];
          newP[pIndex] = { ...newP[pIndex], isOnline, lastSeen };
          return { ...c, participants: newP };
        }
        return c;
      }));
      if (activeChatRef.current && activeChatRef.current.participants?.some(p => String(p._id) === String(userId))) {
        setActiveChat(prev => {
          if (!prev) return prev;
          const newP = prev.participants.map(p => String(p._id) === String(userId) ? { ...p, isOnline, lastSeen } : p);
          return { ...prev, participants: newP };
        });
      }
    };

    const onWarning = ({ text, originalText }) => {
      // #2: store the original text separately so force_send sends the real content
      setWarningMsg(text);
      setPendingForceSend(originalText || inputText);
    };

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

    socket.on('new_message', onNewMessage);
    socket.on('conversation_updated', onConversationUpdated);
    socket.on('user_typing', onUserTyping);
    socket.on('user_stopped_typing', onUserStoppedTyping);
    socket.on('user_status', onUserStatus);
    socket.on('personal_info_warning', onWarning);
    socket.on('messages_delivery_update', onMessagesDelivered);
    socket.on('message_reacted', onMessageReacted);
    socket.on('message_deleted', onMessageDeleted);

    // ── Real-time block/unblock status from backend broadcast
    const onBlockStatus = ({ chatId, blockedBy, isBlocked }) => {
      setConversations(prev => prev.map(c =>
        c._id === chatId ? { ...c, blockedBy: isBlocked ? blockedBy : null } : c
      ));
      if (activeChatRef.current?._id === chatId) {
        setActiveChat(prev => prev ? { ...prev, blockedBy: isBlocked ? blockedBy : null } : prev);
      }
    };
    socket.on('chat_block_status', onBlockStatus);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('conversation_updated', onConversationUpdated);
      socket.off('user_typing', onUserTyping);
      socket.off('user_stopped_typing', onUserStoppedTyping);
      socket.off('user_status', onUserStatus);
      socket.off('personal_info_warning', onWarning);
      socket.off('messages_delivery_update', onMessagesDelivered);
      socket.off('message_reacted', onMessageReacted);
      socket.off('message_deleted', onMessageDeleted);
      socket.off('chat_block_status', onBlockStatus);
    };
  }, [socket, user?._id, loadConversations, chatSettings.readReceiptPrivacy, chatSettings.muteAlerts]);

  // ─── Actions & Live Audio Signaling Emitter
  const initializeAudioCall = () => {
    if (!activeChat || !socket) return;
    const isGroup = activeChat.isGroupChat;
    const targetId = !isGroup ? activeChat.participants?.find(p => String(p._id) !== String(user?._id))?._id : null;

    // Generate a non-guessable room token: chatId prefix + random 8-char suffix
    const roomToken = Math.random().toString(36).slice(2, 10).toUpperCase();
    const dynamicRoomStr = `https://meet.jit.si/NM_${activeChat._id.slice(-6)}_${roomToken}`;

    if (targetId) {
      socket.emit('initiate_audio_call', { recipientId: targetId, callerName: user?.name, roomUrl: dynamicRoomStr });
    }

    setActiveCallPayload({ incoming: false, callerName: activeChat?.chatName || 'Peer', roomUrl: dynamicRoomStr });
  };

  const handleBlockToggle = async () => {
    if (!activeChat) return;
    setHeaderMenuOpen(false);
    const isCurrentlyBlocked = activeChat.blockedBy ? true : false;
    const currentChatId = activeChat._id;

    // Instantly apply client-side reconciliation before network resolves
    setConversations(prev => prev.map(c => {
      if (c._id === currentChatId) {
        return { ...c, blockedBy: !isCurrentlyBlocked ? user?._id : null };
      }
      return c;
    }));

    setActiveChat(prev => {
      if (!prev) return prev;
      return { ...prev, blockedBy: !isCurrentlyBlocked ? user?._id : null };
    });

    try {
      if (!isCurrentlyBlocked) {
        await API.post(`/chat/${currentChatId}/block`);
        showToast("Member blocked successfully", "success");
      } else {
        await API.delete(`/chat/${currentChatId}/block`);
        showToast("Member unblocked successfully", "success");
      }
    } catch (err) {
      // Revert optimistic state if network drops
      setConversations(prev => prev.map(c => {
        if (c._id === currentChatId) return { ...c, blockedBy: isCurrentlyBlocked ? user?._id : null };
        return c;
      }));
      setActiveChat(prev => prev ? { ...prev, blockedBy: isCurrentlyBlocked ? user?._id : null } : null);
      showToast("Network reconciliation failed", "error");
    }
  };

  const handleReact = async (msgId, emoji = '❤️') => {
    try { await API.post(`/chat/messages/${msgId}/react`, { emoji }); } catch (e) { console.error(e); }
  };

  const handleUnsend = async (msgId) => {
    try {
      await API.delete(`/chat/messages/${msgId}`);
      setHoveredMsg(null);
    } catch (e) { console.error(e); }
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !activeChat || !socket) return;
    socket.emit('send_message', { chatId: activeChat._id, text, replyTo: replyingTo?._id });
    setInputText('');
    setReplyingTo(null);
    isTypingEmittedRef.current = false;
    clearTimeout(typingTimeoutRef.current);
    socket.emit('typing_stop', { chatId: activeChat._id });
  };

  const handleForceSend = () => {
    // #2: send pendingForceSend (original input), not the warning string
    if (!pendingForceSend || !activeChat || !socket) return;
    socket.emit('force_send_message', { chatId: activeChat._id, text: pendingForceSend });
    setWarningMsg(null);
    setPendingForceSend('');
    setInputText('');
  };

  // Efficient network debouncing
  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (!socket || !activeChat) return;

    if (!isTypingEmittedRef.current) {
      isTypingEmittedRef.current = true;
      socket.emit('typing_start', { chatId: activeChat._id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingEmittedRef.current = false;
      socket.emit('typing_stop', { chatId: activeChat._id });
    }, 2500); // #19: 2500ms — avoids flicker on mobile autocorrect pauses
  };

  const sendQuickReply = (text) => {
    if (!activeChat || !socket) return;
    socket.emit('send_message', { chatId: activeChat._id, text, quickReply: text });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;
    if (file.size > 10 * 1024 * 1024) return showToast("File size must be under 10MB", "error");

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      await API.post(`/chat/${activeChat._id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (err) {
      console.error("Upload failed", err);
      showToast("Failed to upload file", "error");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  // Search buffering
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

  const chatStartedRef = useRef(false);
  useEffect(() => {
    if (location.state?.startChatWith && !chatStartedRef.current) {
      chatStartedRef.current = true;
      startChat(location.state.startChatWith);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const handleCreateGroup = async () => {
    if (selectedUsers.length < 1 || !groupName.trim()) return showToast('Select users and enter a group name', 'error');
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
      showToast('Failed to create group', 'error');
    }
  };

  const toggleUserSelection = (u) => {
    if (selectedUsers.find(su => su._id === u._id)) {
      setSelectedUsers(prev => prev.filter(su => su._id !== u._id));
    } else {
      setSelectedUsers(prev => [...prev, u]);
    }
  };

  // Segmenting conversations
  const filteredConversations = conversations.filter(c => {
    if (activeFilterTab === 'unread') return (unreadCounts[c._id] || 0) > 0;
    // 'buyers' tab: show only chats where the other participant has made a purchase (isBuyer flag)
    if (activeFilterTab === 'buyers') {
      const other = !c.isGroupChat ? c.participants?.find(p => String(p._id) !== String(user?._id)) : null;
      return other?.isBuyer === true;
    }
    return true;
  });

  // #7: memoized — avoids recreating filter chain on every render
  const displayedConversations = useMemo(() =>
    filteredConversations.filter(c => {
      if (!sidebarSearchQuery) return true;
      const isGrp = c.isGroupChat;
      const other = !isGrp ? c.participants?.find(p => String(p._id) !== String(user?._id)) : null;
      const title = isGrp ? c.chatName : other?.name;
      return title?.toLowerCase().includes(sidebarSearchQuery.toLowerCase());
    }),
    [filteredConversations, sidebarSearchQuery, user?._id]
  );

  const isGroup = activeChat?.isGroupChat;
  const otherParticipant = !isGroup ? activeChat?.participants?.find(p => String(p._id) !== String(user?._id)) : null;
  const chatTitle = isGroup ? activeChat.chatName : otherParticipant?.name;
  const chatStatus = isGroup
    ? `${activeChat.participants?.length || 0} participants`
    : (otherParticipant?.isOnline ? 'Online now' : `Last seen: ${otherParticipant?.lastSeen ? formatTime(otherParticipant.lastSeen) : 'N/A'}`);

  const isCurrentlyBlocked = activeChat?.blockedBy ? true : false;

  return (
    <div className={`chat-page-messenger accent-${chatSettings.backdropAccent}`}>
      {toast && (
        <div className={`fixed-toast-box ${toast.type}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* ─── LIVE CALLS DYNAMIC OVERLAY ─── */}
      <AnimatePresence>
        {activeCallPayload && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -50 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-[#1b1730] border-2 border-emerald-500/50 rounded-2xl p-5 shadow-2xl z-[200] w-11/12 max-w-md flex flex-col items-center gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
              <FiPhoneCall className="text-emerald-400 text-xl" />
            </div>
            <div className="text-center">
              <h4 className="text-white font-bold text-base">
                {activeCallPayload.incoming ? `Incoming Call from ${activeCallPayload.callerName}` : `Connecting with Peer...`}
              </h4>
              <p className="text-xs text-gray-400 mt-1">Establishing secure third-party integration line</p>
            </div>

            <div className="flex w-full gap-3 mt-2">
              <a
                href={activeCallPayload.roomUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
                  setActiveCallPayload(null);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs text-center block transition"
              >
                Accept Room Line
              </a>
              <button
                type="button"
                onClick={() => {
                  if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
                  setActiveCallPayload(null);
                }}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-xl text-xs transition"
              >
                Decline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────── SIDEBAR UPGRADES ──────── */}
      <aside className={`messenger-sidebar ${activeChat ? 'hidden-mobile' : ''}`}>
        <div className="sidebar-inbox-header">
          <span className="sidebar-inbox-title">
            Messages {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && <span className="unread-counter-pill">{Object.values(unreadCounts).reduce((a, b) => a + b, 0)}</span>}
          </span>
          <div className="sidebar-top-tools">
            <button type="button" className="action-circle-btn" onClick={() => setShowSettingsModal(true)} title="Chat settings panel">
              <FiSettings size={14} />
            </button>
            <button type="button" className="action-circle-btn" onClick={() => setShowSearch(!showSearch)} title="New chat connection">
              ✏️
            </button>
          </div>
        </div>

        {/* MOCKUP SEARCH BAR */}
        <div className="sidebar-search-capsule">
          <FiSearch className="search-glass-icon" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={sidebarSearchQuery}
            onChange={e => setSidebarSearchQuery(e.target.value)}
          />
        </div>

        {/* MOCKUP FILTER TABS */}
        <div className="sidebar-filter-tabs">
          <button
            type="button"
            className={`filter-tab-pill ${activeFilterTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilterTab('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`filter-tab-pill ${activeFilterTab === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveFilterTab('unread')}
          >
            Unread
          </button>
          <button
            type="button"
            className={`filter-tab-pill ${activeFilterTab === 'buyers' ? 'active' : ''}`}
            onClick={() => setActiveFilterTab('buyers')}
          >
            Buyers
          </button>
        </div>

        {/* Creation panels */}
        {showSearch && (
          <div className="inbox-search-creations">
            <div className="search-header-group">
              <input type="text" placeholder="Lookup members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
              <button type="button" className="create-group-btn" onClick={() => setIsCreatingGroup(!isCreatingGroup)}>
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
                {selectedUsers.length > 0 && <button type="button" className="submit-group-btn" onClick={handleCreateGroup}>Create</button>}
              </div>
            )}

            <div className="search-results-area">
              {(searchQuery.length < 2 ? suggestedUsers : searchResults).map(u => (
                <div key={u._id} className="search-result" onClick={() => isCreatingGroup ? toggleUserSelection(u) : startChat(u)}>
                  <Avatar user={u} size={32} isOnline={u.isOnline} />
                  <span>{u.name}</span>
                  {isCreatingGroup && <input type="checkbox" readOnly checked={!!selectedUsers.find(su => su._id === u._id)} />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="inbox-contacts-flow">
          {displayedConversations.map(chat => {
            const isGrp = chat.isGroupChat;
            const other = !isGrp ? chat.participants?.find(p => String(p._id) !== String(user?._id)) : null;
            const unread = unreadCounts[chat._id] || 0;
            const title = isGrp ? chat.chatName : other?.name;
            const isOnline = isGrp ? false : other?.isOnline;
            const isBlockedLocal = chat.blockedBy ? true : false;

            return (
              <div key={chat._id} className={`contact-entry-row ${activeChat?._id === chat._id ? 'active' : ''} ${isBlockedLocal ? 'muted-local-row' : ''}`} onClick={() => setActiveChat(chat)}>
                <Avatar user={other || { name: title }} size={38} isOnline={isOnline} />

                <div className="contact-metadata-left">
                  <div className="contact-title-top">
                    <span className="contact-name-label">{title || 'Member'} {isBlockedLocal && <span className="local-blocked-tag">BLOCKED</span>}</span>
                    <span className="contact-timestamp-label">{chat.lastMessage?.sentAt && formatTime(chat.lastMessage.sentAt)}</span>
                  </div>
                  <div className="contact-preview-label">
                    {/* #1: guard against object-shaped lastMessage.text */}
                    {chat.lastMessage?.type === 'file'
                      ? '📎 File attached'
                      : (typeof chat.lastMessage?.text === 'string'
                          ? chat.lastMessage.text
                          : chat.lastMessage?.text?.text ?? 'No messages yet')}
                  </div>
                </div>
                {unread > 0 && (
                  <div className="contact-metadata-right">
                    <span className="unread-dot-badge">{unread}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ──────── MAIN PANEL: Chat Header & Messages ──────── */}
      <main className={`messenger-main-flow ${!activeChat ? 'hidden-mobile' : ''}`}>
        {!activeChat ? (
          <div className="welcome-placeholder-capsule">
            <span className="welcome-icon-glass">💬</span>
            <h2>Select a conversation to begin messaging</h2>
          </div>
        ) : (
          <>
            {/* MOCKUP CHAT HEADER */}
            <div className="chat-window-header">
              <button type="button" className="back-arrow-btn" onClick={() => setActiveChat(null)}>
                <FiArrowLeft size={18} />
              </button>

              <div className="header-avatar-frame">
                <Avatar user={otherParticipant || { name: chatTitle }} size={36} isOnline={false} />
              </div>

              <div className="header-member-details">
                <div className="header-title-box">
                  <span className="header-name-text">{chatTitle}</span>
                  {!isGroup && otherParticipant?.totalSales > 0 && <span className="verified-tick" title="Verified Seller">✓</span>}
                </div>
                <div className="header-status-text">
                  {typingUser ? (
                    <span className="typing-active-text">● {typingUser.name} is typing…</span>
                  ) : (
                    <span className={otherParticipant?.isOnline ? 'online-now-text' : ''}>
                      {otherParticipant?.isOnline ? '● Online now' : chatStatus}
                    </span>
                  )}
                </div>
              </div>

              {/* QUICK-ACTION TOOLS W/ DYNAMIC MENUS */}
              <div className="header-action-tools relative">
                <button
                  type="button"
                  className="action-circle-btn"
                  onClick={initializeAudioCall}
                  title="Initialize third-party audio stream room"
                >
                  <FiPhone size={14} />
                </button>
                <button
                  type="button"
                  className="action-circle-btn"
                  onClick={() => showToast("Search panel active", "success")}
                  title="Search inside messages"
                >
                  <FiSearch size={14} />
                </button>

                <div className="relative inline-block" ref={headerMenuRef}>
                  <button
                    type="button"
                    className="action-circle-btn"
                    onClick={() => setHeaderMenuOpen(prev => !prev)}
                    title="Open actions overlay"
                  >
                    <FiMoreVertical size={14} />
                  </button>

                  {/* Dynamic Dropdown Positioning */}
                  <AnimatePresence>
                    {headerMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 top-10 w-44 bg-[#1b1730] border border-white/10 rounded-xl py-2 shadow-2xl z-50 flex flex-col items-start"
                      >
                        <button
                          type="button"
                          onClick={handleBlockToggle}
                          className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-white/5 transition flex items-center gap-2 text-red-400"
                        >
                          <FiShield /> {isCurrentlyBlocked ? 'Unblock Member' : 'Block Member'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setHeaderMenuOpen(false); showToast("Conversation muted locally", "success"); }}
                          className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/5 transition flex items-center gap-2 text-gray-300"
                        >
                          <FiBell /> Mute Notifications
                        </button>
                        <button
                          type="button"
                          onClick={() => { setHeaderMenuOpen(false); setShowSettingsModal(true); }}
                          className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/5 transition flex items-center gap-2 text-gray-300 border-t border-white/5 mt-1 pt-2"
                        >
                          <FiSliders /> Environment Theme
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* ──────── MESSAGES BUFFER ──────── */}
            {/* #12: aria-live so screen readers announce incoming messages */}
            <div className="chat-messages-scroll-area" aria-live="polite" aria-atomic="false">
              {msgLoading && <div className="loading-banner-pill">Loading conversation...</div>}

              {messages.map((msg, idx) => {
                const isMine = String(msg.sender?._id || msg.sender) === String(user?._id);
                const prevMsg = messages[idx - 1];
                const nextMsg = messages[idx + 1];
                const isFirstInGroup = !prevMsg || String(prevMsg.sender?._id || prevMsg.sender) !== String(msg.sender?._id || msg.sender);
                const isLastInGroup = !nextMsg || String(nextMsg.sender?._id || nextMsg.sender) !== String(msg.sender?._id || msg.sender);

                // CENTERED DATE SEPARATOR PILLS
                const showDateSeparator = idx === 0 || isDifferentDay(prevMsg?.createdAt, msg.createdAt);
                const isImg = msg.fileType === 'image' || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(msg.fileUrl || '');
                const isRichNote = msg.noteMetadata || (msg.text && msg.text.includes('pages · ₹'));

                return (
                  <div key={msg._id} className="message-container-block">
                    {showDateSeparator && (
                      <div className="chat-date-separator-pill">
                        <span>{formatDateSeparator(msg.createdAt)}</span>
                      </div>
                    )}

                    <div
                      id={`msg-${msg._id}`}
                      className={`message-row ${isMine ? 'sent' : 'recv'} ${isFirstInGroup ? 'first' : ''} ${isLastInGroup ? 'last' : ''}`}
                      onMouseEnter={() => setHoveredMsg(msg._id)}
                      onMouseLeave={() => setHoveredMsg(null)}
                    >
                      {/* SUBTLE SENDER AVATAR INLINE FOR RECEIVED MESSAGES */}
                      {!isMine && isLastInGroup && (
                        <div className="inline-message-avatar">
                          <Avatar user={msg.sender || otherParticipant} size={28} isOnline={false} />
                        </div>
                      )}
                      {!isMine && !isLastInGroup && (
                        <div className="inline-message-avatar-placeholder" style={{ width: 28 }} />
                      )}

                      {hoveredMsg === msg._id && !msg.isDeleted && (
                        <div className={`msg-actions ${isMine ? 'mine-actions' : 'theirs-actions'}`}>
                          <div className="emoji-reaction-bar">
                            {['❤️', '👍', '😂', '🔥', '👏'].map(emoji => (
                              <button type="button" key={emoji} onClick={() => handleReact(msg._id, emoji)} title={`React ${emoji}`}>
                                {emoji}
                              </button>
                            ))}
                          </div>
                          <button type="button" onClick={() => { setReplyingTo(msg); textInputRef.current?.focus(); }} title="Reply">↩️</button>
                          {isMine && <button type="button" onClick={() => handleUnsend(msg._id)} title="Unsend" className="delete-btn">🗑️</button>}
                        </div>
                      )}

                      <div className="message-bubble" onDoubleClick={() => !msg.isDeleted && handleReact(msg._id, '❤️')}>
                        {msg.isDeleted ? (
                          <p className="deleted-text"><i>This message was unsent</i></p>
                        ) : (
                          <>
                            {isGroup && !isMine && msg.sender && isFirstInGroup && <div className="sender-name">{msg.sender.name}</div>}

                            {/* Clickable Quoted Preview Box */}
                            {msg.replyTo && !msg.replyTo.isDeleted && (
                              <div
                                className="quoted-msg clickable"
                                onClick={() => {
                                  const targetEl = document.getElementById(`msg-${msg.replyTo._id}`);
                                  if (targetEl) {
                                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    targetEl.classList.add('highlight-flash');
                                    setTimeout(() => targetEl.classList.remove('highlight-flash'), 1500);
                                  }
                                }}
                              >
                                <span className="quote-sender">{msg.replyTo.sender?.name || 'Member'}</span>
                                <p>{msg.replyTo.text || (msg.replyTo.fileUrl ? '📎 Attachment' : 'Message')}</p>
                              </div>
                            )}

                            {/* RICH NOTE CARDS RENDERED INLINE */}
                            {isRichNote ? (
                              <div className="rich-note-preview-card">
                                <div className="rich-note-icon">📄</div>
                                <div className="rich-note-details">
                                  <div className="rich-nt">{msg.noteMetadata?.title || msg.text?.split('\n')[0] || 'Shared Material'}</div>
                                  <div className="rich-ns">
                                    {msg.noteMetadata?.pages || '48'} pages · ₹{msg.noteMetadata?.price || '120'}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              msg.fileUrl ? (
                                isImg ? (
                                  <div className="msg-image-wrapper">
                                    <img src={getAttachmentUrl(msg.fileUrl)} alt="attachment" className="msg-image" />
                                    <a href={getAttachmentUrl(msg.fileUrl)} target="_blank" rel="noopener noreferrer" className="download-overlay" title="Open full size"><FiMaximize2 /></a>
                                  </div>
                                ) : (
                                  <a href={getAttachmentUrl(msg.fileUrl)} target="_blank" rel="noopener noreferrer" className="msg-pdf">📎 View Document</a>
                                )
                              ) : null
                            )}

                            {!isRichNote && msg.text && <p>{msg.text}</p>}

                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className="reactions-display">
                                {Object.values(msg.reactions).slice(0, 3).map((r, i) => <span key={i} className="react-icon">{r}</span>)}
                                {Object.keys(msg.reactions).length > 1 && <span className="react-count">{Object.keys(msg.reactions).length}</span>}
                              </div>
                            )}

                            <div className="msg-meta">
                              <span>{formatTime(msg.createdAt)}</span>
                              {isMine && getReceiptIcon(msg, user?._id, chatSettings.readReceiptPrivacy)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {typingUser && <TypingBubble name={typingUser.name} />}
              <div ref={messagesEndRef} />
            </div>

            {/* PILL-SHAPED QUICK REPLIES — show for first 3 messages or after 2+ days idle */}
            {(messages.length < 3 || (messages.length > 0 && (Date.now() - new Date(messages[messages.length - 1]?.createdAt)) > 172800000)) && !isCurrentlyBlocked && (
              <div className="quick-replies-tray">
                <button type="button" className="quick-reply-pill" onClick={() => sendQuickReply("Is this note still available?")}>
                  👋 Is this available?
                </button>
                <button type="button" className="quick-reply-pill" onClick={() => sendQuickReply("Can you share a sample page?")}>
                  📄 Share sample
                </button>
                <button type="button" className="quick-reply-pill" onClick={() => sendQuickReply("Can we negotiate the price?")}>
                  💰 Discuss price
                </button>
              </div>
            )}

            {warningMsg && (
              <div className="warning-banner">
                <p>⚠️ <strong>Safety Warning:</strong> Sharing phone numbers or UPI IDs is against our policy and can lead to fraud.</p>
                <button type="button" onClick={handleForceSend}>Send Anyway</button>
                <button type="button" onClick={() => setWarningMsg(null)}>Cancel</button>
              </div>
            )}

            {/* ──────── CONDITIONAL CLIENT BLOCKING MUTE OVERLAY ──────── */}
            {isCurrentlyBlocked ? (
              <div className="p-4 bg-[#0d0b1a] border-t border-white/5 text-center flex items-center justify-center gap-2 text-red-400 font-semibold text-xs">
                <FiShield /> You have blocked this member. Intercom communications are currently suppressed.
              </div>
            ) : (
              <div className="chat-input-wrapper-embedded">
                {replyingTo && (
                  <div className="reply-preview">
                    <div className="reply-content">
                      <span className="reply-name">Replying to {replyingTo.sender?.name || 'Member'}</span>
                      <p>{replyingTo.text || 'Attachment'}</p>
                    </div>
                    <button type="button" className="cancel-reply" onClick={() => setReplyingTo(null)}>✕</button>
                  </div>
                )}

                {/* GROUP ATTACHMENTS, EMOJI, AND MIC TOOLS INSIDE THE INPUT FIELD */}
                <div className="embedded-input-container">
                  <div className="embedded-tools-left">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="embedded-tool-btn"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Attach document or image"
                      title="Attach image or PDF only"
                      disabled={uploading}
                    >
                      {uploading ? '⏳' : '📎'}
                    </button>
                    {/* #14: format hint so users know .docx etc. are rejected */}
                    <span className="text-[10px] text-gray-600 hidden sm:inline leading-none">img/PDF</span>
                    {/* Emoji picker — hidden until emoji-picker-react is installed */}
                  </div>

                  <input
                    type="text"
                    ref={textInputRef}
                    value={inputText}
                    onChange={handleTyping}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a secure message..."
                    className="embedded-text-field"
                  />

                  {/* Voice recording — hidden until MediaRecorder API is implemented */}
                  <div className="embedded-tools-right" />
                </div>

                {/* #17: FiSend SVG — crisp at all DPIs, replaces Unicode ➤ */}
                <button
                  type="button"
                  className="circular-send-btn"
                  onClick={handleSend}
                  aria-label="Submit typed message block"
                  title="Send Message"
                >
                  <FiSend size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ─── PERSISTENT LOCAL CHAT SETTINGS PANEL ─── */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowSettingsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-[#1b1730] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <FiSettings className="text-violet-400" /> Messenger Environment Prefs
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <FiX size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {/* Toggle 1: Mute Audio Loops */}
                <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                  <div>
                    <label className="text-white text-xs font-semibold block">Mute Notifications</label>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Suppress real-time incoming signaling loops</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateChatSetting('muteAlerts', !chatSettings.muteAlerts)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${chatSettings.muteAlerts ? 'bg-violet-600' : 'bg-white/10'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${chatSettings.muteAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Toggle 2: Read Receipts Protection */}
                <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                  <div>
                    <label className="text-white text-xs font-semibold block">Read Receipt Privacy</label>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Prevent broadcasting delivered/read socket frames</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateChatSetting('readReceiptPrivacy', !chatSettings.readReceiptPrivacy)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${chatSettings.readReceiptPrivacy ? 'bg-emerald-600' : 'bg-white/10'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${chatSettings.readReceiptPrivacy ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Select 3: Messenger Backdrop Contrast */}
                <div className="flex flex-col bg-black/20 p-3 rounded-xl border border-white/5 gap-2">
                  <label className="text-white text-xs font-semibold block">Backdrop Theme Contrast</label>
                  <select
                    value={chatSettings.backdropAccent}
                    onChange={e => updateChatSetting('backdropAccent', e.target.value)}
                    className="w-full bg-[#0b0914] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-violet-500"
                  >
                    <option value="dark">Charcoal Ambient Dark</option>
                    <option value="violet">Deep Violet Spectrum</option>
                    <option value="graphite">Soft Contrast Graphite</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition"
              >
                <FiCheck /> Save Preferences
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}