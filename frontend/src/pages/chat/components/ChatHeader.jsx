import React, { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiArrowLeft, FiPhone, FiSearch, FiMoreVertical,
  FiBell, FiShield, FiSliders
} from 'react-icons/fi';

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMins = Math.floor((now - d) / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const ChatHeader = memo(function ChatHeader({
  activeChat, user, typingUser, Avatar,
  setActiveChat, initializeAudioCall, showToast,
  headerMenuOpen, setHeaderMenuOpen, headerMenuRef,
  handleBlockToggle, setShowSettingsModal
}) {
  if (!activeChat) return null;

  const isGroup = activeChat.isGroupChat;
  const otherParticipant = !isGroup
    ? activeChat.participants?.find(p => String(p._id) !== String(user?._id))
    : null;
  const chatTitle = isGroup ? activeChat.chatName : otherParticipant?.name;
  const isCurrentlyBlocked = !!activeChat.blockedBy;

  const chatStatus = isGroup
    ? `${activeChat.participants?.length || 0} participants`
    : (otherParticipant?.isOnline
        ? 'Online now'
        : `Last seen: ${otherParticipant?.lastSeen ? formatTime(otherParticipant.lastSeen) : 'N/A'}`);

  return (
    <div className="chat-window-header">
      <button
        type="button"
        className="back-arrow-btn"
        onClick={() => setActiveChat(null)}
        aria-label="Back to conversations"
      >
        <FiArrowLeft size={18} />
      </button>

      <div className="header-avatar-frame">
        <Avatar user={otherParticipant || { name: chatTitle }} size={36} isOnline={otherParticipant?.isOnline} />
      </div>

      <div className="header-member-details">
        <div className="header-title-box">
          <span className="header-name-text">{chatTitle}</span>
          {!isGroup && otherParticipant?.totalSales > 0 && (
            <span className="verified-tick" title="Verified Seller">✓</span>
          )}
        </div>
        <div className="header-status-text" aria-live="polite">
          {typingUser ? (
            <span className="typing-active-text">● {typingUser.name} is typing…</span>
          ) : (
            <span className={otherParticipant?.isOnline ? 'online-now-text' : ''}>
              {otherParticipant?.isOnline ? '● Online now' : chatStatus}
            </span>
          )}
        </div>
      </div>

      <div className="header-action-tools relative">
        <button
          type="button"
          className="action-circle-btn"
          onClick={initializeAudioCall}
          title="Start audio call"
          aria-label="Start audio call"
        >
          <FiPhone size={14} />
        </button>
        <button
          type="button"
          className="action-circle-btn"
          onClick={() => showToast("Search panel active", "success")}
          title="Search inside messages"
          aria-label="Search messages"
        >
          <FiSearch size={14} />
        </button>

        <div className="relative inline-block" ref={headerMenuRef}>
          <button
            type="button"
            className="action-circle-btn"
            onClick={() => setHeaderMenuOpen(prev => !prev)}
            title="More actions"
            aria-label="More actions"
            aria-expanded={headerMenuOpen}
            aria-haspopup="menu"
          >
            <FiMoreVertical size={14} />
          </button>

          <AnimatePresence>
            {headerMenuOpen && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 top-10 w-44 bg-[#1b1730] border border-white/10 rounded-xl py-2 shadow-2xl z-50 flex flex-col items-start"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleBlockToggle}
                  className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-white/5 transition flex items-center gap-2 text-red-400"
                >
                  <FiShield /> {isCurrentlyBlocked ? 'Unblock Member' : 'Block Member'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setHeaderMenuOpen(false); showToast("Conversation muted locally", "success"); }}
                  className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/5 transition flex items-center gap-2 text-gray-300"
                >
                  <FiBell /> Mute Notifications
                </button>
                <button
                  type="button"
                  role="menuitem"
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
  );
});

export default ChatHeader;
