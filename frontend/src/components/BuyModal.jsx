/**
 * BuyModal – shared, accessible payment modal.
 *
 * Features:
 *  - useBodyScrollLock : prevents background scroll while open
 *  - useFocusTrap      : traps Tab focus AND handles Escape to close
 *                        (combined → no separate Escape useEffect needed)
 *  - role="dialog", aria-modal, aria-labelledby for screen readers
 *  - Close button with descriptive aria-label
 */
import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import PaymentButton from './PaymentButton';
import { showToast } from './Toast';

/* ── Scroll lock ─────────────────────────────────────────────────────────── */
const useBodyScrollLock = (active) => {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [active]);
};

/**
 * useFocusTrap – traps Tab focus inside `ref.current`.
 * Also handles Escape via `onClose` callback, eliminating
 * the need for a separate Escape useEffect in consumers.
 */
const useFocusTrap = (active, ref, onClose) => {
  useEffect(() => {
    if (!active || !ref.current) return;
    const focusable = ref.current.querySelectorAll(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    const handleKey = (e) => {
      if (e.key === 'Escape') { onClose?.(); return; }
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
  }, [active, ref, onClose]);
};

/**
 * BuyModal
 *
 * @param {{ note, onClose, onSuccess }} props
 *   note      – the note being purchased
 *   onClose   – called when modal should close
 *   onSuccess – called after successful purchase (before onClose)
 */
export default function BuyModal({ note, onClose, onSuccess }) {
  const modalRef = useRef(null);
  useBodyScrollLock(true);
  useFocusTrap(true, modalRef, onClose); // Escape handled here – no extra useEffect

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      aria-hidden="true"
    >
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.88, y: 28, opacity: 0 }}
        animate={{ scale: 1,    y: 0,  opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-900 border border-white/15 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-3">
            <h3 id="buy-modal-title" className="font-bold text-white text-lg leading-snug truncate">
              {note.title}
            </h3>
            <p className="text-gray-400 text-xs mt-1">
              {note.subject}{note.semester ? ` • Sem ${note.semester}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close payment dialog"
            className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition flex-shrink-0"
          >
            <FiX size={17} aria-hidden="true" />
          </button>
        </div>

        {/* Price row */}
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 mb-5">
          <span className="text-gray-400 text-sm">Full access price</span>
          <span className="text-2xl font-black text-amber-400">₹{note.price}</span>
        </div>

        <p className="text-gray-500 text-xs text-center mb-4">
          Secure payment via Razorpay. Instant access after purchase.
        </p>

        <PaymentButton
          note={note}
          onSuccess={() => {
            showToast('Purchase successful! Full PDF unlocked.', 'success');
            onSuccess?.();
            onClose();
          }}
          className="w-full py-3 text-sm font-bold justify-center"
        />
      </motion.div>
    </motion.div>
  );
}
