import React, { memo, useState, useEffect, useCallback } from 'react';
import { FiDownload, FiShoppingCart, FiStar, FiExternalLink } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MarkdownMessage from './MarkdownMessage';
import API from '../../../utils/api';
import { downloadFile, buildPdfUrl } from '../../../utils/downloadPdf';
import { useAuth } from '../../../context/AuthContext';

// ─── Module-level cache — survives re-renders, shared across all bubbles ──────
const NOTE_CACHE = {};
const NOTE_PENDING = {}; // noteId → [callbacks]

function fetchNoteMetadata(noteId, cb) {
  // Already cached → instant callback
  if (NOTE_CACHE[noteId]) { cb(NOTE_CACHE[noteId]); return; }

  // Already in-flight → queue the callback
  if (NOTE_PENDING[noteId]) { NOTE_PENDING[noteId].push(cb); return; }

  // Start new request
  NOTE_PENDING[noteId] = [cb];
  API.get(`/notes/${noteId}`)
    .then(res => {
      const data = res.data?.data || res.data;
      NOTE_CACHE[noteId] = { loading: false, data: data?._id ? data : null, error: !data?._id };
    })
    .catch(() => {
      NOTE_CACHE[noteId] = { loading: false, data: null, error: true };
    })
    .finally(() => {
      (NOTE_PENDING[noteId] || []).forEach(fn => fn(NOTE_CACHE[noteId]));
      delete NOTE_PENDING[noteId];
    });
}

// ─── URL detection — match any internal note link ─────────────────────────────
// Handles:
//   /books?noteId=<id>      /books?id=<id>
//   /explorer?noteId=<id>   /notes/<id>
//   https://noteshere.site/books?noteId=<id>   etc.
const NOTE_URL_RE =
  /(?:https?:\/\/[^\s/]*)?(?:\/books|\/explorer|\/notes)(?:\?[^\s]*(?:noteId|id)=|\/)([\da-f]{24})/i;

function detectNoteId(text) {
  if (!text) return null;
  const m = text.match(NOTE_URL_RE);
  return m ? m[1] : null;
}

// Strip just the note URL from a message so it doesn't dupe-render below the card
function stripNoteUrl(text) {
  if (!text) return text;
  return text
    .replace(/(?:https?:\/\/[^\s]*)?(?:\/books|\/explorer|\/notes)(?:\?[^\s]*(?:noteId|id)=[^\s]*|\/[\da-f]{24}[^\s]*)/gi, '')
    .trim();
}

// ─── Gradient palette seeded by note title ───────────────────────────────────
const THUMB_GRADIENTS = [
  'from-violet-600/40 to-fuchsia-600/40',
  'from-blue-600/40 to-cyan-500/40',
  'from-rose-500/40 to-orange-500/40',
  'from-emerald-500/40 to-teal-400/40',
  'from-indigo-500/40 to-violet-500/40',
  'from-amber-500/40 to-yellow-400/40',
];

