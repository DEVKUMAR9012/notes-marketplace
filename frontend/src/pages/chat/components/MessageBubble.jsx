import React, { memo, useState, useEffect } from 'react';
import { FiMaximize2 } from 'react-icons/fi';
import { motion } from 'framer-motion';
import MarkdownMessage from './MarkdownMessage';
import API from '../../../utils/api';

const noteCache = {};
const noteListeners = {};

const fetchNoteMetadata = (noteId, callback) => {
  if (noteCache[noteId]) {
    callback(noteCache[noteId]);
    return;
  }

  if (!noteListeners[noteId]) {
    noteListeners[noteId] = [callback];
    
    API.get(`/notes/${noteId}`)
      .then(res => {
        const noteData = res.data?.data;
        if (noteData) {
          noteCache[noteId] = { loading: false, data: noteData, error: false };
        } else {
          noteCache[noteId] = { loading: false, data: null, error: true };
        }
        noteListeners[noteId].forEach(cb => cb(noteCache[noteId]));
        delete noteListeners[noteId];
      })
      .catch(err => {
        console.error('Failed to fetch note link metadata:', err);
        noteCache[noteId] = { loading: false, data: null, error: true };
        noteListeners[noteId].forEach(cb => cb(noteCache[noteId]));
        delete noteListeners[noteId];
      });
  } else {
    noteListeners[noteId].push(callback);
  }
};

