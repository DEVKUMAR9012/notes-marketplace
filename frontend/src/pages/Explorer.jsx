import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback, useRef, forwardRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FiDownload, FiEye, FiStar, FiUser, FiMapPin,
  FiSearch, FiFilter, FiX, FiHeart, FiShoppingCart, FiChevronDown, FiArrowLeft, FiMessageCircle
} from 'react-icons/fi';
import API from '../utils/api';
import { downloadPdf, buildPdfUrl } from '../utils/downloadPdf';
import { useAuth } from '../context/AuthContext';
import PDFThumbnail from '../components/PDFThumbnail';
import BuyModal from '../components/BuyModal';
import { showToast } from '../components/Toast';
import { usePdfPreview } from '../hooks/usePdfPreview';

// ─── WISHLIST HOOK (persisted in localStorage) ───────────────────────────────
const useWishlist = () => {
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nm_wishlist') || '[]'); }
    catch { return []; }
  });
  const toggle = useCallback((id) => {
    setWishlist(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('nm_wishlist', JSON.stringify(next));
      return next;
    });
  }, []);
  return { wishlist, toggle };
};

// ─── DEBOUNCE HOOK ────────────────────────────────────────────────────────────
const useDebounce = (value, delay = 300) => {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
};

// ─── SKELETON CARD ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 animate-pulse">
    <div className="h-52 bg-white/10" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-white/10 rounded w-3/4" />
      <div className="flex gap-2">
        <div className="h-5 bg-white/10 rounded-full w-20" />
        <div className="h-5 bg-white/10 rounded-full w-14" />
      </div>
      <div className="h-3 bg-white/10 rounded w-1/2" />
      <div className="flex gap-2 pt-1">
        <div className="h-9 bg-white/10 rounded-xl flex-1" />
        <div className="h-9 bg-white/10 rounded-xl flex-1" />
      </div>
    </div>
  </div>
);

