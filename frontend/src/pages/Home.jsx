import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FiDownload, FiEye, FiStar, FiUser, FiMapPin,
  FiSearch, FiFilter, FiX, FiBook, FiTrendingUp,
  FiZap, FiHeart, FiShoppingCart, FiAward, FiChevronDown
} from 'react-icons/fi';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import PDFThumbnail from '../components/PDFThumbnail';
import PaymentButton from '../components/PaymentButton';

// ─── WISHLIST HOOK ────────────────────────────────────────────────────────────
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

// ─── SKELETON ─────────────────────────────────────────────────────────────────
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
  const [purchaseStatus, setPurchaseStatus] = useState(null); // null=checking, true/false
  const [pages, setPages]         = useState([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const cancelRef = useRef(false);

  const isPaid     = note.price > 0;
  const canViewFull = !isPaid || purchaseStatus === true;

  // Keyboard / scroll lock
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);

  // Check if user already purchased this paid note
  // ✅ Use fetch directly — API interceptor redirects to /login on 401 which kills the modal
  useEffect(() => {
    if (!isPaid) { setPurchaseStatus(null); return; }
    const token = localStorage.getItem('token');
    if (!token) { setPurchaseStatus(false); return; }
    fetch(`${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL : 'http://localhost:5000/api'}/notes/${note._id}/check-purchase`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setPurchaseStatus(data.purchased === true))
      .catch(() => setPurchaseStatus(false)); // on error → show limited preview
  }, [note._id, isPaid]);

  // Render first 3 pages for paid+unpurchased notes
  useEffect(() => {
    if (isPaid && purchaseStatus === null) return; // still checking
    if (canViewFull) { setPagesLoading(false); return; }

    cancelRef.current = false;
    setPagesLoading(true);
    setPages([]);

    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
        if (cancelRef.current) return;

        const fullUrl = note.pdfUrl?.startsWith('http')
          ? note.pdfUrl : `${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000'}${note.pdfUrl}`;

        const pdf  = await pdfjsLib.getDocument({
          url: fullUrl,
          verbosity: 0,
          useSystemFonts: true,
          // ✅ jsDelivr for cMaps (separate from the worker file)
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        }).promise;
        const numP = Math.min(3, pdf.numPages);
        const rendered = [];

        for (let i = 1; i <= numP; i++) {
          if (cancelRef.current) break;
          const page     = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas   = document.createElement('canvas');
          canvas.width   = viewport.width;
          canvas.height  = viewport.height;
          const ctx      = canvas.getContext('2d');
          ctx.fillStyle  = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;
          rendered.push(canvas.toDataURL('image/jpeg', 0.9));
          page.cleanup();
        }
        if (!cancelRef.current) { setPages(rendered); pdf.destroy(); }
      } catch (e) {
        if (e?.name !== 'RenderingCancelledException') console.warn('Preview:', e.message);
      } finally {
        if (!cancelRef.current) setPagesLoading(false);
      }
    })();

    return () => { cancelRef.current = true; };
  }, [canViewFull, purchaseStatus, note.pdfUrl, isPaid]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-gray-950 border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
        style={{ height: '85vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-gray-900/80">
          <div>
            <p className="text-white font-semibold text-sm truncate max-w-xs">{note.title}</p>
            <p className="text-gray-500 text-xs">
              {note.subject}{note.semester ? ` • Sem ${note.semester}` : ''}
              {isPaid && !canViewFull && <span className="ml-2 text-amber-400 font-medium">🔒 Preview — first 3 pages</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Download only if free or already purchased */}
            {canViewFull && (
              <a href={note.pdfUrl?.startsWith('http') ? note.pdfUrl : `${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000'}${note.pdfUrl}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs text-white font-medium transition">
                <FiDownload /> {isPaid ? 'Download' : 'Open Full'}
              </a>
            )}
            <button onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white">
              <FiX className="text-lg" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        {/* Checking purchase status */}
        {isPaid && purchaseStatus === null ? (
          <div className="w-full flex items-center justify-center" style={{ height: 'calc(100% - 57px)' }}>
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>

        ) : canViewFull ? (
          /* Full PDF for free notes or purchased paid notes */
          <iframe
            src={note.pdfUrl?.startsWith('http') ? `${note.pdfUrl}#toolbar=0&navpanes=0` : `${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000'}${note.pdfUrl}#toolbar=0&navpanes=0`}
            className="w-full bg-white"
            style={{ height: 'calc(100% - 57px)' }}
            title={note.title}
          />

        ) : (
          /* Limited 3-page preview for paid unpurchased notes */
          <div className="overflow-y-auto bg-gray-900 relative" style={{ height: 'calc(100% - 57px)' }}>
            {pagesLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-8 h-8 border-2 border-white/30 border-t-violet-400 rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">Loading preview...</p>
              </div>
            ) : (
              <>
                {pages.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt={`Page ${i + 1}`} className="w-full block" />
                    {/* Fade-out gradient on last page */}
                    {i === pages.length - 1 && (
                      <div className="absolute inset-0 pointer-events-none"
                        style={{ background: 'linear-gradient(to bottom, transparent 20%, rgba(7,7,15,0.85) 65%, rgba(7,7,15,1) 100%)' }}
                      />
                    )}
                  </div>
                ))}

                {/* Lock / Buy CTA pinned at bottom */}
                <div className="sticky bottom-0 w-full bg-gray-950/95 backdrop-blur-lg border-t border-white/10 p-5 text-center">
                  <div className="text-3xl mb-2">🔒</div>
                  <p className="text-white font-bold text-base mb-1">Preview ends here</p>
                  <p className="text-gray-400 text-xs mb-4">Purchase to unlock all pages and download</p>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { onClose(); onBuy(note); }}
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

  const onMove = (e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 1000 }}
      className={className}>
      {children}
    </motion.div>
  );
};