function RichNotePreviewCard({ noteId, API_BASE_URL }) {
  const [state, setState] = useState(noteCache[noteId] || { loading: true, data: null, error: false });

  useEffect(() => {
    let active = true;
    fetchNoteMetadata(noteId, (updatedState) => {
      if (active) {
        setState(updatedState);
      }
    });
    return () => { active = false; };
  }, [noteId]);

  if (state.loading) {
    return (
      <div className="rich-note-card-skeleton animate-pulse">
        <div className="rich-note-skeleton-thumb" />
        <div className="rich-note-skeleton-details">
          <div className="rich-note-skeleton-line w-3/4 h-4" />
          <div className="rich-note-skeleton-line w-1/2 h-3" />
          <div className="rich-note-skeleton-line w-2/3 h-3" />
        </div>
      </div>
    );
  }

  if (state.error || !state.data) {
    return null;
  }

  const note = state.data;
  const isPaid = note.price > 0;
  const seller = note.uploadedBy?.name || 'Anonymous Seller';
  const isVerified = note.uploadedBy?.isVerified;

  const titleChar = note.title ? note.title.charCodeAt(0) : 65;
  const gradients = [
    'from-rose-500/30 to-orange-500/30',
    'from-blue-500/30 to-cyan-500/30',
    'from-purple-500/30 to-pink-500/30',
    'from-green-500/30 to-emerald-500/30',
    'from-indigo-500/30 to-violet-500/30',
    'from-yellow-500/30 to-amber-500/30'
  ];
  const thumbnailGradient = gradients[titleChar % gradients.length];

  const handleActionClick = (e) => {
    e.stopPropagation();
    window.open(`/books?noteId=${note._id}`, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rich-note-preview-card-interactive"
    >
      <div className="rich-note-preview-card-body">
        <div className={`rich-note-preview-card-thumb bg-gradient-to-br ${thumbnailGradient}`}>
          <span className="rich-note-preview-icon">📚</span>
        </div>

        <div className="rich-note-preview-card-info">
          <h4 className="rich-note-preview-title" title={note.title}>{note.title}</h4>
          
          <div className="rich-note-preview-tags">
            {note.subject && <span className="rich-note-tag subject">📘 {note.subject}</span>}
            {note.semester && <span className="rich-note-tag semester">Sem {note.semester}</span>}
          </div>

          <div className="rich-note-preview-seller flex items-center gap-1">
            <span className="seller-label text-[10.5px]">Seller:</span>
            <span className="seller-name truncate text-[10.5px]">{seller}</span>
            {isVerified && <span className="seller-verified-badge" title="Verified Seller">✓</span>}
          </div>
        </div>
      </div>

      <div className="rich-note-preview-card-footer">
        <div className="rich-note-price-section">
          {isPaid ? (
            <span className="rich-note-price-amt font-black">₹{note.price}</span>
          ) : (
            <span className="rich-note-price-free font-bold text-emerald-400">🎓 FREE</span>
          )}
        </div>

        <button 
          type="button" 
          className="rich-note-action-btn flex items-center gap-1.5"
          onClick={handleActionClick}
        >
          {isPaid ? (
            <><span>🛒 Buy Now</span></>
          ) : (
            <><span>📥 Download</span></>
          )}
        </button>
      </div>
    </motion.div>
  );
}

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

export default memo(function MessageBubble({ 
  msg, isMine, isFirstInGroup, isLastInGroup, 
  user, otherParticipant, chatSettings, API_BASE_URL,
  handleReact, handleUnsend, setReplyingTo, textInputRef,
  socket
}) {
  const isImg = msg.fileType === 'image' || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(msg.fileUrl || '');
  const isAudio = msg.fileType === 'audio' || /\.(webm|mp3|wav|ogg)$/i.test(msg.fileUrl || '');
  const isRichNote = msg.noteMetadata || (msg.text && msg.text.includes('pages · ₹'));
  const isPoll = msg.fileType === 'poll' || (msg.poll && msg.poll.question);
  const noteLinkMatch = msg.text ? msg.text.match(/(?:https?:\/\/[^\s/]+)?\/books\?(?:[^\s&]*&)*(?:id|noteId)=([a-f\d]{24})/i) : null;
  const detectedNoteId = noteLinkMatch ? noteLinkMatch[1] : null;

  const renderPoll = () => {
    if (!msg.poll) return null;

    const totalVotes = msg.poll.options?.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0) || 0;

    const handleVote = (optionIndex) => {
      if (!socket || msg.pending) return;
      socket.emit('vote_poll', {
        chatId: msg.chat?._id || msg.chat,
        messageId: msg._id,
        optionIndex
      });
    };

    return (
      <div className="chat-poll-wrapper">
        <div className="chat-poll-question">
          <span className="poll-icon">📊</span>
          <span>{msg.poll.question}</span>
        </div>
        <div className="chat-poll-options">
          {msg.poll.options?.map((option, idx) => {
            const votesCount = option.votes?.length || 0;
            const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
            const hasVoted = option.votes?.some(vId => String(vId) === String(user?._id));

            return (
              <button
                key={idx}
                type="button"
                className={`chat-poll-option-btn ${hasVoted ? 'voted' : ''}`}
                onClick={() => handleVote(idx)}
              >
                {/* Visual percentage progress background */}
                <div 
                  className="chat-poll-option-progress" 
                  style={{ width: `${percentage}%` }} 
                />
                
                <span className="chat-poll-option-text">
                  {hasVoted && <span className="voted-tick-icon">✓</span>}
                  {option.optionText}
                </span>
                
                <span className="chat-poll-option-meta">
                  {percentage}% ({votesCount})
                </span>
              </button>
            );
          })}
        </div>
        <div className="chat-poll-footer">
          <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} total</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex items-center max-w-[85%] ${isMine ? 'ml-auto justify-end pr-2' : 'mr-auto justify-start pl-2'}`}>
      <div className="relative">
        {/* Absolute Reply Indicator Behind the Dragging Bubble */}
        <div 
          className="absolute left-[-32px] top-1/2 -translate-y-1/2 text-[#a78bfa] opacity-0 transition-all duration-75 pointer-events-none flex items-center justify-center w-7 h-7 rounded-full bg-violet-950/40 border border-violet-500/20 shadow-md"
          style={{
            fontSize: '12px',
            zIndex: 1,
            transform: 'scale(0.8) translateY(-50%)',
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
              if (textInputRef && textInputRef.current) {
                textInputRef.current.focus();
              } else {
                const textInput = document.querySelector('.embedded-text-field');
                if (textInput) textInput.focus();
              }
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

              {isPoll ? (
                renderPoll()
              ) : isRichNote ? (
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

              {!isPoll && !isRichNote && msg.text && <MarkdownMessage content={msg.text} />}
              {detectedNoteId && <RichNotePreviewCard noteId={detectedNoteId} API_BASE_URL={API_BASE_URL} />}

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
    </div>
  );
});
