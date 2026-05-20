import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useCountUp(target, duration = 1200, enabled = true) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(null);
  useEffect(() => {
    if (!enabled || target === undefined || target === null) return;
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, enabled, duration]);
  return value;
}

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-violet-600/30 text-violet-300', 'bg-indigo-600/30 text-indigo-300',
  'bg-cyan-600/30 text-cyan-300', 'bg-emerald-600/30 text-emerald-300',
  'bg-amber-600/30 text-amber-300', 'bg-rose-600/30 text-rose-300',
  'bg-pink-600/30 text-pink-300', 'bg-sky-600/30 text-sky-300',
];
export const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
export const fmt = (n) => (n || 0).toLocaleString('en-IN');
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── Common UI ────────────────────────────────────────────────────────────────

export const Shimmer = ({ className = '' }) => <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />;

export const Avatar = ({ name = '', src, size = 10 }) => {
  const sizeMap = {
    7: 'w-7 h-7',
    8: 'w-8 h-8',
    10: 'w-10 h-10',
    12: 'w-12 h-12',
    16: 'w-16 h-16',
    20: 'w-20 h-20'
  };
  const sizeClass = sizeMap[size] || 'w-10 h-10';
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden ${avatarColor(name)}`}>
      {src ? <img src={src} className="w-full h-full object-cover" alt="" /> : (name?.charAt(0)?.toUpperCase() || '?')}
    </div>
  );
};

export const Badge = ({ label, color = 'violet' }) => {
  const map = {
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/15 text-red-400 border-red-500/20',
    yellow: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    violet: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
    gray: 'bg-white/5 text-gray-400 border-white/10',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  };
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${map[color] || map.gray}`}>{label}</span>;
};

export const Btn = ({ children, onClick, variant = 'ghost', size = 'sm', disabled, className = '', icon: Icon }) => {
  const base = 'inline-flex items-center gap-2 font-medium rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed';
  const sizes = { xs: 'text-xs px-2.5 py-1.5', sm: 'text-sm px-4 py-2', md: 'text-sm px-5 py-2.5' };
  const variants = {
    ghost: 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10',
    primary: 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30',
    danger: 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20',
    success: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
};

export const Input = ({ label, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-medium text-gray-400">{label}</label>}
    <input {...props} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition" />
  </div>
);

export const Select = ({ label, children, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-medium text-gray-400">{label}</label>}
    <select {...props} className="w-full bg-[#0e0e1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/60 transition">
      {children}
    </select>
  </div>
);

export const Modal = ({ open, onClose, title, children, maxW = 'max-w-2xl' }) => (
  <AnimatePresence>
    {open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 16 }}
          className={`w-full ${maxW} bg-[#0e0e1a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
            <h3 className="font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"><FiX size={16} /></button>
          </div>
          <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const Toast = ({ toast }) => (
  <AnimatePresence>
    {toast && (
      <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 32 }}
        className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl border text-sm font-medium shadow-2xl
          ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
            : toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-300'
              : 'bg-violet-500/20 border-violet-500/30 text-violet-300'}`}>
        {toast.type === 'success' ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
        {toast.msg}
      </motion.div>
    )}
  </AnimatePresence>
);

export const SectionHeader = ({ icon: Icon, iconColor, title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <div className="flex items-center gap-3 mb-0.5">
        <div className={`p-2 rounded-lg ${iconColor}`}><Icon size={18} /></div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      {subtitle && <p className="text-gray-500 text-sm ml-11">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const ConfirmationModal = ({ open, onClose, onConfirm, title, message, confirmText = 'Delete', loading }) => {
  const [input, setInput] = useState('');
  useEffect(() => { if (open) setInput(''); }, [open]);
  const isMatch = input === confirmText;

  return (
    <Modal open={open} onClose={onClose} title={title} maxW="max-w-md">
      <div className="space-y-4">
        <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-widest">Type "{confirmText}" to confirm</label>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder={confirmText}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 transition" />
        </div>
        <div className="flex gap-3 pt-2">
          <Btn variant="danger" className="flex-1" onClick={onConfirm} disabled={!isMatch || loading}>
            {loading ? 'Processing...' : 'Confirm Action'}
          </Btn>
          <Btn variant="ghost" className="flex-1" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
};

const colorMap = {
  blue: { wrap: 'bg-blue-500/15 border-blue-500/25 text-blue-400', stroke: 'stroke-blue-500' },
  emerald: { wrap: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400', stroke: 'stroke-emerald-500' },
  orange: { wrap: 'bg-orange-500/15 border-orange-500/25 text-orange-400', stroke: 'stroke-orange-500' },
  violet: { wrap: 'bg-violet-500/15 border-violet-500/25 text-violet-400', stroke: 'stroke-violet-500' },
  pink: { wrap: 'bg-pink-500/15 border-pink-500/25 text-pink-400', stroke: 'stroke-pink-500' },
  red: { wrap: 'bg-red-500/15 border-red-500/25 text-red-400', stroke: 'stroke-red-500' },
};

export const StatCard = ({ title, rawValue = 0, icon: Icon, color, delay = 0, prefix = '', suffix = '', onClick }) => {
  const animated = useCountUp(rawValue, 1000, rawValue > 0);
  const c = colorMap[color] || colorMap.blue;
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45 }}
      onClick={onClick}
      className={`bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-5 hover:bg-white/[0.08] transition-colors group relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}>
      <svg className={`absolute bottom-0 right-0 w-1/2 h-12 opacity-20 pointer-events-none ${c.stroke}`} viewBox="0 0 120 35" preserveAspectRatio="xMidYMax meet">
        <polyline points="0,25 20,18 40,28 60,12 80,18 100,5" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className={`relative z-10 w-14 h-14 rounded-xl flex items-center justify-center border flex-shrink-0 ${c.wrap}`}>
        <Icon size={22} />
      </div>
      <div className="relative z-10">
        <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
        <p className="text-white text-3xl font-bold tracking-tight tabular-nums">{prefix}{fmt(animated)}{suffix}</p>
      </div>
    </motion.div>
  );
};