// ─── PREVIEW MODAL ────────────────────────────────────────────────────────────
const PreviewModal = ({ note, onClose, onBuy }) => {
  const modalRef = useRef(null);
  const [purchaseStatus, setPurchaseStatus] = useState(null);

  const isPaid      = note.price > 0;
  const canViewFull = !isPaid || purchaseStatus === true;

  // ── Scroll lock ──────────────────────────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Focus trap + Escape (combined, no duplicate handlers) ────────────────
  useEffect(() => {
    if (!modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    const handleKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    first?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // ── Purchase check (AbortController – no deprecated CancelToken) ─────────
  useEffect(() => {
    if (!isPaid) { setPurchaseStatus(null); return; }
    const ctrl = new AbortController();
    API.get(`/notes/${note._id}/check-purchase`)
      .then(r => { if (!ctrl.signal.aborted) setPurchaseStatus(r.data.purchased === true); })
      .catch(err => { if (err?.name !== 'AbortError' && !ctrl.signal.aborted) setPurchaseStatus(false); });
    return () => ctrl.abort();
  }, [note._id, isPaid]);

  // ── PDF preview pages (shared hook – memory-safe, canvas cleanup) ────────
  const { pages, loading: pagesLoading } = usePdfPreview(
    note.pdfUrl,
    !!(isPaid && purchaseStatus === false),
    3
  );

  const absUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000'}${url}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      aria-hidden="true"
    >
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-gray-950 border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
        style={{ height: 'clamp(70vh, 85vh, 90vh)' }}
        role="dialog"
        aria-modal="true"
        aria-label={`Preview: ${note.title}`}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-gray-900/80">
          <div className="truncate pr-4">
            <p className="text-white font-semibold text-sm truncate">{note.title}</p>
            <p className="text-gray-500 text-xs">
              {note.subject}{note.semester ? ` • Sem ${note.semester}` : ''}
              {isPaid && !canViewFull && <span className="ml-2 text-amber-400 font-medium">🔒 Preview — first 3 pages</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canViewFull && (
              <button
                onClick={() => downloadPdf(absUrl(note.pdfUrl), note.title)}
                aria-label="Download PDF"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs text-white font-medium transition"
              >
                <FiDownload aria-hidden="true" /> {isPaid ? 'Download' : 'Open Full'}
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="p-1.5 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white"
            >
              <FiX className="text-lg" aria-hidden="true" />
            </button>
          </div>
        </div>

        {isPaid && purchaseStatus === null ? (
          <div className="w-full flex items-center justify-center" style={{ height: 'calc(100% - 57px)' }} role="status">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : canViewFull ? (
          <iframe
            src={`${absUrl(note.pdfUrl)}#toolbar=0&navpanes=0`}
            className="w-full bg-white"
            style={{ height: 'calc(100% - 57px)' }}
            title={`PDF: ${note.title}`}
          />
        ) : (
          <div className="overflow-y-auto bg-gray-900 relative" style={{ height: 'calc(100% - 57px)' }}>
            {pagesLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3" role="status">
                <div className="w-8 h-8 border-2 border-white/30 border-t-violet-400 rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">Loading preview...</p>
              </div>
            ) : (
              <>
                {pages.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt={`Preview page ${i + 1}`} className="w-full block" />
                    {i === pages.length - 1 && (
                      <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
                        style={{ background: 'linear-gradient(to bottom, transparent 20%, rgba(7,7,15,0.85) 65%, rgba(7,7,15,1) 100%)' }}
                      />
                    )}
                  </div>
                ))}
                <div className="sticky bottom-0 w-full bg-gray-950/95 backdrop-blur-lg border-t border-white/10 p-5 text-center">
                  <div className="text-3xl mb-2" aria-hidden="true">🔒</div>
                  <p className="text-white font-bold text-base mb-1">Preview ends here</p>
                  <p className="text-gray-400 text-xs mb-4">Purchase to unlock all pages and download</p>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { onClose(); onBuy(note); }}
                    aria-label={`Buy full access for ₹${note.price}`}
                    className="px-7 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl text-white font-bold text-sm shadow-lg shadow-violet-500/30 transition-all"
                  >
                    Buy ₹{note.price} — Unlock Full Access
                  </motion.button>
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── TILT CARD WRAPPER ────────────────────────────────────────────────────────
const TiltCard = ({ children, className }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-6, 6]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  // Respect prefers-reduced-motion for users who opt out of animations
  const [reducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tiltDisabled = isMobile || reducedMotion;

  const onMove = (e) => {
    if (!ref.current || tiltDisabled) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={tiltDisabled ? {} : { rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 1000 }}
      className={className}>
      {children}
    </motion.div>
  );
};

// ─── NOTE CARD ────────────────────────────────────────────────────────────────
const NoteCard = forwardRef(({ note, onPreview, onBuy, onAddToCart, gradient, isWishlisted, onToggleWishlist, onChat }, ref) => {
  const [hovered, setHovered] = useState(false);
  const [wishAnim, setWishAnim] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiSparkle, setAISparkle] = useState(false);

  const stars = Math.min(5, Math.max(0, Math.round(note.rating || 0)));
  const isTrending = (note.downloads || 0) > 50;
  const isTopRated = (note.rating || 0) >= 4.5;

  const handleWish = (e) => {
    e.stopPropagation();
    setWishAnim(true);
    setTimeout(() => setWishAnim(false), 600);
    onToggleWishlist(note._id);
  };

  return (
    <div className="h-full" ref={ref}>
      <TiltCard className="group relative h-full">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 rounded-2xl blur opacity-0 group-hover:opacity-60 transition-all duration-500 pointer-events-none" />
        <motion.div
          className="relative h-full bg-[#0d0d1a]/90 border border-white/10 rounded-2xl p-4 flex flex-col justify-between overflow-hidden backdrop-blur-xl group-hover:border-white/20 transition-all duration-300"
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
        >
          {/* Thumbnail area */}
          <div className="relative h-36 sm:h-52 flex-shrink-0 overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
            <div className="absolute inset-0"><PDFThumbnail pdfUrl={note.pdfUrl} title={note.title} note={note} /></div>
            
            {/* Hover overlay buttons */}
            <AnimatePresence>
              {hovered && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 z-20"
                >
                  {[
                    { icon: FiEye, label: 'Preview', cls: 'bg-white/15 hover:bg-white/25 border-white/20', fn: (e) => { e.stopPropagation(); onPreview(note); } },
                    { icon: FiShoppingCart, label: 'Cart', cls: 'bg-indigo-600/80 hover:bg-indigo-700 border-indigo-500/50', fn: (e) => { e.stopPropagation(); onAddToCart(note); } },
                    { icon: FiDownload, label: note.price === 0 ? 'Free' : `₹${note.price}`, cls: 'bg-violet-600/80 hover:bg-violet-600 border-violet-500/50', fn: (e) => { e.stopPropagation(); onBuy(note); } },
                    { icon: FiHeart, label: isWishlisted ? 'Saved' : 'Save', cls: isWishlisted ? 'bg-pink-600/80 hover:bg-pink-700 border-pink-500/50' : 'bg-white/10 hover:bg-pink-600/60 border-white/15', fn: handleWish },
                  ].map(({ icon: Icon, label, cls, fn }, i) => (
                    <motion.button
                      key={i} whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }} onClick={fn}
                      className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl border text-white transition-all shadow-lg ${cls}`}
                    >
                      <Icon className="text-base" />
                      <span className="text-[7px] font-black uppercase tracking-tighter mt-1">{label}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Badges */}
            <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
              {isTrending && <span className="text-[8px] tracking-widest font-black uppercase bg-gradient-to-r from-amber-500 to-orange-600 text-white px-2 py-0.5 rounded-full shadow-md shadow-orange-950/50">🔥 Trending</span>}
              {isTopRated && <span className="text-[8px] tracking-widest font-black uppercase bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-2 py-0.5 rounded-full shadow-md shadow-blue-950/50">⭐ Top Rated</span>}
            </div>

            {/* Cart button – always visible so mobile users can add to cart */}
            <button
              onClick={(e) => { e.stopPropagation(); onAddToCart(note); }}
              aria-label="Add to cart"
              className="absolute top-2.5 right-[52px] p-2 bg-black/40 backdrop-blur-md rounded-xl text-gray-300 hover:text-violet-400 border border-white/10 hover:border-violet-500/30 transition z-10"
            >
              <FiShoppingCart className="text-sm" aria-hidden="true" />
            </button>

            {/* Wishlist heart – always visible */}
            <button
              onClick={handleWish}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={isWishlisted}
              className="absolute top-2.5 right-2.5 p-2 bg-black/40 backdrop-blur-md rounded-xl text-gray-300 hover:text-pink-500 border border-white/10 hover:border-pink-500/30 transition z-10"
            >
              <motion.div animate={wishAnim ? { scale: [1, 1.4, 0.9, 1.2, 1] } : {}} aria-hidden="true">
                <FiHeart className={`text-sm ${isWishlisted ? 'text-pink-500 fill-pink-500' : ''}`} />
              </motion.div>
            </button>
          </div>

          {/* Details */}
          <div className="mt-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-white font-bold text-sm sm:text-base leading-snug tracking-tight mb-2 line-clamp-1 group-hover:text-violet-300 transition-colors">
                {note.title}
              </h3>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${note.itemType === 'book'
                  ? 'bg-pink-500/15 text-pink-300 border-pink-500/25'
                  : 'bg-violet-500/15 text-violet-300 border-violet-500/25'
                }`}>
                  {note.itemType === 'book' ? '📚 Book' : '📝 Note'}
                </span>
                <span className="text-[11px] bg-white/5 text-gray-300 border border-white/10 px-2 py-0.5 rounded-full">
                  {note.subject}
                </span>
                {note.semester && (
                  <span className="text-[11px] bg-white/5 text-gray-300 border border-white/10 px-2 py-0.5 rounded-full">
                    Sem {note.semester}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3 text-gray-500">
                <div className="flex items-center gap-1 text-[11px] max-w-[120px]">
                  <FiUser className="text-xs flex-shrink-0" />
                  <span className="truncate">{note.uploadedBy?.name || 'Academic Creator'}</span>
                  {note.uploadedBy?._id && onChat && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onChat(note.uploadedBy); }}
                      className="text-violet-400 hover:text-violet-300 ml-1 bg-violet-500/10 hover:bg-violet-500/20 p-1 rounded-full transition-colors flex-shrink-0"
                      title="Chat with uploader"
                      aria-label={`Chat with ${note.uploadedBy.name}`}
                    >
                      <FiMessageCircle className="text-[10px]" />
                    </button>
                  )}
                </div>
                <span className="text-[10px]">•</span>
                <div className="flex items-center gap-1 text-[11px] max-w-[130px]">
                  <FiMapPin className="text-xs flex-shrink-0" />
                  <span className="truncate">{note.college || 'Various Colleges'}</span>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            {note.aiSummary && (
              <div className="mb-3">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAI(!showAI);
                    setAISparkle(true);
                    setTimeout(() => setAISparkle(false), 800);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative w-full py-1.5 px-3 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all overflow-hidden ${showAI
                      ? 'bg-violet-500/20 border border-violet-400/30 text-violet-300'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:text-violet-300 hover:border-violet-500/30 hover:bg-violet-500/10'
                    }`}
                >
                  <AnimatePresence>
                    {aiSparkle && (
                      <>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <motion.span
                            key={i}
                            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                            animate={{
                              opacity: 0,
                              scale: 1.5,
                              x: (Math.random() - 0.5) * 80,
                              y: (Math.random() - 0.5) * 40
                            }}
                            transition={{ duration: 0.6 }}
                            className="absolute text-yellow-400 text-xs pointer-events-none"
                            style={{ left: '50%', top: '50%' }}
                          >
                            ✨
                          </motion.span>
                        ))}
                      </>
                    )}
                  </AnimatePresence>
                  <span>✨ {showAI ? 'Hide AI Summary' : 'View AI Summary'}</span>
                </motion.button>
                <AnimatePresence>
                  {showAI && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="bg-violet-950/30 border border-violet-500/20 rounded-lg p-2.5 mt-1.5 overflow-hidden text-[11px] text-violet-200 leading-relaxed italic"
                    >
                      {note.aiSummary}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <div className="flex items-center gap-0.5 mb-4">
              {[1, 2, 3, 4, 5].map(s => <FiStar key={s} className={`text-[10px] ${s <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`} />)}
              <span className="text-[10px] text-gray-600 ml-1">({note.reviews || 0})</span>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button onClick={() => onPreview(note)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white transition">Preview</button>
              <button onClick={() => onBuy(note)} className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl text-xs font-bold text-white shadow-lg shadow-violet-500/10 transition-all">{note.price === 0 ? 'Free' : `₹${note.price}`}</button>
            </div>
          </div>
        </motion.div>
      </TiltCard>
    </div>
  );
});

// ─── GRID SECTION ─────────────────────────────────────────────────────────────
const Section = ({ notes, onPreview, onBuy, onAddToCart, wishlist, onToggleWishlist, gradients, onChat }) => (
  notes.length === 0
    ? null
    : <motion.div layout className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
      <AnimatePresence mode="popLayout">
        {notes.map(note => (
          <NoteCard key={note._id} note={note} onPreview={onPreview} onBuy={onBuy} onAddToCart={onAddToCart}
            gradient={gradients(note._id)} isWishlisted={wishlist.includes(note._id)} onToggleWishlist={onToggleWishlist} onChat={onChat} />
        ))}
      </AnimatePresence>
    </motion.div>
);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const GRADIENTS = [
  'from-rose-500/50 to-orange-500/50', 'from-blue-500/50 to-cyan-500/50',
  'from-purple-500/50 to-pink-500/50', 'from-green-500/50 to-emerald-500/50',
  'from-indigo-500/50 to-violet-500/50', 'from-yellow-500/50 to-amber-500/50',
  'from-teal-500/50 to-blue-500/50', 'from-red-500/50 to-rose-500/50',
];

export default function Explorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read initial params from URL search
  const querySearch = searchParams.get('search') || '';
  const queryCollege = searchParams.get('college') || '';

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, hasMore: true, total: 0 });
  
  // Initialize with URL values
  const [searchInput, setSearchInput] = useState(querySearch);
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    subject: '',
    semester: '',
    college: queryCollege,
    priceType: '',
    minRating: ''
  });
  const [activeTab, setActiveTab] = useState('all');
  const [previewNote, setPreviewNote] = useState(null);
  const [buyNote, setBuyNote] = useState(null);
  const { wishlist, toggle: toggleWishlist } = useWishlist();
  const { user } = useAuth();
  
  const debouncedSearch = useDebounce(searchInput, 400);
  const searchRef = useRef(null);
  const sentinelRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Sync params changes back to state (e.g. when back-navigating or using Navbar)
  useEffect(() => {
    setSearchInput(querySearch);
    setFilters(f => ({ ...f, college: queryCollege }));
  }, [querySearch, queryCollege]);

  // Helper: get sort parameters based on activeTab
  const getSortParams = useCallback(() => {
    switch (activeTab) {
      case 'trending': return { sort: 'downloads', order: 'desc' };
      case 'top': return { sort: 'rating', order: 'desc' };
      case 'new': return { sort: 'createdAt', order: 'desc' };
      default: return { sort: 'createdAt', order: 'desc' };
    }
  }, [activeTab]);

  // Build query params including all filters, search, and sort
  const buildParams = useCallback((page = 1) => {
    const params = { page, limit: 12, ...getSortParams() };
    if (debouncedSearch) params.search = debouncedSearch;
    if (filters.subject) params.subject = filters.subject;
    if (filters.semester) params.semester = filters.semester;
    if (filters.college) params.college = filters.college;
    if (filters.priceType) params.priceType = filters.priceType;
    if (filters.minRating) params.minRating = filters.minRating;
    return params;
  }, [debouncedSearch, filters, getSortParams]);

  // Fetch notes (resets list when filters/tab changes)
  const fetchNotes = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const { data } = await API.get('/notes', { params: buildParams(1) });
      setNotes(data.notes || []);
      setPagination({ page: 1, hasMore: data.pagination.hasMore, total: data.pagination.total });
    } catch (e) { console.error(e); }
    finally { setLoading(false); isFetchingRef.current = false; }
  }, [buildParams]);

  // Load next page (preserves current tab & filters)
  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !pagination.hasMore) return;
    isFetchingRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pagination.page + 1;
      const { data } = await API.get('/notes', { params: buildParams(nextPage) });
      setNotes(prev => [...prev, ...(data.notes || [])]);
      setPagination({ page: nextPage, hasMore: data.pagination.hasMore, total: data.pagination.total });
    } catch (e) { console.error(e); }
    finally { setLoadingMore(false); isFetchingRef.current = false; }
  }, [pagination, buildParams]);

  // Always fetch on mount, and whenever debouncedSearch, activeTab, or filters change
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes, debouncedSearch, activeTab, filters.subject, filters.semester, filters.college, filters.priceType, filters.minRating]);

  // Sync state to URL search parameters for consistency & direct links
  useEffect(() => {
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (filters.college) params.college = filters.college;
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, filters.college, setSearchParams]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadMore(); }, { threshold: 0.1 });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loadMore]);

  // Client-side suggestions from already fetched notes
  useEffect(() => {
    if (debouncedSearch.length > 1) {
      const s = notes.filter(n => n.title?.toLowerCase().includes(debouncedSearch.toLowerCase())).slice(0, 5).map(n => n.title);
      setSuggestions(s);
      setShowSug(s.length > 0);
    } else { setSuggestions([]); setShowSug(false); }
  }, [debouncedSearch, notes]);

  const handlePreview = (note) => {
    if (note.pdfUrl) navigate(`/note/${note._id}/preview`);
    else showToast('Preview not available', 'error');
  };
  const handleBuy = (note) => {
    if (note.price === 0 && note.pdfUrl) {
      downloadPdf(buildPdfUrl(note.pdfUrl), note.title);
    } else {
      setBuyNote(note);
    }
  };

  const handleAddToCart = async (note) => {
    try {
      if (!user) return showToast('Please login first to use cart', 'error');
      await API.post('/profile/cart/toggle', { noteId: note._id });
      showToast(`Added "${note.title}" to cart`, 'success');
    } catch (e) {
      showToast('Failed to add to cart', 'error');
    }
  };

  const handleChat = useCallback((uploader) => {
    navigate('/chat', { state: { startChatWith: uploader } });
  }, [navigate]);

  const subjects = useMemo(() => [...new Set(notes.map(n => n.subject).filter(Boolean))], [notes]);
  const semesters = useMemo(() => [...new Set(notes.map(n => n.semester).filter(Boolean))].sort(), [notes]);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const clearFilters = () => setFilters({ subject: '', semester: '', college: '', priceType: '', minRating: '' });
  const getGradient = (id) => GRADIENTS[(id?.length ? id.charCodeAt(0) : 0) % GRADIENTS.length];

  const tabs = [
    { id: 'all', label: 'All Notes', icon: '📚' },
    { id: 'trending', label: 'Trending', icon: '🔥' },
    { id: 'top', label: 'Top Rated', icon: '⭐' },
    { id: 'new', label: 'New', icon: '🆕' },
    { id: 'wishlist', label: `Saved (${wishlist.length})`, icon: '❤️' },
  ];

  const [wishlistNotes, setWishlistNotes] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  useEffect(() => {
    if (activeTab === 'wishlist') {
      const fetchWishlistNotes = async () => {
        if (wishlist.length === 0) {
          setWishlistNotes([]);
          return;
        }
        setLoadingWishlist(true);
        try {
          const idsParam = wishlist.join(',');
          const { data } = await API.get('/notes', { params: { ids: idsParam, limit: 50 } });
          setWishlistNotes(data.notes || []);
        } catch (err) {
          console.error('Failed to fetch wishlist notes', err);
          setWishlistNotes([]);
        } finally {
          setLoadingWishlist(false);
        }
      };
      fetchWishlistNotes();
    }
  }, [activeTab, wishlist]);

  const displayedNotes = activeTab === 'wishlist' ? wishlistNotes : notes;
  const isLoading = activeTab === 'wishlist' ? loadingWishlist : loading;

  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-800/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-800/12 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-10 w-[300px] h-[300px] bg-blue-800/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14">
        {/* Header Back Button & Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              aria-label="Go to home"
              className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all text-gray-300 hover:text-white"
            >
              <FiArrowLeft className="text-lg" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Academic Explorer</h1>
              <p className="text-xs text-gray-400">Search, filter, and access study materials instantly</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          {!isLoading && (
            <div className="px-4 py-2 bg-[#0d0d1a] border border-white/10 rounded-2xl flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-xs font-bold text-violet-300">
                {activeTab === 'wishlist' ? `${wishlist.length} Saved` : `${pagination.total} Available Notes`}
              </span>
            </div>
          )}
        </div>

        {/* Search + Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1" ref={searchRef}>
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setShowSug(true); }}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                onFocus={() => suggestions.length && setShowSug(true)}
                placeholder="Search notes, subjects, authors..."
                aria-label="Search notes"
                className="w-full pl-11 pr-10 py-3.5 bg-white/5 border border-white/10 hover:border-white/20 focus:border-violet-500/60 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                >
                  <FiX aria-hidden="true" />
                </button>
              )}
              <AnimatePresence>
                {showSug && suggestions.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/15 rounded-xl overflow-hidden shadow-2xl z-50">
                    {suggestions.map((s, i) => (
                      <button key={i} onMouseDown={() => { setSearchInput(s); setShowSug(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/8 hover:text-white transition flex items-center gap-2">
                        <FiSearch className="text-gray-600 text-xs" /> {s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowFilters(v => !v)}
              aria-label={showFilters ? 'Hide filters' : 'Show filters'}
              aria-expanded={showFilters}
              className={`relative px-4 py-3 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all ${showFilters ? 'bg-violet-600/30 border-violet-500/60 text-violet-300' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
            >
              <FiFilter aria-hidden="true" /> <span className="hidden sm:inline">Filters</span>
              <FiChevronDown className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} aria-hidden="true" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-fuchsia-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center" aria-label={`${activeFilterCount} active filters`}>{activeFilterCount}</span>
              )}
            </motion.button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                <div className="flex flex-wrap gap-3 p-4 bg-white/4 border border-white/10 rounded-xl mb-3">
                  <select value={filters.subject} onChange={e => setFilters(f => ({ ...f, subject: e.target.value }))}
                    className="bg-gray-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500/60 cursor-pointer">
                    <option value="">All Subjects</option>
                    {subjects.map(s => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
                  </select>
                  <select value={filters.semester} onChange={e => setFilters(f => ({ ...f, semester: e.target.value }))}
                    className="bg-gray-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500/60 cursor-pointer">
                    <option value="">All Semesters</option>
                    {semesters.map(s => <option key={s} value={s} className="bg-gray-900">Sem {s}</option>)}
                  </select>
                  <div className="flex gap-2">
                    {[{ val: '', label: 'All Price' }, { val: 'free', label: '🎓 Free' }, { val: 'paid', label: '💰 Paid' }].map(({ val, label }) => (
                      <button key={val} onClick={() => setFilters(f => ({ ...f, priceType: val }))}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${filters.priceType === val ? 'bg-violet-600 text-white border-violet-500' : 'bg-white/8 text-gray-400 border-white/10 hover:text-white'}`}>{label}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Rating:</span>
                    {['', '3', '4', '4.5'].map(r => (
                      <button key={r} onClick={() => setFilters(f => ({ ...f, minRating: r }))}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filters.minRating === r ? 'bg-yellow-500/80 text-white border-yellow-500/50' : 'bg-white/8 text-gray-400 border-white/10 hover:text-white'}`}>
                        {r ? `⭐${r}+` : 'Any'}
                      </button>
                    ))}
                  </div>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-white transition"><FiX /> Clear all</button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isLoading && (
            <p className="text-xs text-gray-600">
              Showing {displayedNotes.length} of {activeTab === 'wishlist' ? wishlist.length : pagination.total} notes
              {debouncedSearch && <span className="text-violet-400"> for "{debouncedSearch}"</span>}
            </p>
          )}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-8 scrollbar-none">
          {tabs.map(tab => (
            <motion.button key={tab.id} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${activeTab === tab.id ? 'bg-white/12 text-white border border-white/20' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
              {tab.icon} {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {displayedNotes.length === 0 ? (
                <div className="text-center py-24">
                  <div className="text-6xl mb-4">{activeTab === 'wishlist' ? '❤️' : '🔍'}</div>
                  <p className="text-gray-400 text-xl font-semibold mb-2">
                    {activeTab === 'wishlist' ? 'No saved notes yet' : 'No notes found'}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {activeTab === 'wishlist' ? 'Click ❤️ on any note to save it' : 'Try different filters or search terms'}
                  </p>
                  {activeTab !== 'wishlist' && (debouncedSearch || activeFilterCount > 0) && (
                    <button onClick={() => { setSearchInput(''); clearFilters(); }}
                      className="mt-4 px-4 py-2 text-sm text-violet-400 border border-violet-500/40 rounded-lg hover:bg-violet-500/10 transition">
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <Section notes={displayedNotes} onPreview={handlePreview} onBuy={handleBuy} onAddToCart={handleAddToCart}
                  wishlist={wishlist} onToggleWishlist={toggleWishlist} gradients={getGradient} onChat={handleChat} />
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Infinite Scroll Sentinel */}
        {!isLoading && activeTab !== 'wishlist' && pagination.hasMore && (
          <div ref={sentinelRef} className="h-8 flex items-center justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <div className="w-4 h-4 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
                Loading more...
              </div>
            )}
          </div>
        )}
        {!isLoading && activeTab !== 'wishlist' && !pagination.hasMore && notes.length > 0 && (
          <p className="text-center text-gray-600 text-[10px] uppercase font-bold tracking-tighter mt-6">✨ You've reached the end ✨</p>
        )}
      </div>



      {/* Payment Modal – shared accessible BuyModal (focus trap + scroll lock) */}
      <AnimatePresence>
        {buyNote && (
          <BuyModal
            note={buyNote}
            onClose={() => setBuyNote(null)}
            onSuccess={() => setBuyNote(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
