import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import API, { API_BASE_URL } from '../utils/api';
import MessageInput from './chat/components/MessageInput';
import MessageBubble from './chat/components/MessageBubble';
import ChatSidebar from './chat/components/ChatSidebar';
import ChatHeader from './chat/components/ChatHeader';
import CallOverlay from './chat/components/CallOverlay';
import SettingsModal from './chat/components/SettingsModal';
import ProfileSidebar from './chat/components/ProfileSidebar';
import { Virtuoso } from 'react-virtuoso';
import './Chat.css';

// 🚀 DYNAMIC ADMIN IDENTIFICATION
export const ADMIN_ID = "69ea4e321025725313352f9f";
export const ADMIN_PROFILE = {
  _id: ADMIN_ID,
  name: "Dev Kumar (Admin)",
  avatar: null, 
  isOnline: true,
  role: "admin"
};

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
  const [, setLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);

  // Layout overlays & dropdowns
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileSidebar, setShowProfileSidebar] = useState(false);
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
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState('');

  // Interaction buffers
  const [typingUser, setTypingUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [uploading, setUploading] = useState(false);
  const [warningMsg, setWarningMsg] = useState(null);
  const [pendingForceSend, setPendingForceSend] = useState(''); // #2: original text before warning
  const [toast, setToast] = useState(null);

  // Groups buffer
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Insta quotes & hover bars
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredMsg, setHoveredMsg] = useState(null);

  const typingTimeoutRef = useRef(null);
  const isTypingEmittedRef = useRef(false);
  const isInitialScrollRef = useRef(true);
  const toastTimerRef = useRef(null);
  const textInputRef = useRef(null);
  const longPressTimerRef = useRef(null);

  const activeChatRef = useRef(null);
  const inputTextRef = useRef(inputText);
  inputTextRef.current = inputText;
  useEffect(() => {
    activeChatRef.current = activeChat;
    isInitialScrollRef.current = true;
    // Reset viewport scroll on chat switch — prevents orientation glitch on mobile
    window.scrollTo(0, 0);
  }, [activeChat]);



  // iOS visualViewport keyboard fix — prevents input area jumping out of view
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleResize = () => {
      // When keyboard opens, scroll the page back to top of viewport
      // so the input area stays anchored
      if (document.activeElement?.classList.contains('embedded-text-field')) {
        document.activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    };
    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      // Bulletproof audio cleanup — clears src to release media handles
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.src = '';
        ringtoneRef.current = null;
      }
      if (notificationAudioRef.current) {
        notificationAudioRef.current.pause();
        notificationAudioRef.current.src = '';
        notificationAudioRef.current = null;
      }
    };
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  // #18: Pooled Audio instance — avoids new Audio() on every notification (prevents memory leaks)
  const notificationAudioRef = useRef(null);
  const currentAssetRef = useRef(null);
  const triggerSoundFeedback = useCallback((asset) => {
    if (chatSettings.muteAlerts) return;
    try {
      if (!notificationAudioRef.current || currentAssetRef.current !== asset) {
        notificationAudioRef.current = new Audio(`/sounds/${asset}`);
        notificationAudioRef.current.volume = 0.5;
        currentAssetRef.current = asset;
      }
      notificationAudioRef.current.currentTime = 0;
      notificationAudioRef.current.play().catch(() => {});
    } catch { }
  }, [chatSettings.muteAlerts]);

  // ─── Fetch catalogs


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
          // Replace optimistic message if it exists
          if (msg.tempId) {
            return prev.map(m => m.tempId === msg.tempId ? msg : m);
          }
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
      setPendingForceSend(originalText || inputTextRef.current);
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
  }, [socket, user?._id, loadConversations, chatSettings.readReceiptPrivacy, chatSettings.muteAlerts, triggerSoundFeedback]);

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
    const wasBlocked = activeChat.blockedBy ? true : false;
    const currentChatId = activeChat._id;

    // Instantly apply client-side reconciliation before network resolves
    setConversations(prev => prev.map(c => {
      if (c._id === currentChatId) {
        return { ...c, blockedBy: !wasBlocked ? user?._id : null };
      }
      return c;
    }));

    setActiveChat(prev => {
      if (!prev) return prev;
      return { ...prev, blockedBy: !wasBlocked ? user?._id : null };
    });

    try {
      if (!wasBlocked) {
        await API.post(`/chat/${currentChatId}/block`);
        showToast("Member blocked successfully", "success");
      } else {
        await API.delete(`/chat/${currentChatId}/block`);
        showToast("Member unblocked successfully", "success");
      }
    } catch (err) {
      // Revert optimistic state if network drops
      setConversations(prev => prev.map(c => {
        if (c._id === currentChatId) return { ...c, blockedBy: wasBlocked ? user?._id : null };
        return c;
      }));
      setActiveChat(prev => prev ? { ...prev, blockedBy: wasBlocked ? user?._id : null } : null);
      showToast("Network reconciliation failed", "error");
    }
  };

  const handleReact = async (msgId, emoji = '❤️') => {
    try { await API.post(`/chat/messages/${msgId}/react`, { emoji }); } catch (e) { console.error(e); }
  };

  const handleUnsend = async (msgId) => {
    try {
      setMessages(prev => prev.map(m => 
        m._id === msgId 
          ? { ...m, isDeleted: true, text: '', fileUrl: null } 
          : m 
      ));
      setHoveredMsg(null);
      await API.delete(`/chat/messages/${msgId}`);
    } catch (e) { console.error(e); }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !activeChat || !socket) return;

    let targetChatId = activeChat._id;

    // 🚀 THE FIX: Intercept Virtual Chat & Create Real Chat in DB
    if (targetChatId === "virtual_admin_chat") {
      try {
        setMsgLoading(true); // Optional: show loading while creating
        // Make sure ADMIN_ID variable is accessible here (defined at the top of your file)
        const res = await API.post('/chat', { recipientId: ADMIN_ID }); 
        const realChat = res.data.chat;
        targetChatId = realChat._id;

        // Update UI states to replace fake chat with real chat
        setActiveChat(realChat);
        setConversations(prev => {
          const cleanList = prev.filter(c => c._id !== "virtual_admin_chat");
          // Prevent duplicates if it already exists
          return cleanList.find(c => c._id === realChat._id) ? cleanList : [realChat, ...cleanList];
        });
      } catch (err) {
        console.error("Failed to initialize real admin chat", err);
        showToast("Could not connect to Admin database. Try again.", "error");
        setMsgLoading(false);
        return; // Stop execution if DB fails
      } finally {
        setMsgLoading(false);
      }
    }

    // --- STANDARD OPTIMISTIC UI LOGIC (Now using real targetChatId) ---
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      tempId,
      chat: targetChatId, // Use the real ID here!
      sender: user,
      text,
      createdAt: new Date().toISOString(),
      pending: true,
      replyTo: replyingTo
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    // Send via socket using the real ID
    socket.emit('send_message', { chatId: targetChatId, text, replyTo: replyingTo?._id, tempId });
    
    setInputText('');
    setReplyingTo(null);
    isTypingEmittedRef.current = false;
    clearTimeout(typingTimeoutRef.current);
    socket.emit('typing_stop', { chatId: targetChatId });

    // Handle failure simulation
    setTimeout(() => {
      setMessages(prev => prev.map(m => {
        if (m.tempId === tempId && m.pending) {
          return { ...m, pending: false, failed: true };
        }
        return m;
      }));
    }, 5000);
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
    if (!text || !activeChat || !socket) return;

    // Optimistic UI update (same as handleSend)
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      tempId,
      chat: activeChat._id,
      sender: user,
      text,
      createdAt: new Date().toISOString(),
      pending: true,
      replyTo: replyingTo
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    socket.emit('send_message', { chatId: activeChat._id, text, replyTo: replyingTo?._id, tempId, quickReply: text });
    setReplyingTo(null);
    isTypingEmittedRef.current = false;
    clearTimeout(typingTimeoutRef.current);
    socket.emit('typing_stop', { chatId: activeChat._id });

    // Handle failure simulation
    setTimeout(() => {
      setMessages(prev => prev.map(m => {
        if (m.tempId === tempId && m.pending) {
          return { ...m, pending: false, failed: true };
        }
        return m;
      }));
    }, 5000);
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

  const startChat = useCallback(async (recipient) => {
    try {
      const res = await API.post('/chat', { recipientId: recipient._id });
      const newChat = res.data.chat;
      setConversations(prev => prev.find(c => c._id === newChat._id) ? prev : [newChat, ...prev]);
      setActiveChat(newChat);
      setShowSearch(false);
      setSearchQuery('');
    } catch (e) { console.error(e); }
  }, []);

  const chatStartedRef = useRef(false);
  useEffect(() => {
    if (location.state?.startChatWith && !chatStartedRef.current) {
      chatStartedRef.current = true;
      startChat(location.state.startChatWith);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, startChat]);

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
  const filteredConversations = useMemo(() => conversations.filter(c => {
    if (activeFilterTab === 'unread') return (unreadCounts[c._id] || 0) > 0;
    // 'buyers' tab: show only chats where the other participant has made a purchase (isBuyer flag)
    if (activeFilterTab === 'buyers') {
      const other = !c.isGroupChat ? c.participants?.find(p => String(p._id) !== String(user?._id)) : null;
      return other?.isBuyer === true;
    }
    return true;
  }), [conversations, activeFilterTab, unreadCounts, user?._id]);

  // #7: memoized — avoids recreating filter chain on every render
  const displayedConversations = useMemo(() => {
    let list = filteredConversations.filter(c => {
      if (!sidebarSearchQuery) return true;
      const isGrp = c.isGroupChat;
      const other = !isGrp ? c.participants?.find(p => String(p._id) !== String(user?._id)) : null;
      const title = isGrp ? c.chatName : other?.name;
      return title?.toLowerCase().includes(sidebarSearchQuery.toLowerCase());
    });

    // 🚀 ADMIN PIN LOGIC: Inject Admin at Top for everyone except Admin himself
    if (user && String(user._id) !== String(ADMIN_ID)) {
      const existingAdminChatIndex = list.findIndex(c => 
        !c.isGroupChat && c.participants?.some(p => String(p._id) === String(ADMIN_ID))
      );

      let adminChatObj;

      if (existingAdminChatIndex > -1) {
        // Chat exists, extract it
        adminChatObj = { ...list[existingAdminChatIndex], isPinnedAdmin: true };
        list.splice(existingAdminChatIndex, 1);
      } else {
        // Virtual Chat (If user hasn't talked to you yet)
        adminChatObj = {
          _id: "virtual_admin_chat",
          isGroupChat: false,
          participants: [user, ADMIN_PROFILE],
          lastMessage: { text: "👋 Welcome! How can I help you today?", createdAt: new Date().toISOString() },
          isPinnedAdmin: true,
        };
      }
      
      // Unshift puts it at Index 0 (Top)
      list.unshift(adminChatObj);
    }

    return list;
  }, [filteredConversations, sidebarSearchQuery, user?._id]);

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
      <CallOverlay 
        activeCallPayload={activeCallPayload} 
        setActiveCallPayload={setActiveCallPayload} 
        ringtoneRef={ringtoneRef} 
      />

      {/* ──────── SIDEBAR UPGRADES ──────── */}
      <ChatSidebar
        activeChat={activeChat}
        setActiveChat={setActiveChat}
        unreadCounts={unreadCounts}
        setShowSettingsModal={setShowSettingsModal}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        sidebarSearchQuery={sidebarSearchQuery}
        setSidebarSearchQuery={setSidebarSearchQuery}
        activeFilterTab={activeFilterTab}
        setActiveFilterTab={setActiveFilterTab}
        conversations={displayedConversations}
        user={user}
        Avatar={Avatar}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        startChat={startChat}
        isCreatingGroup={isCreatingGroup}
        setIsCreatingGroup={setIsCreatingGroup}
        groupName={groupName}
        setGroupName={setGroupName}
        selectedUsers={selectedUsers}
        handleCreateGroup={handleCreateGroup}
        toggleUserSelection={toggleUserSelection}
      />

      {/* ──────── MAIN PANEL: Chat Header & Messages ──────── */}
      <main className={`messenger-main-flow ${!activeChat ? 'hidden-mobile' : ''}`}>
        {!activeChat ? (
          <div className="welcome-placeholder-capsule">
            <span className="welcome-icon-glass">💬</span>
            <h2>Select a conversation to begin messaging</h2>
          </div>
        ) : (
          <>
            <ChatHeader
              activeChat={activeChat}
              user={user}
              typingUser={typingUser}
              Avatar={Avatar}
              setActiveChat={setActiveChat}
              initializeAudioCall={initializeAudioCall}
              showToast={showToast}
              headerMenuOpen={headerMenuOpen}
              setHeaderMenuOpen={setHeaderMenuOpen}
              headerMenuRef={headerMenuRef}
              handleBlockToggle={handleBlockToggle}
              setShowSettingsModal={setShowSettingsModal}
              showMsgSearch={showMsgSearch}
              setShowMsgSearch={setShowMsgSearch}
              msgSearchQuery={msgSearchQuery}
              setMsgSearchQuery={setMsgSearchQuery}
              onViewProfile={() => setShowProfileSidebar(true)}
            />

            {/* ──────── MESSAGES BUFFER ──────── */}
            {/* #12: aria-live so screen readers announce incoming messages */}
            <div className="chat-messages-scroll-area" aria-live="polite" aria-atomic="false">
              {msgLoading && <div className="loading-banner-pill">Loading conversation...</div>}

              <Virtuoso
                style={{ height: '100%', width: '100%' }}
                data={(() => {
                  const displayed = showMsgSearch && msgSearchQuery 
                    ? messages.filter(m => m.text?.toLowerCase().includes(msgSearchQuery.toLowerCase())) 
                    : messages;
                  return displayed;
                })()}
                initialTopMostItemIndex={(() => {
                  const displayed = showMsgSearch && msgSearchQuery 
                    ? messages.filter(m => m.text?.toLowerCase().includes(msgSearchQuery.toLowerCase())) 
                    : messages;
                  return displayed.length - 1;
                })()}
                followOutput="smooth"
                alignToBottom
                itemContent={(idx, msg) => {
                  const displayed = showMsgSearch && msgSearchQuery 
                    ? messages.filter(m => m.text?.toLowerCase().includes(msgSearchQuery.toLowerCase())) 
                    : messages;
                  const isMine = String(msg.sender?._id || msg.sender) === String(user?._id);
                  const prevMsg = displayed[idx - 1];
                  const nextMsg = displayed[idx + 1];
                  const isFirstInGroup = !prevMsg || String(prevMsg.sender?._id || prevMsg.sender) !== String(msg.sender?._id || msg.sender);
                  const isLastInGroup = !nextMsg || String(nextMsg.sender?._id || nextMsg.sender) !== String(msg.sender?._id || msg.sender);

                  const showDateSeparator = idx === 0 || isDifferentDay(prevMsg?.createdAt, msg.createdAt);

                  return (
                    <div key={msg.tempId || msg._id} className="message-container-block">
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
                        onTouchStart={(e) => {
                          longPressTimerRef.current = setTimeout(() =>
                            e.currentTarget.classList.add('touch-active'), 500);
                        }}
                        onTouchEnd={(e) => {
                          clearTimeout(longPressTimerRef.current);
                          e.currentTarget.classList.remove('touch-active');
                        }}
                      >
                        {!isMine && isLastInGroup && (
                          <div className="inline-message-avatar">
                            <Avatar user={msg.sender || otherParticipant} size={28} isOnline={false} />
                          </div>
                        )}
                        {!isMine && !isLastInGroup && (
                          <div className="inline-message-avatar-placeholder" style={{ width: 28 }} />
                        )}

                        {hoveredMsg === msg._id && !msg.isDeleted && !msg.pending && (
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

                        <MessageBubble 
                          msg={msg} isMine={isMine} isFirstInGroup={isFirstInGroup} isLastInGroup={isLastInGroup}
                          user={user} otherParticipant={otherParticipant} chatSettings={chatSettings} API_BASE_URL={API_BASE_URL}
                          handleReact={handleReact} handleUnsend={handleUnsend} setReplyingTo={setReplyingTo} textInputRef={textInputRef}
                        />
                      </div>
                    </div>
                  );
                }}
              />

              {typingUser && <TypingBubble name={typingUser.name} />}
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
                🛡️ You have blocked this member. Intercom communications are currently suppressed.
              </div>
            ) : (
              <MessageInput 
                inputText={inputText} setInputText={setInputText} handleTyping={handleTyping} handleSend={handleSend}
                replyingTo={replyingTo} setReplyingTo={setReplyingTo} activeChat={activeChat} uploading={uploading} setUploading={setUploading} showToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Extracted Settings Modal Component */}
      <SettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        chatSettings={chatSettings}
        updateChatSetting={updateChatSetting}
      />

      <AnimatePresence>
        {showProfileSidebar && (
          <ProfileSidebar
            show={showProfileSidebar}
            onClose={() => setShowProfileSidebar(false)}
            userId={otherParticipant?._id}
            currentUser={user}
          />
        )}
      </AnimatePresence>
    </div>
  );
}