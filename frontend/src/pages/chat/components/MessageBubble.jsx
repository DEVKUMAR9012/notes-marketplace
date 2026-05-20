import React, { memo, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiDownload, FiShoppingCart, FiStar, FiExternalLink } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MarkdownMessage from './MarkdownMessage';
import API from '../../../utils/api';
import PDFThumbnail from '../../../components/PDFThumbnail';
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

const getMessageFileName = (msg) => msg.fileName || extractFileName(msg.fileUrl || msg.localPreviewUrl);

const getFileExtension = (fileName = '', fileUrl = '') => {
  const source = (fileName || fileUrl || '').split('?')[0];
  const ext = source.includes('.') ? source.split('.').pop()?.toLowerCase() : '';
  return ext || '';
};

const formatFileSize = (bytes) => {
  if (!bytes || Number.isNaN(Number(bytes))) return '';
  const size = Number(bytes);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10240 ? 1 : 0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
};

const getDocumentLabel = (msg) => {
  const ext = getFileExtension(msg.fileName, msg.fileUrl || msg.localPreviewUrl);
  const mime = msg.fileMimeType || '';

  if (msg.fileType === 'pdf' || ext === 'pdf') return { label: 'PDF Document', badge: 'PDF', tone: 'pdf' };
  if (mime.includes('word') || ['doc', 'docx'].includes(ext)) return { label: 'Word Document', badge: ext.toUpperCase() || 'DOC', tone: 'word' };
  if (mime.includes('presentation') || ['ppt', 'pptx'].includes(ext)) return { label: 'PowerPoint', badge: ext.toUpperCase() || 'PPT', tone: 'slides' };
  if (mime.includes('sheet') || mime.includes('excel') || ['xls', 'xlsx'].includes(ext)) return { label: 'Spreadsheet', badge: ext.toUpperCase() || 'XLS', tone: 'sheet' };
  if (mime === 'text/plain' || ext === 'txt') return { label: 'Text Document', badge: 'TXT', tone: 'text' };
  return { label: 'Document', badge: ext ? ext.toUpperCase() : 'FILE', tone: 'file' };
};

const isPdfDocument = (msg) => msg.fileType === 'pdf' || getFileExtension(msg.fileName, msg.fileUrl || msg.localPreviewUrl) === 'pdf';
const isTextDocument = (msg) => {
  const ext = getFileExtension(msg.fileName, msg.fileUrl || msg.localPreviewUrl);
  return msg.fileMimeType === 'text/plain' || ext === 'txt';
};
const isOfficeDocument = (msg) => {
  const ext = getFileExtension(msg.fileName, msg.fileUrl || msg.localPreviewUrl);
  const mime = msg.fileMimeType || '';
  return ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)
    || mime.includes('word')
    || mime.includes('presentation')
    || mime.includes('sheet')
    || mime.includes('excel');
};