// ─── Rich Note Preview Card ───────────────────────────────────────────────────
function RichNotePreviewCard({ noteId }) {
  const [state, setState] = useState(
    NOTE_CACHE[noteId] || { loading: true, data: null, error: false }
  );
  const { user } = useAuth();
  const navigate   = useNavigate();

  useEffect(() => {
    if (NOTE_CACHE[noteId]) { setState(NOTE_CACHE[noteId]); return; }
    let alive = true;
    fetchNoteMetadata(noteId, s => { if (alive) setState(s); });
    return () => { alive = false; };
  }, [noteId]);


  const note       = state.data;
  const isPaid     = (note?.price ?? 0) > 0;
  const seller     = note?.uploadedBy?.name || 'Anonymous';
  const isVerified = note?.uploadedBy?.isVerified;
  const rating     = note?.rating ? parseFloat(note.rating).toFixed(1) : null;
  const isOwned    = user?.purchasedNotes?.some(id => String(id) === String(note?._id));
  const canDownload = !isPaid || isOwned;
  const gradientClass = THUMB_GRADIENTS[
    (note?.title?.charCodeAt(0) ?? 65) % THUMB_GRADIENTS.length
  ];

  // Hooks must come before any conditional returns
  const handleAction = useCallback((e) => {
    e.stopPropagation();
    if (!note) return;
    if (canDownload && note.pdfUrl) {
      downloadFile(buildPdfUrl(note.pdfUrl), note.title);
    } else {
      navigate(`/books?noteId=${note._id}`);
    }
  }, [canDownload, note, navigate]);

  const handleCardClick = useCallback((e) => {
    e.stopPropagation();
    if (!note) return;
    navigate(`/books?noteId=${note._id}`);
  }, [note, navigate]);

  if (state.loading) {
    return (
      <div className="rich-note-card-skeleton animate-pulse">
        <div className="rich-note-skeleton-thumb" />
        <div className="rich-note-skeleton-details">
          <div className="rich-note-skeleton-line" style={{ width: '72%', height: 14 }} />
          <div className="rich-note-skeleton-line" style={{ width: '50%', height: 11 }} />
          <div className="rich-note-skeleton-line" style={{ width: '60%', height: 11 }} />
        </div>
      </div>
    );
  }

  // Error / not found — render nothing
  if (state.error || !state.data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="rich-note-preview-card-interactive"
      onClick={handleCardClick}
      title="Open in marketplace"
    >
      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="rich-note-preview-card-body">
        {/* Thumbnail */}
        <div className={`rich-note-preview-card-thumb bg-gradient-to-br ${gradientClass}`}>
          <span className="rich-note-preview-icon">
            {note.itemType === 'book' ? '📖' : '📄'}
          </span>
        </div>

        {/* Info */}
        <div className="rich-note-preview-card-info">
          <h4 className="rich-note-preview-title" title={note.title}>
            {note.title}
          </h4>

          <div className="rich-note-preview-tags">
            {note.subject  && <span className="rich-note-tag subject">📘 {note.subject}</span>}
            {note.semester && <span className="rich-note-tag semester">Sem {note.semester}</span>}
            {note.itemType === 'book' && <span className="rich-note-tag semester">📚 Book</span>}
          </div>

          <div className="rich-note-preview-seller" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>by</span>
            <span className="seller-name" style={{ fontSize: 10.5 }}>{seller}</span>
            {isVerified && (
              <span className="seller-verified-badge" title="Verified Seller">✓</span>
            )}
            {rating && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto', fontSize: 10, color: '#fbbf24' }}>
                <FiStar style={{ fill: '#fbbf24', width: 9, height: 9 }} />
                {rating}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="rich-note-preview-card-footer">
        <div className="rich-note-price-section">
          {isPaid ? (
            <span className="rich-note-price-amt">₹{note.price}</span>
          ) : (
            <span className="rich-note-price-free">🎓 FREE</span>
          )}
          {isOwned && (
            <span style={{ fontSize: 9, color: '#34d399', fontWeight: 700, marginLeft: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ✓ Owned
            </span>
          )}
        </div>

        <button
          type="button"
          className="rich-note-action-btn"
          onClick={handleAction}
          title={canDownload ? 'Download PDF' : 'Buy this note'}
        >
          {canDownload ? (
            <><FiDownload style={{ width: 11, height: 11 }} /> Download</>
          ) : (
            <><FiShoppingCart style={{ width: 11, height: 11 }} /> Buy ₹{note.price}</>
          )}
        </button>
      </div>

      {/* Subtle "open in marketplace" hint */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        padding: '5px 12px', borderTop: '1px solid rgba(255,255,255,0.04)',
        fontSize: 9.5, color: 'rgba(255,255,255,0.22)', fontWeight: 500,
        letterSpacing: '0.3px', cursor: 'pointer',
      }}>
        <FiExternalLink style={{ width: 9, height: 9 }} />
        Open in Marketplace
      </div>
    </motion.div>
  );
}

// ─── Receipt icon ─────────────────────────────────────────────────────────────
const getReceiptIcon = (msg, userId, privacyActive) => {
  if (msg.pending) return <span className="receipt pending" title="Sending...">⏳</span>;
  if (msg.failed)  return <span className="receipt failed"  title="Failed"   style={{ color: 'red' }}>⚠️</span>;
  if (privacyActive) return <span className="receipt sent" title="Sent privately">✓</span>;
  if (msg.readBy?.some(id  => String(id) !== String(userId))) return <span className="receipt read"      title="Read">✓✓</span>;
  if (msg.deliveredTo?.some(id => String(id) !== String(userId))) return <span className="receipt delivered" title="Delivered">✓✓</span>;
  return <span className="receipt sent" title="Sent">✓</span>;
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getAttachmentUrl = (url, API_BASE_URL) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  const cleanUrl = url.replace(/\\/g, '/');
  return `${API_BASE_URL}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
};

const extractFileName = (fileUrl) => {
  if (!fileUrl) return 'file';
  try {
    return decodeURIComponent(fileUrl.split('?')[0].split('/').pop() || 'file');
  } catch {
    return 'file';
  }
};

// ─── Main MessageBubble ───────────────────────────────────────────────────────
export default memo(function MessageBubble({
  msg, isMine, isFirstInGroup, isLastInGroup,
  user, otherParticipant, chatSettings, API_BASE_URL,
  handleReact, handleUnsend, setReplyingTo, textInputRef,
  socket,
}) {
  const isImg      = msg.fileType === 'image' || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(msg.fileUrl || '');
  const isAudio    = msg.fileType === 'audio' || /\.(webm|mp3|wav|ogg)$/i.test(msg.fileUrl || '');
  const isRichNote = !!(msg.noteMetadata || (msg.text && msg.text.includes('pages · ₹')));
  const isPoll     = !!(msg.fileType === 'poll' || (msg.poll?.question));

  // Detect note URL in message text
  const detectedNoteId = !isRichNote && !isPoll ? detectNoteId(msg.text) : null;
  // Text after stripping the note URL (so it doesn't double-render)
  const cleanedText = detectedNoteId ? stripNoteUrl(msg.text) : msg.text;

  const renderPoll = () => {
    if (!msg.poll) return null;
    const totalVotes = msg.poll.options?.reduce((s, o) => s + (o.votes?.length || 0), 0) || 0;

    const handleVote = (optionIndex) => {
      if (!socket || msg.pending) return;
      socket.emit('vote_poll', {
        chatId: msg.chat?._id || msg.chat,
        messageId: msg._id,
        optionIndex,
      });
    };

    return (
      <div className="chat-poll-wrapper">
        <div className="chat-poll-question">
          <span className="poll-icon">📊</span>
          <span>{msg.poll.question}</span>
        </div>
        <div className="chat-poll-options">
          {msg.poll.options?.map((opt, idx) => {
            const votes      = opt.votes?.length || 0;
            const pct        = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const hasVoted   = opt.votes?.some(id => String(id) === String(user?._id));
            return (
              <button
                key={idx}
                type="button"
                className={`chat-poll-option-btn ${hasVoted ? 'voted' : ''}`}
                onClick={() => handleVote(idx)}
              >
                <div className="chat-poll-option-progress" style={{ width: `${pct}%` }} />
                <span className="chat-poll-option-text">
                  {hasVoted && <span className="voted-tick-icon">✓</span>}
                  {opt.optionText}
                </span>
                <span className="chat-poll-option-meta">{pct}% ({votes})</span>
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
        {/* Swipe-to-reply indicator */}
        <div
          className="absolute left-[-32px] top-1/2 -translate-y-1/2 text-[#a78bfa] opacity-0 transition-all duration-75 pointer-events-none flex items-center justify-center w-7 h-7 rounded-full bg-violet-950/40 border border-violet-500/20 shadow-md"
          style={{ fontSize: 12, zIndex: 1, transform: 'scale(0.8) translateY(-50%)' }}
          id={`reply-indicator-${msg._id}`}
        >↩️</div>

        <motion.div
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 85 }}
          dragElastic={{ left: 0, right: 0.3 }}
          onDrag={(_, info) => {
            const el = document.getElementById(`reply-indicator-${msg._id}`);
            if (el) {
              el.style.opacity = Math.min(info.offset.x / 50, 1);
              el.style.transform = `scale(${Math.min(0.8 + info.offset.x / 250, 1.15)})`;
            }
          }}
          onDragEnd={(_, info) => {
            const el = document.getElementById(`reply-indicator-${msg._id}`);
            if (el) { el.style.opacity = 0; el.style.transform = 'scale(0.8)'; }
            if (info.offset.x > 50) {
              setReplyingTo(msg);
              (textInputRef?.current || document.querySelector('.embedded-text-field'))?.focus();
            }
          }}
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{
            type: 'spring', stiffness: 450, damping: 28,
            opacity: { duration: 0.2 }, scale: { duration: 0.2 },
          }}
          className={`message-bubble ${msg.pending ? 'opacity-70' : ''} cursor-grab active:cursor-grabbing`}
          onDoubleClick={() => !msg.isDeleted && handleReact(msg._id, '❤️')}
          style={{ zIndex: 2, touchAction: 'pan-y' }}
        >
          {msg.isDeleted ? (
            <p className="deleted-text"><i>This message was unsent</i></p>
          ) : (
            <>
              {/* Reply quote */}
              {msg.replyTo && !msg.replyTo.isDeleted && (
                <div className="quoted-msg clickable">
                  <span className="quote-sender">{msg.replyTo.sender?.name || 'Member'}</span>
                  <p>{msg.replyTo.text || (msg.replyTo.fileUrl ? '📎 Attachment' : 'Message')}</p>
                </div>
              )}

              {/* ── Content area ───────────────────────────────────────────── */}
              {isPoll ? (
                renderPoll()
              ) : isRichNote ? (
                /* Legacy server-side rich note (noteMetadata field) */
                <div className="rich-note-preview-card">
                  <div className="rich-note-icon">📄</div>
                  <div className="rich-note-details">
                    <div className="rich-nt">{msg.noteMetadata?.title || msg.text?.split('\n')[0] || 'Shared Material'}</div>
                    <div className="rich-ns">{msg.noteMetadata?.pages || '—'} pages · ₹{msg.noteMetadata?.price ?? '—'}</div>
                  </div>
                </div>
              ) : msg.fileUrl ? (
                /* File attachments */
                isImg ? (
                  <div className="msg-image-wrapper">
                    <img src={getAttachmentUrl(msg.fileUrl, API_BASE_URL)} alt="attachment" className="msg-image" />
                    {!msg.pending && (
                      <button
                        className="download-overlay"
                        title="Download image"
                        onClick={() => downloadFile(getAttachmentUrl(msg.fileUrl, API_BASE_URL), extractFileName(msg.fileUrl))}
                      >
                        <FiDownload />
                      </button>
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
                  <button
                    className="msg-pdf"
                    onClick={() => downloadFile(getAttachmentUrl(msg.fileUrl, API_BASE_URL), extractFileName(msg.fileUrl))}
                  >
                    📎 Download Document
                  </button>
                )
              ) : null}

              {/* Text (with note URL stripped if a card will follow) */}
              {!isPoll && !isRichNote && cleanedText && (
                <MarkdownMessage content={cleanedText} />
              )}

              {/* ── Auto Rich Note Preview Card ─────────────────────────── */}
              {detectedNoteId && (
                <RichNotePreviewCard
                  noteId={detectedNoteId}
                  API_BASE_URL={API_BASE_URL}
                />
              )}

              {/* Reactions */}
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="reactions-display">
                  {Object.values(msg.reactions).slice(0, 3).map((r, i) => (
                    <span key={i} className="react-icon">{r}</span>
                  ))}
                  {Object.keys(msg.reactions).length > 1 && (
                    <span className="react-count">{Object.keys(msg.reactions).length}</span>
                  )}
                </div>
              )}

              <div className="msg-meta">
                <span>{msg.pending ? 'Sending...' : formatTime(msg.createdAt)}</span>
                {isMine && getReceiptIcon(msg, user?._id, chatSettings?.readReceiptPrivacy)}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
});