// ─── NOTE CARD ────────────────────────────────────────────────────────────────
const NoteCard = ({ note, onPreview, onBuy, onAddToCart, gradient, isWishlisted, onToggleWishlist }) => {
  const [hovered, setHovered] = useState(false);
  const [wishAnim, setWishAnim] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiSparkle, setAiSparkle] = useState(false);
  const stars = Math.round(note.rating || 4);
  const isTrending = (note.downloads || 0) > 50;
  const isTopRated = (note.rating || 0) >= 4.5;

  const handleWish = (e) => {
    e.stopPropagation();
    onToggleWishlist(note._id);
    setWishAnim(true);
    setTimeout(() => setWishAnim(false), 500);
  };

  return (
    <TiltCard className="group relative h-full">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 rounded-2xl blur opacity-0 group-hover:opacity-60 transition-all duration-500 pointer-events-none" />
      <motion.div
        className="relative bg-gray-900/90 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/20 transition-all duration-300 flex flex-col h-full"
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
      >
        {/* Thumbnail */}
        <div className="relative h-52 flex-shrink-0 overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
          <div className="absolute inset-0"><PDFThumbnail pdfUrl={note.pdfUrl} title={note.title} /></div>

          {/* Quick Action Overlay */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm z-10 flex items-center justify-center gap-3"
              >
                {[
                  { icon: FiEye, label: 'Preview', cls: 'bg-white/15 hover:bg-white/25 border-white/20', fn: (e) => { e.stopPropagation(); onPreview(note); } },
                  { icon: FiShoppingCart, label: 'Cart', cls: 'bg-indigo-600/80 hover:bg-indigo-700 border-indigo-500/50', fn: (e) => { e.stopPropagation(); onAddToCart(note); } },
                  { icon: FiZap, label: note.price === 0 ? 'Get Free' : `₹${note.price}`, cls: 'bg-violet-600/80 hover:bg-violet-600 border-violet-500/50', fn: (e) => { e.stopPropagation(); onBuy(note); } },
                  { icon: FiHeart, label: isWishlisted ? 'Saved' : 'Save', cls: isWishlisted ? 'bg-pink-600/80 hover:bg-pink-700 border-pink-500/50' : 'bg-white/10 hover:bg-pink-600/60 border-white/15', fn: handleWish },
                ].map(({ icon: Icon, label, cls, fn }, i) => (
                  <motion.button
                    key={label}
                    initial={{ opacity: 0, y: 18, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.85 }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 380, damping: 22 }}
                    whileHover={{ scale: 1.12, y: -3 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={fn}
                    className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl border backdrop-blur text-white text-[11px] font-bold transition-all ${cls}`}
                  >
                    <Icon className="text-base" />{label}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Price badge */}
          <div className={`absolute top-3 right-3 z-20 px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur shadow-lg ${note.price === 0 ? 'bg-emerald-500/90' : 'bg-amber-500/90'} text-white`}>
            {note.price === 0 ? '🎓 FREE' : `₹${note.price}`}
          </div>

          {/* Wishlist heart */}
          <motion.button
            animate={wishAnim ? { scale: [1, 1.6, 1] } : { scale: 1 }}
            transition={{ duration: 0.4 }}
            onClick={handleWish}
            className="absolute top-3 left-3 z-20 p-1.5 rounded-lg bg-black/40 backdrop-blur hover:bg-black/60 transition"
          >
            <FiHeart className={`text-sm transition-colors duration-200 ${isWishlisted ? 'text-pink-500 fill-pink-500' : 'text-white/60'}`} />
          </motion.button>

          {/* Trend/TopRated badges */}
          <div className="absolute bottom-3 left-3 z-20 flex gap-1.5 flex-wrap">
            {isTrending && <span className="px-2 py-0.5 rounded-md bg-orange-500/85 text-white text-[10px] font-bold">🔥 Trending</span>}
            {isTopRated && <span className="px-2 py-0.5 rounded-md bg-yellow-500/85 text-white text-[10px] font-bold">🏆 Top Rated</span>}
          </div>
          {(note.downloads || 0) > 0 && (
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/55 text-white text-[10px]">
              <FiDownload className="text-[9px]" />{note.downloads}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-bold text-sm text-white mb-2 line-clamp-2 leading-snug group-hover:text-fuchsia-300 transition-colors duration-300">
            {note.title}
          </h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
              note.itemType === 'book' 
                ? 'bg-pink-500/15 text-pink-300 border-pink-500/25'
                : 'bg-violet-500/15 text-violet-300 border-violet-500/25'
            }`}>
              {note.itemType === 'book' ? '📚 Book' : '📝 Note'}
            </span>
            <span className="text-[11px] bg-white/5 text-gray-300 border border-white/10 px-2 py-0.5 rounded-full">
              {note.subject || 'General'}
            </span>
            {note.itemType !== 'book' && note.semester && (
              <span className="text-[11px] bg-blue-500/15 text-blue-300 border border-blue-500/25 px-2 py-0.5 rounded-full">
                Sem {note.semester}
              </span>
            )}
          </div>
          <div className="space-y-1 mb-3 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <FiUser className="text-[10px] flex-shrink-0" />
              <span className="truncate">{note.sellerName || 'Anonymous'}</span>
              {note.verified && <span className="ml-auto text-[10px] bg-blue-500/20 text-blue-400 px-1 rounded border border-blue-500/30 flex-shrink-0">✓</span>}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <FiMapPin className="text-[10px] flex-shrink-0" />
              <span className="truncate">{note.college || 'Various Colleges'}</span>
            </div>
          </div>
          {/* AI Summary Button + Reveal */}
          {note.aiSummary && (
            <div className="mb-3">
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAI(!showAI);
                  if (!showAI) {
                    setAiSparkle(true);
                    setTimeout(() => setAiSparkle(false), 600);
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative w-full py-1.5 px-3 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all overflow-hidden ${
                  showAI 
                    ? 'bg-violet-500/20 border border-violet-400/30 text-violet-300' 
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-violet-300 hover:border-violet-500/30 hover:bg-violet-500/10'
                }`}
              >
                {/* Sparkle particles on click */}
                <AnimatePresence>
                  {aiSparkle && (
                    <>
                      {[...Array(6)].map((_, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                          animate={{ 
                            opacity: 0, 
                            scale: 1.5,
                            x: (Math.random() - 0.5) * 80,
                            y: (Math.random() - 0.5) * 40
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="absolute text-[8px] pointer-events-none"
                          style={{ left: '50%', top: '50%' }}
                        >
                          ✨
                        </motion.span>
                      ))}
                    </>
                  )}
                </AnimatePresence>
                <span className={`transition-transform duration-300 ${showAI ? 'rotate-180' : ''}`}>
                  {showAI ? '🤖' : '✨'}
                </span>
                {showAI ? 'Hide AI Summary' : 'AI Summary'}
                <span className="ml-auto text-[8px] text-violet-400/50">powered by Gemini</span>
              </motion.button>
              <AnimatePresence>
                {showAI && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-2.5 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent border border-violet-500/15 rounded-xl">
                      <p className="text-[10px] text-violet-200/90 leading-relaxed">
                        🤖 {note.aiSummary}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <div className="flex items-center gap-0.5 mb-4">
            {[1,2,3,4,5].map(s => <FiStar key={s} className={`text-[10px] ${s <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`} />)}
            <span className="text-[10px] text-gray-600 ml-1">({note.reviews || 0})</span>
          </div>
          <div className="flex gap-2">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => onPreview(note)}
              className="flex-1 bg-white/8 hover:bg-white/15 border border-white/10 text-white py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
              <FiEye /> Preview
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => onBuy(note)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg text-white ${note.price === 0 ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600'}`}>
              <FiDownload /> {note.price === 0 ? 'Free' : 'Buy'}
            </motion.button>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </motion.div>
    </TiltCard>
  );
};

// ─── GRID SECTION ─────────────────────────────────────────────────────────────
const Section = ({ notes, onPreview, onBuy, onAddToCart, wishlist, onToggleWishlist, gradients }) => (
  notes.length === 0
    ? null
    : <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <AnimatePresence mode="popLayout">
          {notes.map(note => (
            <NoteCard key={note._id} note={note} onPreview={onPreview} onBuy={onBuy} onAddToCart={onAddToCart}
              gradient={gradients(note._id)} isWishlisted={wishlist.includes(note._id)} onToggleWishlist={onToggleWishlist} />
          ))}
        </AnimatePresence>
      </motion.div>
);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CHIPS = ['All', 'AI', 'Physics', 'Maths', 'Programming', 'Chemistry', 'Economics', 'History', 'Biology'];
const GRADIENTS = [
  'from-rose-500/50 to-orange-500/50','from-blue-500/50 to-cyan-500/50',
  'from-purple-500/50 to-pink-500/50','from-green-500/50 to-emerald-500/50',
  'from-indigo-500/50 to-violet-500/50','from-yellow-500/50 to-amber-500/50',
  'from-teal-500/50 to-blue-500/50','from-red-500/50 to-rose-500/50',
];

// ─── HOME ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ subject: '', semester: '', priceType: '', minRating: '' });
  const [activeTab, setActiveTab] = useState('all');
  const [previewNote, setPreviewNote] = useState(null);
  const [buyNote, setBuyNote] = useState(null); // ✅ For payment modal
  const { wishlist, toggle: toggleWishlist } = useWishlist();
  const { user } = useAuth(); // ✅ Get current user for PaymentButton
  const debouncedSearch = useDebounce(searchInput, 300);
  const searchRef = useRef(null);

  useEffect(() => { fetchNotes(); }, []);

  useEffect(() => {
    if (debouncedSearch.length > 1) {
      const s = notes.filter(n => n.title?.toLowerCase().includes(debouncedSearch.toLowerCase())).slice(0, 5).map(n => n.title);
      setSuggestions(s);
      setShowSug(s.length > 0);
    } else {
      setSuggestions([]); setShowSug(false);
    }
  }, [debouncedSearch, notes]);

  const fetchNotes = async () => {
    try { const r = await API.get('/notes'); setNotes(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handlePreview = (note) => { if (note.pdfUrl) setPreviewNote(note); else alert('Preview not available'); };
  const handleBuy = (note) => {
    if (note.price === 0 && note.pdfUrl) {
      window.open(note.pdfUrl?.startsWith('http') ? note.pdfUrl : `${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000'}${note.pdfUrl}`, '_blank');
    } else {
      setBuyNote(note); // ✅ Open payment modal instead of alert
    }
  };

  const handleAddToCart = async (note) => {
    try {
      if (!user) return alert("Please login first to use cart.");
      await API.post('/profile/cart/toggle', { noteId: note._id });
      alert(`Added ${note.title} to Cart!`);
    } catch (e) {
      alert("Failed to add to cart");
    }
  };

  const subjects = useMemo(() => [...new Set(notes.map(n => n.subject).filter(Boolean))], [notes]);
  const semesters = useMemo(() => [...new Set(notes.map(n => n.semester).filter(Boolean))].sort(), [notes]);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const clearFilters = () => setFilters({ subject: '', semester: '', priceType: '', minRating: '' });
  const getGradient = (id) => GRADIENTS[(id?.length ? id.charCodeAt(0) : 0) % GRADIENTS.length];

  const baseFiltered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return notes.filter(n => {
      const mQ = !q || [n.title, n.subject, n.sellerName].some(v => v?.toLowerCase().includes(q));
      const mC = activeCategory === 'All' || n.subject?.toLowerCase().includes(activeCategory.toLowerCase());
      const mS = !filters.subject || n.subject === filters.subject;
      const mSem = !filters.semester || String(n.semester) === String(filters.semester);
      const mP = !filters.priceType || (filters.priceType === 'free' ? n.price === 0 : n.price > 0);
      const mR = !filters.minRating || (n.rating || 0) >= Number(filters.minRating);
      return mQ && mC && mS && mSem && mP && mR;
    });
  }, [notes, debouncedSearch, activeCategory, filters]);

  const trending = useMemo(() => [...baseFiltered].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 8), [baseFiltered]);
  const topRated = useMemo(() => [...baseFiltered].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8), [baseFiltered]);
  const newest = useMemo(() => [...baseFiltered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 8), [baseFiltered]);
  const wishlisted = useMemo(() => notes.filter(n => wishlist.includes(n._id)), [notes, wishlist]);

  const tabs = [
    { id: 'all', label: 'All Notes', icon: '📚' },
    { id: 'trending', label: 'Trending', icon: '🔥' },
    { id: 'top', label: 'Top Rated', icon: '⭐' },
    { id: 'new', label: 'New', icon: '🆕' },
    { id: 'wishlist', label: `Saved (${wishlist.length})`, icon: '❤️' },
  ];

  const tabData = { all: baseFiltered, trending, top: topRated, new: newest, wishlist: wishlisted };

  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-800/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-800/12 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-10 w-[300px] h-[300px] bg-blue-800/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-12">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-300 text-xs font-medium mb-5">
            <FiZap className="fill-violet-400 text-violet-400" /> Notes Marketplace — India's Best
          </motion.div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter mb-4 leading-none">
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">Study Smarter</span>
            <br /><span className="text-white/90 text-4xl sm:text-5xl">Not Harder 📚</span>
          </h1>
          <p className="text-gray-400 text-base max-w-lg mx-auto">Top-rated notes from students across India. Free & paid — all in one place.</p>
          <div className="flex items-center justify-center gap-6 mt-6">
            {[{ icon: FiBook, label: `${notes.length} Notes`, color: 'text-violet-400' }, { icon: FiTrendingUp, label: 'Trending', color: 'text-fuchsia-400' }, { icon: FiAward, label: 'Top Rated', color: 'text-yellow-400' }].map(({ icon: Icon, label, color }) => (
              <div key={label} className={`flex items-center gap-1.5 text-xs ${color} font-medium`}><Icon /> {label}</div>
            ))}
          </div>
        </motion.div>

        {/* Search + Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1" ref={searchRef}>
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setShowSug(true); }}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                onFocus={() => suggestions.length && setShowSug(true)}
                placeholder="Search notes, subjects, authors..."
                className="w-full pl-11 pr-10 py-3.5 bg-white/5 border border-white/10 hover:border-white/20 focus:border-violet-500/60 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all" />
              {searchInput && (
                <button onClick={() => { setSearchInput(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"><FiX /></button>
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
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowFilters(v => !v)}
              className={`relative px-4 py-3 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all ${showFilters ? 'bg-violet-600/30 border-violet-500/60 text-violet-300' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
              <FiFilter /> <span className="hidden sm:inline">Filters</span>
              <FiChevronDown className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-fuchsia-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">{activeFilterCount}</span>
              )}
            </motion.button>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none mb-3">
            {CHIPS.map(chip => (
              <motion.button key={chip} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(chip)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${activeCategory === chip ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/25' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}>
                {chip}
              </motion.button>
            ))}
          </div>

          {/* Filter drawer */}
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

          {!loading && (
            <p className="text-xs text-gray-600">
              {baseFiltered.length === notes.length ? `${notes.length} notes` : `${baseFiltered.length} / ${notes.length} notes`}
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
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {tabData[activeTab]?.length === 0 ? (
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
                <Section notes={tabData[activeTab] || []} onPreview={handlePreview} onBuy={handleBuy} onAddToCart={handleAddToCart}
                  wishlist={wishlist} onToggleWishlist={toggleWishlist} gradients={getGradient} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewNote && <PreviewModal note={previewNote} onClose={() => setPreviewNote(null)} onBuy={handleBuy} />}
      </AnimatePresence>

      {/* ✅ Payment Modal */}
      <AnimatePresence>
        {buyNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setBuyNote(null)}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              onClick={e => e.stopPropagation()}
              className="bg-gray-950 border border-white/15 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-bold text-lg leading-snug">{buyNote.title}</h3>
                  <p className="text-gray-400 text-xs mt-1">{buyNote.subject} {buyNote.semester ? `• Sem ${buyNote.semester}` : ''}</p>
                </div>
                <button onClick={() => setBuyNote(null)} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition ml-3 flex-shrink-0">
                  <FiX />
                </button>
              </div>
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-5">
                <span className="text-gray-400 text-sm">Price</span>
                <span className="text-2xl font-black text-amber-400">₹{buyNote.price}</span>
              </div>
              <p className="text-gray-500 text-xs mb-5 text-center">Secure payment via Razorpay. Instant access after purchase.</p>
              <PaymentButton
                note={buyNote}
                user={user}
                onSuccess={() => setBuyNote(null)}
                className="w-full py-3 text-sm font-bold justify-center"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}