const canUseHostedOfficePreview = (url = '') => /^https?:\/\//i.test(url) && !/\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::|\/|$)/i.test(url);
const buildOfficePreviewUrl = (url) => `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

function DocumentPreviewModal({ msg, API_BASE_URL, onClose }) {
  const rawUrl = getAttachmentUrl(msg.fileUrl || msg.localPreviewUrl, API_BASE_URL);
  const previewUrl = rawUrl ? rawUrl.replace(/fl_attachment(:[^/]*)?\/|fl_attachment,?[^/]*\//ig, '') : '';
  const downloadUrl = rawUrl;
  const fileName = getMessageFileName(msg);
  const [textPreview, setTextPreview] = useState({ loading: false, content: '', error: '' });

  const isPdf = isPdfDocument(msg);
  const isText = isTextDocument(msg);
  const isOffice = isOfficeDocument(msg);
  const officePreviewUrl = isOffice && canUseHostedOfficePreview(previewUrl)
    ? buildOfficePreviewUrl(previewUrl)
    : '';

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!isText || !previewUrl) return undefined;

    const controller = new AbortController();
    setTextPreview({ loading: true, content: '', error: '' });

    fetch(previewUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.text();
      })
      .then((content) => {
        setTextPreview({
          loading: false,
          content: content.length > 40000 ? `${content.slice(0, 40000)}\n\n...preview truncated...` : content,
          error: '',
        });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setTextPreview({ loading: false, content: '', error: 'Text preview could not be loaded.' });
      });

    return () => controller.abort();
  }, [isText, previewUrl]);

  const handleDownload = useCallback(() => {
    if (!downloadUrl) return;
    downloadFile(downloadUrl, fileName);
  }, [downloadUrl, fileName]);

  const handleOpenNewTab = useCallback(() => {
    if (!previewUrl) return;
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  }, [previewUrl]);

  const renderPreview = () => {
    if (!previewUrl) {
      return <div className="chat-doc-preview-empty">Preview unavailable for this file.</div>;
    }

    if (isPdf) {
      const isRemote = previewUrl.startsWith('http');
      const pdfIframeSrc = isRemote 
        ? `https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true` 
        : `${previewUrl}#toolbar=1&navpanes=0&view=FitH`;
        
      return (
        <iframe
          src={pdfIframeSrc}
          title={fileName}
          className="chat-doc-preview-frame"
        />
      );
    }

    if (isText) {
      if (textPreview.loading) {
        return <div className="chat-doc-preview-empty">Loading text preview...</div>;
      }
      if (textPreview.error) {
        return <div className="chat-doc-preview-empty">{textPreview.error}</div>;
      }
      return (
        <pre className="chat-doc-preview-text">
          {textPreview.content || 'This text file is empty.'}
        </pre>
      );
    }

    if (officePreviewUrl) {
      return (
        <iframe
          src={officePreviewUrl}
          title={fileName}
          className="chat-doc-preview-frame"
        />
      );
    }

    return (
      <div className="chat-doc-preview-empty">
        <strong>Live preview is limited for this file here.</strong>
        <span>Use Open in New Tab or Download to view the full document.</span>
      </div>
    );
  };

  return createPortal(
    <div className="chat-doc-preview-backdrop" onClick={onClose} role="presentation">
      <div className="chat-doc-preview-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={fileName}>
        <div className="chat-doc-preview-header">
          <div className="chat-doc-preview-meta">
            <span className="chat-doc-preview-eyebrow">{getDocumentLabel(msg).label}</span>
            <h3 title={fileName}>{fileName}</h3>
          </div>
          <div className="chat-doc-preview-actions">
            <button type="button" className="chat-doc-preview-btn secondary" onClick={handleOpenNewTab}>
              <FiExternalLink style={{ width: 14, height: 14 }} />
              Open
            </button>
            <button type="button" className="chat-doc-preview-btn primary" onClick={handleDownload}>
              <FiDownload style={{ width: 14, height: 14 }} />
              Download
            </button>
            <button type="button" className="chat-doc-preview-close" onClick={onClose} aria-label="Close preview">
              ×
            </button>
          </div>
        </div>
        <div className="chat-doc-preview-body">
          {renderPreview()}
        </div>
      </div>
    </div>,
    document.body
  );
}

