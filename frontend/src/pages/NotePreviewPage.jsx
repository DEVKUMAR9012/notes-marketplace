/**
 * NotePreviewPage – /note/:id/preview
 *
 * Layout (matches screenshot):
 *   Header  : back · title · subtitle · bookmark · share · download/buy
 *   Tab bar : Preview | Uploader | Details | Comments
 *   Body    : left PDF canvas (page-by-page nav) + right rich sidebar
 *
 * Sidebar sections:
 *   Uploader (avatar + stats + follow)
 *   Note Details (checkbox-style metadata list)
 *   Topics Covered (tag chips)
 *   Rate this note (interactive stars + submit)
 *   More from Uploader (mini note list)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft, FiDownload, FiStar, FiUser, FiFileText,
  FiMessageCircle, FiBookmark, FiShare2, FiShoppingCart,
  FiChevronLeft, FiChevronRight, FiMessageSquare, FiInfo,
  FiGithub, FiInstagram, FiLinkedin, FiGlobe, FiMail, FiPhone,
  FiSend, FiUserCheck, FiUserPlus,
} from 'react-icons/fi';
// WhatsApp / Telegram don't exist in react-icons/fi — use simple text emoji buttons
import API from '../utils/api';
import { downloadPdf, buildPdfUrl } from '../utils/downloadPdf';
import { useAuth } from '../context/AuthContext';
import BuyModal from '../components/BuyModal';
import { showToast } from '../components/Toast';

/* ─── constants ─────────────────────────────────────────────────────────── */
const BASE = process.env.REACT_APP_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000';
const absUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BASE}${url}`);

const TABS = [
  { id: 'preview',  label: 'Preview',  Icon: FiFileText     },
  { id: 'uploader', label: 'Uploader', Icon: FiUser          },
  { id: 'details',  label: 'Details',  Icon: FiInfo          },
  { id: 'comments', label: 'Comments', Icon: FiMessageSquare },
];

/* ─── helpers ────────────────────────────────────────────────────────────── */
const SectionLabel = ({ text }) => (
  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 mb-3">
    {text}
  </p>
);

const Card = ({ children, className = '' }) => (
  <div
    className={`rounded-2xl border border-white/8 p-4 ${className}`}
    style={{ background: 'rgba(255,255,255,0.025)' }}
  >
    {children}
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════ */
/*  PdfPageViewer                                                             */
/* ══════════════════════════════════════════════════════════════════════════ */
function PdfPageViewer({ pdfUrl, canViewFull, isPurchaseChecking, onBuy, note }) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const renderRef    = useRef(null);
  const docRef       = useRef(null);

  const [pdfDoc,      setPdfDoc]      = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages,  setTotalPages]  = useState(0);
  const [rendering,   setRendering]   = useState(false);
  const [loadError,   setLoadError]   = useState(false);

  const previewLimit = canViewFull ? Infinity : 3;

  /* ── load document ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!pdfUrl) return;
    let alive = true;
    setPdfDoc(null); setCurrentPage(1); setTotalPages(0); setLoadError(false);

    (async () => {
      try {
        const lib = await import('pdfjs-dist');
        lib.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${lib.version}/build/pdf.worker.min.mjs`;
        const doc = await lib.getDocument({
          url: absUrl(pdfUrl), verbosity: 0, useSystemFonts: true,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${lib.version}/cmaps/`,
          cMapPacked: true,
        }).promise;
        if (!alive) { doc.destroy(); return; }
        docRef.current = doc;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch { if (alive) setLoadError(true); }
    })();

    return () => { alive = false; docRef.current?.destroy(); docRef.current = null; };
  }, [pdfUrl]);

  /* ── render page ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    renderRef.current?.cancel();
    setRendering(true);
    let alive = true;

    (async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (!alive) return;
        const cw    = (containerRef.current?.clientWidth || 640) - 32;
        const vp0   = page.getViewport({ scale: 1 });
        const scale = Math.min(2.5, cw / vp0.width);
        const vp    = page.getViewport({ scale });
        const cv    = canvasRef.current;
        if (!cv) { page.cleanup(); return; }
        cv.width  = vp.width;
        cv.height = vp.height;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, vp.width, vp.height);
        const task = page.render({ canvasContext: ctx, viewport: vp });
        renderRef.current = task;
        await task.promise;
        page.cleanup();
        if (alive) setRendering(false);
      } catch (e) {
        if (alive && e?.name !== 'RenderingCancelledException') setRendering(false);
      }
    })();

    return () => { alive = false; renderRef.current?.cancel(); };
  }, [pdfDoc, currentPage]);

  const goPrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const goNext = () => setCurrentPage(p => Math.min(p + 1, Math.min(totalPages, previewLimit)));
  const showPaywall = !canViewFull && currentPage >= 3 && totalPages > 3;
  const displayTotal = canViewFull ? totalPages : Math.min(totalPages, 3);

  /* ── purchase still loading ─────────────────────────────────────────── */
  if (isPurchaseChecking) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Checking access…</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative"
        style={{ background: '#111120' }}
      >
        <div className="flex flex-col items-center p-4 min-h-full">
          {/* spinner overlay while rendering */}
          {rendering && (
            <div className="absolute inset-0 z-10 flex items-center justify-center"
              style={{ background: 'rgba(10,10,24,0.55)' }}>
              <div className="w-8 h-8 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
            </div>
          )}

          {pdfDoc ? (
            <div className="relative w-full">
              <canvas
                ref={canvasRef}
                className="w-full h-auto shadow-2xl"
                style={{ borderRadius: 2 }}
              />
              {/* paywall gradient fade */}
              {showPaywall && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-44 pointer-events-none"
                  style={{ background: 'linear-gradient(to bottom, transparent 0%, #0d0d18 90%)' }}
                  aria-hidden="true"
                />
              )}
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="text-5xl">📄</span>
              <p className="text-gray-400 text-sm">Could not load PDF</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Loading PDF…</p>
            </div>
          )}
        </div>
      </div>

      {/* page nav / paywall bar */}
      {showPaywall ? (
        <div
          className="flex-shrink-0 text-center p-5 border-t border-white/8"
          style={{ background: '#0d0d18' }}
        >
          <p className="text-white font-bold text-sm mb-1">🔒 Preview ends here</p>
          <p className="text-gray-400 text-xs mb-3">
            Purchase to unlock all {totalPages} pages
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onBuy}
            aria-label={`Buy full access for ₹${note?.price}`}
            className="px-6 py-2.5 text-white font-bold text-sm rounded-xl cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}
          >
            Buy ₹{note?.price} — Unlock All Pages
          </motion.button>
        </div>
      ) : totalPages > 0 ? (
        <div
          className="flex-shrink-0 h-12 flex items-center justify-center gap-4 border-t border-white/8"
          style={{ background: '#0d0d18' }}
        >
          <button
            onClick={goPrev}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/8 transition disabled:opacity-25 disabled:cursor-not-allowed"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <FiChevronLeft size={16} />
          </button>

          <span className="text-gray-400 text-sm select-none">
            Page <span className="text-white font-bold">{currentPage}</span> / {displayTotal}
          </span>

          <button
            onClick={goNext}
            disabled={currentPage >= displayTotal}
            aria-label="Next page"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/8 transition disabled:opacity-25 disabled:cursor-not-allowed"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  RatingWidget  –  POST /api/notes/:id/reviews { rating, comment }         */
/* ══════════════════════════════════════════════════════════════════════════ */
function RatingWidget({ noteId, notePrice, isPurchased }) {
  const [selected,  setSelected]  = useState(0);
  const [hover,     setHover]     = useState(0);
  const [comment,   setComment]   = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleSubmit = async () => {
    if (!selected) return showToast('Please select a star rating first', 'error');
    // Paid notes: must be purchased to review
    if (notePrice > 0 && !isPurchased) {
      return showToast('Purchase this note first to leave a review', 'error');
    }
    setLoading(true); setError('');
    try {
      // Correct endpoint: POST /api/notes/:id/reviews
      await API.post(`/notes/${noteId}/reviews`, {
        rating: selected,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      showToast('Review submitted! ⭐', 'success');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to submit review';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const display = hover || selected;

  if (submitted) return (
    <div className="text-center py-3">
      <div className="text-2xl mb-1" aria-hidden="true">⭐</div>
      <p className="text-green-400 text-sm font-semibold">Review submitted!</p>
      <p className="text-gray-500 text-xs mt-0.5">Thank you for your feedback</p>
    </div>
  );

  return (
    <>
      <SectionLabel text="Rate this note" />

      {/* Stars */}
      <div className="flex gap-2 mb-3 justify-center">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => setSelected(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <FiStar
              size={24}
              className={`transition-colors ${
                n <= display ? 'text-amber-400 fill-amber-400' : 'text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Optional comment */}
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Add a comment (optional)…"
        rows={2}
        className="w-full text-xs bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-gray-300 placeholder-gray-600 resize-none outline-none focus:border-violet-500/50 transition mb-3"
      />

      {error && <p className="text-red-400 text-xs mb-2 text-center">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || !selected}
        className="w-full py-2.5 rounded-xl text-sm font-bold border border-white/15 text-white hover:bg-white/8 transition disabled:opacity-40"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        {loading ? 'Submitting…' : 'Submit Rating'}
      </button>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Sidebar                                                                   */
/* ══════════════════════════════════════════════════════════════════════════ */
function Sidebar({
  note, uploader, moreNotes, noteId,
  following, followLoading, onFollow, onChat, isSelf, isPurchased,
}) {
  const navigate = useNavigate();

  const initials = (uploader?.name || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const metaRows = [
    { label: 'Subject',  value: note.subject   },
    { label: 'Branch',   value: note.branch    },
    { label: 'Semester', value: note.semester ? `${note.semester}th Sem` : null },
    { label: 'College',  value: note.college   },
    { label: 'Pages',    value: note.pages    ? `${note.pages} pages` : null   },
    { label: 'Year',     value: note.year      },
  ].filter(r => r.value);

  const topics = note.topics || note.tags || [];

  return (
    <div className="p-4 space-y-4">

      {/* ── UPLOADER ─────────────────────────────────────────────── */}
      <Card>
        <SectionLabel text="Uploader" />

        {/* avatar + name */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => uploader?._id && navigate(`/profile/${uploader._id}`)}
            aria-label={`View ${uploader?.name || 'uploader'}'s profile`}
            className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-full"
          >
            {uploader?.profileImage ? (
              <img
                src={absUrl(uploader.profileImage)}
                alt={uploader.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-base"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}
              >
                {initials}
              </div>
            )}
          </button>
          <div className="min-w-0">
            <button
              onClick={() => uploader?._id && navigate(`/profile/${uploader._id}`)}
              className="text-white font-bold text-sm leading-tight hover:text-violet-300 transition text-left"
            >
              {uploader?.name || 'Unknown'}
            </button>
            <p className="text-gray-400 text-xs mt-0.5 truncate">
              {[uploader?.college, uploader?.branch || uploader?.subject]
                .filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* stats row */}
        <div
          className="grid grid-cols-3 gap-3 mb-4 rounded-xl border border-white/8 p-3"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          {(() => {
            // Compute stats from profile data
            const uploadedNotes = uploader?.uploadedNotes || [];
            const notesCount = uploader?.notesCount
              ?? (uploadedNotes.length > 0 ? uploadedNotes.length : null)
              ?? '--';
            const totalDownloads = uploader?.totalDownloads
              ?? (uploadedNotes.length > 0
                  ? uploadedNotes.reduce((s, n) => s + (n.downloads || 0), 0)
                  : null)
              ?? '--';
            const avgRating = uploader?.avgRating
              ?? uploader?.rating
              ?? (uploadedNotes.length > 0
                  ? uploadedNotes.filter(n => n.rating > 0).reduce((s, n, _, a) => s + n.rating / a.length, 0)
                  : null);
            const ratingDisplay = avgRating
              ? Number(avgRating).toFixed(1)
              : '—';

            return [
              { label: 'Notes',     val: notesCount },
              { label: 'Rating',    val: ratingDisplay },
              { label: 'Downloads', val: totalDownloads },
            ].map(({ label, val }) => (
              <div key={label} className="text-center">
                <p className="text-white font-bold text-base leading-tight">{val}</p>
                <p className="text-gray-500 text-[10px] mt-0.5">{label}</p>
              </div>
            ));
          })()}
        </div>

        {/* ── Follow + Chat actions ────────────────────────────────────── */}
        {!isSelf && (
          <div className="space-y-2">
            {/* Follow */}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={onFollow}
              disabled={followLoading}
              aria-pressed={following}
              aria-label={following ? 'Unfollow uploader' : 'Follow uploader'}
              className={`w-full py-2.5 rounded-xl text-sm font-bold border transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${
                following
                  ? 'border-violet-500/40 text-violet-300 bg-violet-500/10 hover:bg-violet-500/15'
                  : 'border-white/15 text-white bg-white/5 hover:bg-white/10'
              }`}
            >
              {followLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : following ? (
                <><FiUserCheck size={14} aria-hidden="true" /> Following</>
              ) : (
                <><FiUserPlus size={14} aria-hidden="true" /> Follow</>
              )}
            </motion.button>

            {/* Direct Chat */}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={onChat}
              aria-label="Send a direct message"
              className="w-full py-2.5 rounded-xl text-sm font-semibold border border-white/10 text-gray-300 hover:text-white hover:bg-white/8 transition-all flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <FiSend size={13} aria-hidden="true" /> Direct Message
            </motion.button>
          </div>
        )}

        {/* ── Social links ────────────────────────────────────────────── */}
        {(() => {
          const sl = uploader?.socialLinks || {};
          const links = [
            sl.linkedin   && { href: sl.linkedin.startsWith('http') ? sl.linkedin : `https://linkedin.com/in/${sl.linkedin}`,   Icon: FiLinkedin,  label: 'LinkedIn',  color: '#0a66c2' },
            sl.github     && { href: sl.github.startsWith('http')   ? sl.github   : `https://github.com/${sl.github}`,           Icon: FiGithub,    label: 'GitHub',    color: '#e4e4e7' },
            sl.instagram  && { href: sl.instagram.startsWith('http')? sl.instagram: `https://instagram.com/${sl.instagram}`,     Icon: FiInstagram, label: 'Instagram', color: '#e1306c' },
            sl.email      && { href: `mailto:${sl.email}`,                                                                        Icon: FiMail,      label: 'Email',     color: '#a78bfa' },
            sl.whatsapp   && { href: `https://wa.me/${sl.whatsapp.replace(/\D/g, '')}`,                                           Icon: FiPhone,     label: 'WhatsApp',  color: '#25d366' },
            sl.telegram   && { href: sl.telegram.startsWith('http') ? sl.telegram : `https://t.me/${sl.telegram}`,               Icon: FiGlobe,     label: 'Telegram',  color: '#2aa3da' },
          ].filter(Boolean);

          if (!links.length) return null;
          return (
            <div className="flex gap-2 mt-3 flex-wrap">
              {links.map(({ href, Icon, label, color }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 hover:border-white/25 transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.05)', color }}
                >
                  <Icon size={16} aria-hidden="true" />
                </a>
              ))}
            </div>
          );
        })()}
      </Card>

      {/* ── NOTE DETAILS ─────────────────────────────────────────── */}
      {metaRows.length > 0 && (
        <Card>
          <SectionLabel text="Note Details" />
          <div className="space-y-2.5">
            {metaRows.map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between text-xs border-b border-white/6 pb-2.5 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2.5">
                  {/* checkbox-style icon (matches screenshot) */}
                  <div
                    className="w-3.5 h-3.5 rounded-sm border border-white/20 flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                    aria-hidden="true"
                  />
                  <span className="text-gray-400">{label}</span>
                </div>
                <span className="text-white font-semibold ml-3 text-right">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── TOPICS COVERED ───────────────────────────────────────── */}
      {topics.length > 0 && (
        <Card>
          <SectionLabel text="Topics Covered" />
          <div className="flex flex-wrap gap-2">
            {topics.map((t, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1 rounded-full border border-white/12 text-gray-300"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                {t}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* ── RATE THIS NOTE ───────────────────────────────────────── */}
      <Card>
        <RatingWidget noteId={noteId} notePrice={note.price} isPurchased={isPurchased} />
      </Card>

      {/* ── MORE FROM UPLOADER ───────────────────────────────────── */}
      {moreNotes.length > 0 && (
        <Card>
          <SectionLabel
            text={`More from ${uploader?.name?.split(' ')[0] || 'Uploader'}`}
          />
          <div className="space-y-1">
            {moreNotes.map(n => (
              <button
                key={n._id}
                onClick={() => navigate(`/note/${n._id}/preview`)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition text-left group"
              >
                <div
                  className="w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  aria-hidden="true"
                >
                  <FiFileText size={15} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate group-hover:text-violet-300 transition">
                    {n.title}
                  </p>
                  <p className="text-gray-500 text-[10px] mt-0.5">
                    {[n.college, n.semester ? `Sem ${n.semester}` : null]
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 border ${
                    n.price === 0
                      ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                      : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                  }`}
                >
                  {n.price === 0 ? 'FREE' : `₹${n.price}`}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* bottom padding for scrollable sidebar */}
      <div className="h-4" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Main Page                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */
export default function NotePreviewPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();

  const [note,          setNote]          = useState(null);
  const [uploader,      setUploader]      = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [isPurchased,   setIsPurchased]   = useState(null);
  const [buyNote,       setBuyNote]       = useState(null);
  const [activeTab,     setActiveTab]     = useState('preview');
  const [moreNotes,     setMoreNotes]     = useState([]);
  const [bookmarked,    setBookmarked]    = useState(false);
  const [following,     setFollowing]     = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  /* ── fetch note + enrich ──────────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(''); setNote(null); setUploader(null); setIsPurchased(null);

    (async () => {
      try {
        // GET /api/notes/:id  →  { success: true, data: noteObject }
        const res = await API.get(`/notes/${id}`);
        const noteData = res.data?.data || res.data;
        if (!alive) return;
        setNote(noteData);

        // uploadedBy is populated as { _id, name, email, college, isVerified }
        const uploaderBasic = noteData?.uploadedBy;
        if (uploaderBasic && typeof uploaderBasic === 'object' && uploaderBasic._id) {
          setUploader(uploaderBasic); // show basic info immediately
          const uid = uploaderBasic._id;

          // GET /api/profile/:id  →  { user: { ...fields, uploadedNotes: [] } }
          API.get(`/profile/${uid}`)
            .then(r => {
              if (!alive) return;
              // profileController.getPublicProfile wraps in { user: ... }
              const profileUser = r.data?.user ?? r.data;
              if (profileUser) {
                setUploader(profileUser);
                // Use uploadedNotes from the profile to populate "More from uploader"
                const others = (profileUser.uploadedNotes || [])
                  .filter(n => n._id?.toString() !== id)
                  .slice(0, 4);
                setMoreNotes(others);
              }
            })
            .catch(() => {}); // silently ignore — basic info already shown
        }

        const price = noteData?.price ?? 0;
        if (price > 0) {
          API.get(`/notes/${id}/check-purchase`)
            .then(r  => { if (alive) setIsPurchased(r.data.purchased === true); })
            .catch(() => { if (alive) setIsPurchased(false); });
        } else {
          setIsPurchased(true);
        }
      } catch (err) {
        if (alive) setError(err?.response?.data?.message || 'Failed to load note');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [id]);

  /* ── initial follow status ────────────────────────────────────────── */
  useEffect(() => {
    if (!uploader || !me) return;
    const myId = (me._id || me.id)?.toString();
    if (!myId) return;
    // Check uploader.followers array
    const inFollowers = Array.isArray(uploader.followers) &&
      uploader.followers.some(f =>
        (typeof f === 'string' ? f : f?._id?.toString?.()) === myId
      );
    // Also check me.following — more reliable since /profile populates it
    const inMyFollowing = Array.isArray(me.following) &&
      me.following.some(f =>
        (typeof f === 'string' ? f : f?._id?.toString?.()) === uploader._id?.toString()
      );
    setFollowing(inFollowers || inMyFollowing);
  }, [uploader, me]);

  const handleFollow = useCallback(async () => {
    if (!uploader?._id) return;
    setFollowLoading(true);
    try {
      await API.post('/profile/follow/toggle', { targetUserId: uploader._id });
      setFollowing(f => !f);
      showToast(following ? 'Unfollowed' : 'Now following!', 'success');
    } catch { showToast('Action failed', 'error'); }
    finally { setFollowLoading(false); }
  }, [uploader, following]);

  const handleChat = useCallback(() => {
    if (uploader?._id) navigate('/chat', { state: { startChatWith: uploader } });
  }, [uploader, navigate]);

  /* ── loading / error ─────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: '#0d0d18' }} role="status" aria-label="Loading">
      <div className="w-10 h-10 border-[3px] border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading preview…</p>
    </div>
  );

  if (error || !note) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: '#0d0d18' }}>
      <span className="text-5xl" aria-hidden="true">😕</span>
      <p className="text-gray-400" role="alert">{error || 'Note not found'}</p>
      <button onClick={() => navigate(-1)}
        className="px-5 py-2 bg-violet-500/15 border border-violet-500/30 rounded-xl text-violet-300 text-sm font-semibold hover:bg-violet-500/25 transition">
        ← Go Back
      </button>
    </div>
  );

  const isPaid             = note.price > 0;
  const canViewFull        = !isPaid || isPurchased === true;
  const isPurchaseChecking = isPaid && isPurchased === null;
  const isSelf             = me && uploader && (me._id === uploader._id || me.id === uploader._id);

  const headerSubtitle = [
    note.college,
    note.branch,
    note.pages ? `${note.pages} pages` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div
      className="h-screen flex flex-col overflow-hidden text-white"
      style={{ background: '#0d0d18', fontFamily: "'Inter',system-ui,sans-serif" }}
    >
      {/* ────────────────────── HEADER ─────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-4 border-b border-white/8 z-40"
        style={{ height: 60, background: '#0d0d18' }}
      >
        {/* back */}
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg border border-white/12 text-gray-400 hover:text-white hover:bg-white/8 transition"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <FiArrowLeft size={17} aria-hidden="true" />
        </button>

        {/* title + subtitle */}
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-[15px] truncate leading-tight">{note.title}</h1>
          {headerSubtitle && (
            <p className="text-gray-500 text-xs truncate mt-0.5">{headerSubtitle}</p>
          )}
        </div>

        {/* right actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* bookmark */}
          <button
            onClick={() => {
              setBookmarked(b => !b);
              showToast(bookmarked ? 'Bookmark removed' : 'Bookmarked!', 'success');
            }}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark note'}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/12 text-gray-400 hover:text-white hover:bg-white/8 transition"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <FiBookmark
              size={16}
              aria-hidden="true"
              className={bookmarked ? 'fill-violet-400 text-violet-400' : ''}
            />
          </button>

          {/* share */}
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href).catch(() => {});
              showToast('Link copied!', 'success');
            }}
            aria-label="Copy link"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/12 text-gray-400 hover:text-white hover:bg-white/8 transition"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <FiShare2 size={16} aria-hidden="true" />
          </button>

          {/* download / buy */}
          {canViewFull ? (
            <button
              onClick={() => downloadPdf(buildPdfUrl(note.pdfUrl), note.title)}
              aria-label="Download PDF"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-white text-sm font-bold hover:bg-white/8 transition"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <FiDownload size={14} aria-hidden="true" />
              Download{!isPaid ? ' Free' : ''}
            </button>
          ) : (
            <button
              onClick={() => setBuyNote(note)}
              aria-label={`Buy full access for ₹${note.price}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-bold transition"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}
            >
              <FiShoppingCart size={14} aria-hidden="true" />
              ₹{note.price}
            </button>
          )}
        </div>
      </header>

      {/* ────────────────────── TAB BAR ────────────────────────────── */}
      <nav
        className="flex-shrink-0 flex border-b border-white/8"
        style={{ background: '#0d0d18' }}
        role="tablist"
        aria-label="Content sections"
      >
        {TABS.map(({ id: tid, label, Icon }) => (
          <button
            key={tid}
            role="tab"
            aria-selected={activeTab === tid}
            onClick={() => setActiveTab(tid)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === tid
                ? 'text-white border-violet-500'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            <Icon size={12} aria-hidden="true" className="flex-shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* ────────────────────── BODY ───────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* LEFT – PDF viewer
            Desktop: always visible
            Mobile:  only on "preview" tab */}
        <div
          role="tabpanel"
          aria-label="PDF preview"
          className={`flex-1 min-w-0 flex flex-col border-r border-white/8 ${
            activeTab !== 'preview' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {note.pdfUrl ? (
            <PdfPageViewer
              pdfUrl={note.pdfUrl}
              canViewFull={canViewFull}
              isPurchaseChecking={isPurchaseChecking}
              onBuy={() => setBuyNote(note)}
              note={note}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <span className="text-5xl" aria-hidden="true">📄</span>
              <p className="text-gray-500 text-sm">No PDF available for this note</p>
            </div>
          )}
        </div>

        {/* RIGHT – Sidebar
            Desktop: always visible, fixed width
            Mobile:  full width on any non-preview tab */}
        <div
          role="tabpanel"
          aria-label="Note information"
          className={`overflow-y-auto flex-shrink-0 ${
            activeTab === 'preview' ? 'hidden lg:block' : 'block w-full'
          } lg:w-[380px]`}
          style={{
            background: '#0d0d18',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(139,92,246,0.2) transparent',
          }}
        >
          <Sidebar
            note={note}
            uploader={uploader}
            moreNotes={moreNotes}
            noteId={id}
            following={following}
            followLoading={followLoading}
            onFollow={handleFollow}
            onChat={handleChat}
            isSelf={isSelf}
            isPurchased={isPurchased}
          />
        </div>
      </div>

      {/* ────────────────────── BUY MODAL ──────────────────────────── */}
      <AnimatePresence>
        {buyNote && (
          <BuyModal
            note={buyNote}
            onClose={() => setBuyNote(null)}
            onSuccess={() => setIsPurchased(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
