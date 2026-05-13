import React, { useMemo } from 'react';
import { FiSearch, FiSettings } from 'react-icons/fi';

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

export default function ChatSidebar({
  activeChat, setActiveChat, unreadCounts, 
  setShowSettingsModal, showSearch, setShowSearch,
  sidebarSearchQuery, setSidebarSearchQuery,
  activeFilterTab, setActiveFilterTab,
  conversations, user, Avatar
}) {

  const filteredConversations = conversations.filter(c => {
    if (activeFilterTab === 'unread') return (unreadCounts[c._id] || 0) > 0;
    if (activeFilterTab === 'buyers') {
      const other = !c.isGroupChat ? c.participants?.find(p => String(p._id) !== String(user?._id)) : null;
      return other?.isBuyer === true;
    }
    return true;
  });

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

  return (
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

      <div className="sidebar-search-capsule">
        <FiSearch className="search-glass-icon" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={sidebarSearchQuery}
          onChange={e => setSidebarSearchQuery(e.target.value)}
        />
      </div>

      <div className="sidebar-filter-tabs">
        {['all', 'unread', 'buyers'].map(tab => (
          <button
            key={tab}
            type="button"
            className={`filter-tab-pill ${activeFilterTab === tab ? 'active' : ''}`}
            onClick={() => setActiveFilterTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

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
  );
}