function DocumentAttachmentCard({ msg, API_BASE_URL, onPreview }) {
  const rawUrl = getAttachmentUrl(msg.localPreviewUrl || msg.fileUrl, API_BASE_URL);
  const previewUrl = rawUrl ? rawUrl.replace(/fl_attachment(:[^/]*)?\/|fl_attachment,?[^/]*\//ig, '') : '';
  const downloadUrl = rawUrl;
  const fileName = getMessageFileName(msg);
  const { label, badge, tone } = getDocumentLabel(msg);
  const fileSize = formatFileSize(msg.fileSize);
  const uploadProgress = Math.max(0, Math.min(100, Math.round(msg.uploadProgress || 0)));
  const previewActionLabel = isPdfDocument(msg) || isTextDocument(msg) || isOfficeDocument(msg) ? 'Preview' : 'Open';
  const canInteract = !msg.pending && !msg.failed && !!downloadUrl;
  
  // Try to use page count from metadata, or fallback to dummy data for demonstration (like screenshot)
  const pageCount = msg.noteMetadata?.pages || msg.pages || (isPdfDocument(msg) ? (fileName.includes('MAJOR') ? 24 : 8) : null);

  const handlePreview = useCallback(() => {
    if (!canInteract) return;
    if (onPreview) {
      onPreview();
      return;
    }
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
  }, [canInteract, downloadUrl, onPreview]);

  const handleDownload = useCallback((e) => {
    e.stopPropagation();
    if (!downloadUrl) return;
    downloadFile(downloadUrl, fileName);
  }, [downloadUrl, fileName]);

  return (
    <div className={`chat-document-card ${msg.pending ? 'is-uploading' : ''} ${msg.failed ? 'is-failed' : ''}`}>
      <div className="chat-document-hero" onClick={handlePreview} role="button" tabIndex={0} aria-label={fileName}>
        <div className="chat-document-badge-row">
          <span className={`chat-document-badge tone-${tone}`}>{badge}</span>
        </div>
        
        <div className="chat-document-thumb-container">
          <PDFThumbnail
            pdfUrl={previewUrl}
            fileName={fileName}
            title={fileName}
            compact
          />
        </div>

        {pageCount && (
          <span className="chat-document-pages-badge">{pageCount} pages</span>
        )}
        
        {msg.pending && (
          <div className="chat-document-thumb-overlay">
            <span>{uploadProgress > 0 ? `${uploadProgress}%` : 'Uploading...'}</span>
          </div>
        )}
      </div>

      <div className="chat-document-details">
        <h4 className="chat-document-title" title={fileName}>{fileName}</h4>
        <div className="chat-document-meta">
          {msg.failed ? <span style={{color: '#fca5a5'}}>Upload failed</span> : msg.pending ? 'Preparing upload...' : `${fileSize} · shared by ${msg.sender?.name || 'dev soni'}`}
        </div>
      </div>

      {!msg.pending && !msg.failed && (
        <div className="chat-document-footer">
          <button
            type="button"
            className="chat-doc-action-btn"
            onClick={handlePreview}
            disabled={!canInteract}
          >
            <FiExternalLink style={{ width: 14, height: 14 }} /> {previewActionLabel}
          </button>
          <div className="chat-doc-divider"></div>
          <button
            type="button"
            className="chat-doc-action-btn text-emerald"
            onClick={handleDownload}
            disabled={!downloadUrl}
          >
            <FiDownload style={{ width: 14, height: 14 }} /> Download
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main MessageBubble ───────────────────────────────────────────────────────
export default memo(function MessageBubble({
  msg, isMine, isFirstInGroup, isLastInGroup,
  user, otherParticipant, chatSettings, API_BASE_URL,
  handleReact, handleUnsend, setReplyingTo, textInputRef,
  socket,
}) {
  const attachmentSource = msg.fileUrl || msg.localPreviewUrl || msg.fileName || '';
  const hasAttachment = Boolean(msg.fileUrl || msg.localPreviewUrl);
  const isImg      = msg.fileType === 'image' || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(attachmentSource);
  const isAudio    = msg.fileType === 'audio' || /\.(webm|mp3|wav|ogg)$/i.test(attachmentSource);
  const isRichNote = !!(msg.noteMetadata || (msg.text && msg.text.includes('pages · ₹')));
  const isPoll     = !!(msg.fileType === 'poll' || (msg.poll?.question));
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);

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
              ) : hasAttachment ? (
                /* File attachments */
                isImg ? (
                  <div className="msg-image-wrapper">
                    <img src={getAttachmentUrl(msg.fileUrl || msg.localPreviewUrl, API_BASE_URL)} alt="attachment" className="msg-image" />
                    {!msg.pending && (
                      <button
                        className="download-overlay"
                        title="Download image"
                        onClick={() => downloadFile(getAttachmentUrl(msg.fileUrl || msg.localPreviewUrl, API_BASE_URL), extractFileName(msg.fileUrl || msg.localPreviewUrl))}
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
                      src={getAttachmentUrl(msg.fileUrl || msg.localPreviewUrl, API_BASE_URL)}
                      controls
                      className="max-w-[240px] h-[34px] rounded-lg bg-[#110f24] accent-violet-500"
                      controlsList="nodownload"
                    />
                  </div>
                ) : (
                  <DocumentAttachmentCard
                    msg={msg}
                    API_BASE_URL={API_BASE_URL}
                    onPreview={() => setIsDocumentPreviewOpen(true)}
                  />
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
              {isDocumentPreviewOpen && !msg.pending && !msg.failed && !isImg && !isAudio && (
                <DocumentPreviewModal
                  msg={msg}
                  API_BASE_URL={API_BASE_URL}
                  onClose={() => setIsDocumentPreviewOpen(false)}
                />
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
});
