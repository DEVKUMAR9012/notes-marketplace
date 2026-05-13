import React from 'react';
import { FiMaximize2 } from 'react-icons/fi';

const getReceiptIcon = (msg, userId, privacyActive) => {
  if (msg.pending) return <span className="receipt pending" title="Sending...">⏳</span>;
  if (msg.failed) return <span className="receipt failed" title="Failed, click to retry" style={{color: 'red'}}>⚠️</span>;
  if (privacyActive) return <span className="receipt sent" title="Sent privately">✓</span>;
  if (msg.readBy?.some(id => String(id) !== String(userId))) return <span className="receipt read" title="Read">✓✓</span>;
  if (msg.deliveredTo?.some(id => String(id) !== String(userId))) return <span className="receipt delivered" title="Delivered">✓✓</span>;
  return <span className="receipt sent" title="Sent">✓</span>;
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getAttachmentUrl = (url, API_BASE_URL) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  const cleanUrl = url.replace(/\\/g, '/');
  return `${API_BASE_URL}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
};

export default function MessageBubble({ 
  msg, isMine, isFirstInGroup, isLastInGroup, 
  user, otherParticipant, chatSettings, API_BASE_URL,
  handleReact, handleUnsend, setReplyingTo, textInputRef
}) {
  const isImg = msg.fileType === 'image' || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(msg.fileUrl || '');
  const isRichNote = msg.noteMetadata || (msg.text && msg.text.includes('pages · ₹'));

  return (
    <div className={`message-bubble ${msg.pending ? 'opacity-70' : ''}`} onDoubleClick={() => !msg.isDeleted && handleReact(msg._id, '❤️')}>
      {msg.isDeleted ? (
        <p className="deleted-text"><i>This message was unsent</i></p>
      ) : (
        <>
          {msg.replyTo && !msg.replyTo.isDeleted && (
            <div className="quoted-msg clickable">
              <span className="quote-sender">{msg.replyTo.sender?.name || 'Member'}</span>
              <p>{msg.replyTo.text || (msg.replyTo.fileUrl ? '📎 Attachment' : 'Message')}</p>
            </div>
          )}

          {isRichNote ? (
            <div className="rich-note-preview-card">
              <div className="rich-note-icon">📄</div>
              <div className="rich-note-details">
                <div className="rich-nt">{msg.noteMetadata?.title || msg.text?.split('\n')[0] || 'Shared Material'}</div>
                <div className="rich-ns">{msg.noteMetadata?.pages || '48'} pages · ₹{msg.noteMetadata?.price || '120'}</div>
              </div>
            </div>
          ) : (
            msg.fileUrl && (
              isImg ? (
                <div className="msg-image-wrapper">
                  <img src={getAttachmentUrl(msg.fileUrl, API_BASE_URL)} alt="attachment" className="msg-image" />
                  {!msg.pending && (
                    <a href={getAttachmentUrl(msg.fileUrl, API_BASE_URL)} target="_blank" rel="noopener noreferrer" className="download-overlay"><FiMaximize2 /></a>
                  )}
                </div>
              ) : (
                <a href={getAttachmentUrl(msg.fileUrl, API_BASE_URL)} target="_blank" rel="noopener noreferrer" className="msg-pdf">📎 View Document</a>
              )
            )
          )}

          {!isRichNote && msg.text && <p>{msg.text}</p>}

          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
            <div className="reactions-display">
              {Object.values(msg.reactions).slice(0, 3).map((r, i) => <span key={i} className="react-icon">{r}</span>)}
              {Object.keys(msg.reactions).length > 1 && <span className="react-count">{Object.keys(msg.reactions).length}</span>}
            </div>
          )}

          <div className="msg-meta">
            <span>{msg.pending ? 'Sending...' : formatTime(msg.createdAt)}</span>
            {isMine && getReceiptIcon(msg, user?._id, chatSettings.readReceiptPrivacy)}
          </div>
        </>
      )}
    </div>
  );
}
