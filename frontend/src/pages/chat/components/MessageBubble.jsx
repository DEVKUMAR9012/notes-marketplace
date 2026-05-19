import React from 'react';
import { FiMaximize2 } from 'react-icons/fi';
import { motion } from 'framer-motion';

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
  const isAudio = msg.fileType === 'audio' || /\.(webm|mp3|wav|ogg)$/i.test(msg.fileUrl || '');
  const isRichNote = msg.noteMetadata || (msg.text && msg.text.includes('pages · ₹'));

  return (
    <div className={`relative flex items-center max-w-full ${isMine ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
      {/* Absolute Reply Indicator Behind the Dragging Bubble */}
      <div 
        className="absolute left-[-32px] text-[#a78bfa] opacity-0 transition-all duration-75 pointer-events-none flex items-center justify-center w-7 h-7 rounded-full bg-violet-950/40 border border-violet-500/20 shadow-md"
        style={{
          fontSize: '12px',
          zIndex: 1,
          transform: 'scale(0.8)',
        }}
        id={`reply-indicator-${msg._id}`}
      >
        ↩️
      </div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 85 }}
        dragElastic={{ left: 0, right: 0.3 }}
        onDrag={(event, info) => {
          const indicator = document.getElementById(`reply-indicator-${msg._id}`);
          if (indicator) {
            indicator.style.opacity = Math.min(info.offset.x / 50, 1);
            indicator.style.transform = `scale(${Math.min(0.8 + (info.offset.x / 250), 1.15)})`;
          }
        }}
        onDragEnd={(event, info) => {
          const indicator = document.getElementById(`reply-indicator-${msg._id}`);
          if (indicator) {
            indicator.style.opacity = 0;
            indicator.style.transform = 'scale(0.8)';
          }
          if (info.offset.x > 50) {
            setReplyingTo(msg);
            const textInput = document.querySelector('.embedded-text-field');
            if (textInput) textInput.focus();
          }
        }}
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{
          type: 'spring',
          stiffness: 450,
          damping: 28,
          opacity: { duration: 0.2 },
          scale: { duration: 0.2 }
        }}
        className={`message-bubble ${msg.pending ? 'opacity-70' : ''} cursor-grab active:cursor-grabbing`}
        onDoubleClick={() => !msg.isDeleted && handleReact(msg._id, '❤️')}
        style={{ zIndex: 2, touchAction: 'pan-y' }}
      >
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
                ) : isAudio ? (
                  <div className="msg-audio-wrapper py-1 px-1 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-white/80 font-medium px-1">
                      <span>🎙️ Voice Note</span>
                    </div>
                    <audio 
                      src={getAttachmentUrl(msg.fileUrl, API_BASE_URL)} 
                      controls 
                      className="max-w-[240px] h-[34px] rounded-lg bg-[#110f24] accent-violet-500"
                      controlsList="nodownload"
                    />
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
      </motion.div>
    </div>
  );
}
