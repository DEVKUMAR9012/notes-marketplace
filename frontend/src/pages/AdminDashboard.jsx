import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiFileText, FiPackage, FiDollarSign, FiActivity,
  FiMail, FiShield, FiAlertTriangle, FiMenu, FiRefreshCw,
  FiArrowUpRight, FiArrowDownRight, FiChevronRight, FiZap,
  FiSearch, FiEye, FiEyeOff, FiLock, FiUnlock, FiTrash2,
  FiCheck, FiX, FiMessageSquare, FiSend, FiDownload,
  FiSettings, FiFilter, FiMoreVertical, FiFlag, FiCheckCircle,
  FiXCircle, FiAlertCircle, FiClock, FiCreditCard, FiBarChart2,
  FiBell, FiKey, FiUser, FiLogOut, FiEdit2, FiExternalLink, FiPieChart
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useCountUp(target, duration = 1200, enabled = true) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(null);
  useEffect(() => {
    if (!enabled || !target) return;
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, enabled]);
  return value;
}

function useDebounce(value, delay) {
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
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const fmt = (n) => (n || 0).toLocaleString('en-IN');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── Common UI ────────────────────────────────────────────────────────────────

const Shimmer = ({ className = '' }) => <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />;

const Avatar = ({ name = '', src, size = 10 }) => {
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

const Badge = ({ label, color = 'violet' }) => {
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

const Btn = ({ children, onClick, variant = 'ghost', size = 'sm', disabled, className = '', icon: Icon }) => {
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

const Input = ({ label, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-medium text-gray-400">{label}</label>}
    <input {...props} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition" />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-medium text-gray-400">{label}</label>}
    <select {...props} className="w-full bg-[#0e0e1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/60 transition">
      {children}
    </select>
  </div>
);

const Modal = ({ open, onClose, title, children, maxW = 'max-w-2xl' }) => (
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

const Toast = ({ toast }) => (
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

const SectionHeader = ({ icon: Icon, iconColor, title, subtitle, action }) => (
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

const ConfirmationModal = ({ open, onClose, onConfirm, title, message, confirmText = 'Delete', loading }) => {
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

// ─── Stat Card ────────────────────────────────────────────────────────────────

const colorMap = {
  blue: { wrap: 'bg-blue-500/15 border-blue-500/25 text-blue-400', stroke: 'stroke-blue-500' },
  emerald: { wrap: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400', stroke: 'stroke-emerald-500' },
  orange: { wrap: 'bg-orange-500/15 border-orange-500/25 text-orange-400', stroke: 'stroke-orange-500' },
  violet: { wrap: 'bg-violet-500/15 border-violet-500/25 text-violet-400', stroke: 'stroke-violet-500' },
  pink: { wrap: 'bg-pink-500/15 border-pink-500/25 text-pink-400', stroke: 'stroke-pink-500' },
  red: { wrap: 'bg-red-500/15 border-red-500/25 text-red-400', stroke: 'stroke-red-500' },
};

const StatCard = ({ title, rawValue = 0, icon: Icon, color, delay = 0, prefix = '', suffix = '', onClick }) => {
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

// ─── Overview Tab ─────────────────────────────────────────────────────────────

const Overview = ({ onTabChange }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const res = await API.get('/admin/dashboard');
      setData(res.data);
      setLastUpdated(new Date());
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="space-y-6 pt-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Shimmer key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <Shimmer key={i} className="h-64" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400"><FiAlertTriangle size={28} /></div>
      <p className="text-red-400">{error}</p>
      <Btn onClick={() => fetchData()} icon={FiRefreshCw}>Retry</Btn>
    </div>
  );

  const { metrics, recentActivity } = data || {};

  return (
    <div className="space-y-6 pb-12 pt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time metrics, revenue, and platform activity.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-gray-600">Updated {Math.round((Date.now() - lastUpdated) / 1000)}s ago</span>}
          <button onClick={() => fetchData(true)} disabled={refreshing} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition">
            <FiRefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" rawValue={metrics?.totalUsers || 0} icon={FiUsers} color="blue" delay={0.05} onClick={() => onTabChange('users')} />
        <StatCard title="Notes Uploaded" rawValue={metrics?.totalNotes || 0} icon={FiFileText} color="emerald" delay={0.10} onClick={() => onTabChange('content')} />
        <StatCard title="Total Bundles" rawValue={metrics?.totalBundles || 0} icon={FiPackage} color="orange" delay={0.15} />
        <StatCard title="Platform Revenue" rawValue={metrics?.platformRevenue || 0} icon={FiDollarSign} color="violet" delay={0.20} prefix="₹" onClick={() => onTabChange('finance')} />
      </div>

      {/* Revenue Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white/5 border border-white/10 rounded-3xl p-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"><FiDollarSign size={18} /></div>
            <h2 className="text-base font-semibold text-white">Revenue Snapshot</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Gross Sales', value: `₹${fmt(metrics?.grossSales)}`, sub: 'All time', color: 'border-white/5' },
              { label: 'Platform Cut (10%)', value: `₹${fmt(metrics?.platformRevenue)}`, sub: 'Net revenue', color: 'border-violet-500/20 bg-violet-600/10' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className={`rounded-2xl p-5 border ${color} bg-black/30`}>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-gray-600 mt-2">{sub}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30 }}
          className="bg-white/5 border border-white/10 rounded-3xl p-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-violet-500/20 text-violet-400"><FiZap size={18} /></div>
            <h2 className="text-base font-semibold text-white">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Manage Users', icon: FiUsers, tab: 'users', color: 'hover:border-blue-500/40 hover:bg-blue-500/5' },
              { label: 'Review Content', icon: FiFileText, tab: 'content', color: 'hover:border-orange-500/40 hover:bg-orange-500/5' },
              { label: 'View Reports', icon: FiFlag, tab: 'support', color: 'hover:border-red-500/40 hover:bg-red-500/5' },
              { label: 'Live Chats', icon: FiMessageSquare, tab: 'chats', color: 'hover:border-emerald-500/40 hover:bg-emerald-500/5' },
              { label: 'Financials', icon: FiCreditCard, tab: 'finance', color: 'hover:border-violet-500/40 hover:bg-violet-500/5' },
              { label: 'Settings', icon: FiSettings, tab: 'settings', color: 'hover:border-cyan-500/40 hover:bg-cyan-500/5' },
            ].map(({ label, icon: Icon, tab, color }) => (
              <button key={tab} onClick={() => onTabChange(tab)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl bg-black/20 border border-white/5 text-gray-400 hover:text-white transition-all duration-200 text-sm font-medium ${color}`}>
                <Icon size={16} />{label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent signups + transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-white/5 border border-white/10 rounded-3xl p-7">
          <SectionHeader icon={FiUsers} iconColor="bg-blue-500/20 text-blue-400" title="New Signups"
            action={<button onClick={() => onTabChange('users')} className="text-xs text-gray-500 hover:text-violet-400 transition flex items-center gap-1">View all <FiChevronRight size={12} /></button>} />
          <div className="space-y-2">
            {recentActivity?.users?.length ? recentActivity.users.slice(0, 5).map((user, i) => (
              <motion.div key={user._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.04 }}
                className="flex items-center justify-between p-3 rounded-2xl bg-black/20 border border-white/5 hover:bg-black/40 transition-all">
                <div className="flex items-center gap-3">
                  <Avatar name={user.name} src={user.avatar || user.profileImage} />
                  <div>
                    <p className="text-white text-sm font-medium">{user.name}</p>
                    <p className="text-gray-500 text-xs">{user.email}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-600 bg-white/5 px-3 py-1 rounded-full">{fmtDate(user.createdAt)}</span>
              </motion.div>
            )) : <p className="text-gray-600 text-sm text-center py-8">No recent signups.</p>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-3xl p-7">
          <SectionHeader icon={FiActivity} iconColor="bg-pink-500/20 text-pink-400" title="Transaction Feed"
            action={<span className="flex items-center gap-1.5 text-xs text-emerald-400"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" /></span>Live</span>} />
          <div className="space-y-2">
            {recentActivity?.transactions?.length ? recentActivity.transactions.slice(0, 5).map((tx, i) => (
              <motion.div key={tx._id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.04 }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-black/20 border border-white/5 hover:bg-black/40 transition-all">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === 'credit' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {tx.type === 'credit' ? <FiArrowUpRight size={14} /> : <FiArrowDownRight size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-gray-600 text-xs">{tx.userName} · {fmtDateTime(tx.date)}</p>
                </div>
                <span className={`text-sm font-bold px-3 py-1 rounded-lg flex-shrink-0 ${tx.type === 'credit' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                  {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                </span>
              </motion.div>
            )) : <p className="text-gray-600 text-sm text-center py-8">No recent transactions.</p>}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ─── User Management Tab ──────────────────────────────────────────────────────

const UserManagementTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModal, setUserModal] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [purchasesModal, setPurchasesModal] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearch = useDebounce(search, 500);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, search: debouncedSearch, role: roleFilter, status: statusFilter });
      const res = await API.get(`/admin/users?${params}`);
      setUsers(res.data.users || res.data);
      setTotalPages(res.data.pages || 1);
    } catch { showToast('Failed to load users', 'error'); }
    finally { setLoading(false); }
  }, [page, debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const blockUser = async (id, blocked) => {
    try {
      await API.patch(`/admin/users/${id}/block`, { blocked: !blocked });
      setUsers(u => u.map(x => x._id === id ? { ...x, isBlocked: !blocked } : x));
      showToast(`User ${!blocked ? 'blocked' : 'unblocked'} successfully`);
    } catch { showToast('Action failed', 'error'); }
  };

  const deleteUser = async () => {
    if (!confirmDelete) return;
    try {
      await API.delete(`/admin/users/${confirmDelete.id}`);
      setUsers(u => u.filter(x => x._id !== confirmDelete.id));
      showToast('User deleted');
      setConfirmDelete(null);
    } catch { showToast('Delete failed', 'error'); }
  };

  const changeRole = async (id, role) => {
    try {
      await API.patch(`/admin/users/${id}/role`, { role });
      setUsers(u => u.map(x => x._id === id ? { ...x, role } : x));
      showToast('Role updated');
    } catch { showToast('Role update failed', 'error'); }
  };

  const forcePasswordReset = async (id) => {
    try {
      await API.post(`/admin/users/${id}/force-reset`);
      showToast('Password reset email sent');
      setResetModal(false);
    } catch { showToast('Failed', 'error'); }
  };

  const viewPurchases = async (user) => {
    setSelectedUser(user);
    try {
      const res = await API.get(`/admin/users/${user._id}/purchases`);
      setPurchases(res.data || []);
    } catch { setPurchases([]); }
    setPurchasesModal(true);
  };

  const filtered = users.filter(u =>
    (!search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())) &&
    (!roleFilter || u.role === roleFilter) &&
    (!statusFilter || (statusFilter === 'blocked' ? u.isBlocked : !u.isBlocked))
  );

  return (
    <div className="space-y-6 pb-12 pt-4">
      <Toast toast={toast} />
      <SectionHeader icon={FiUsers} iconColor="bg-blue-500/20 text-blue-400" title="User Management"
        subtitle="View, block, delete users and manage their purchases & roles" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="bg-[#0e0e1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500/50 transition">
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="seller">Seller</option>
          <option value="admin">Admin</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#0e0e1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500/50 transition">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-xs text-gray-500 uppercase tracking-wider">
                {['User', 'Email', 'Role', 'Joined', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  {[...Array(6)].map((_, j) => <td key={j} className="px-5 py-4"><Shimmer className="h-4 w-full" /></td>)}
                </tr>
              )) : filtered.map((user, i) => (
                <motion.tr key={user._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} src={user.avatar} />
                      <span className="text-white font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400">{user.email}</td>
                  <td className="px-5 py-3.5">
                    <select value={user.role || 'user'} onChange={e => changeRole(user._id, e.target.value)}
                      className="bg-transparent text-xs font-semibold text-violet-400 focus:outline-none cursor-pointer">
                      <option value="user">User</option>
                      <option value="seller">Seller</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{fmtDate(user.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <Badge label={user.isBlocked ? 'Blocked' : 'Active'} color={user.isBlocked ? 'red' : 'green'} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setSelectedUser(user); setUserModal(true); }} title="View Details"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"><FiEye size={14} /></button>
                      <button onClick={() => viewPurchases(user)} title="View Purchases"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"><FiCreditCard size={14} /></button>
                      <button onClick={() => { setSelectedUser(user); setResetModal(true); }} title="Force Password Reset"
                        className="p-1.5 rounded-lg hover:bg-amber-500/20 text-gray-400 hover:text-amber-400 transition"><FiKey size={14} /></button>
                      <button onClick={() => blockUser(user._id, user.isBlocked)} title={user.isBlocked ? 'Unblock' : 'Block'}
                        className={`p-1.5 rounded-lg transition ${user.isBlocked ? 'hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400' : 'hover:bg-orange-500/20 text-gray-400 hover:text-orange-400'}`}>
                        {user.isBlocked ? <FiUnlock size={14} /> : <FiLock size={14} />}
                      </button>
                      <button onClick={() => setConfirmDelete({ id: user._id, name: user.email })} title="Delete User"
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition"><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.07]">
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Btn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} size="xs">← Prev</Btn>
              <Btn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} size="xs">Next →</Btn>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={deleteUser}
        title="Confirm User Deletion"
        message={`Are you sure you want to delete ${confirmDelete?.name}? This action is irreversible.`}
        confirmText={confirmDelete?.name}
      />

      <Modal open={userModal} onClose={() => setUserModal(false)} title="User Security & Session Details">
        {selectedUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={selectedUser.name} src={selectedUser.avatar} size={16} />
              <div>
                <p className="text-white text-lg font-bold">{selectedUser.name}</p>
                <p className="text-gray-400 text-sm">{selectedUser.email}</p>
              </div>
              <Badge label={selectedUser.role || 'user'} color="violet" />
            </div>

            {/* ─── Standard Metrics Grid ─── */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'User ID', value: selectedUser._id },
                { label: 'Joined', value: fmtDate(selectedUser.createdAt) },
                { label: 'Last Login', value: fmtDateTime(selectedUser.lastLogin) },
                { label: 'Phone', value: selectedUser.phone || '—' },
                { label: 'College', value: selectedUser.college || '—' },
                { label: 'Uploads', value: selectedUser.notesCount || '—' },
                { label: 'Wallet Balance', value: `₹${fmt(selectedUser.walletBalance)}` },
                { label: 'Status', value: selectedUser.isBlocked ? 'Blocked' : 'Active' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <p className="text-gray-500 text-xs mb-1">{label}</p>
                  <p className="text-white text-sm font-medium break-all">{value}</p>
                </div>
              ))}
            </div>

            {/* ─── 🛡️ Session Tracking & Device Integrity ─── */}
            <div className="bg-violet-950/10 border border-violet-500/20 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>🛡️</span> Session Tracking &amp; Device Integrity
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[10px] text-gray-500 block mb-0.5">IP Address</span>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {selectedUser.lastLoginMetadata?.ipAddress || 'Not captured yet'}
                  </span>
                </div>
                <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[10px] text-gray-500 block mb-0.5">Approx. Location</span>
                  <span className="text-xs font-medium text-emerald-400">
                    {selectedUser.lastLoginMetadata?.location || 'Unknown'}
                  </span>
                </div>
              </div>
              <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
                <span className="text-[10px] text-gray-500 block mb-0.5">Active Browser / Client Device</span>
                <span
                  className="text-xs font-medium text-gray-300 block truncate"
                  title={selectedUser.lastLoginMetadata?.userAgent}
                >
                  {selectedUser.lastLoginMetadata?.browser || selectedUser.lastLoginMetadata?.userAgent || 'Unknown System'}
                </span>
              </div>
            </div>

            {/* ─── Action Buttons ─── */}
            <div className="flex gap-3">
              <Btn variant="danger" icon={FiLock} onClick={() => { blockUser(selectedUser._id, selectedUser.isBlocked); setUserModal(false); }}>
                {selectedUser.isBlocked ? 'Unblock User' : 'Block User'}
              </Btn>
              <Btn variant="warning" icon={FiKey} onClick={() => { setUserModal(false); setResetModal(true); }}>Force Reset Password</Btn>
              <Btn variant="ghost" icon={FiCreditCard} onClick={() => { setUserModal(false); viewPurchases(selectedUser); }}>View Purchases</Btn>
            </div>
          </div>
        )}
      </Modal>


      {/* Force Reset Modal */}
      <Modal open={resetModal} onClose={() => setResetModal(false)} title="Force Password Reset" maxW="max-w-md">
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-sm text-amber-300">
            This will send a password reset email to <strong>{selectedUser?.email}</strong>. The user's current password will remain until they reset it.
          </div>
          <div className="flex gap-3">
            <Btn variant="warning" icon={FiMail} onClick={() => forcePasswordReset(selectedUser?._id)}>Send Reset Email</Btn>
            <Btn variant="ghost" onClick={() => setResetModal(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>

      {/* Purchases Modal */}
      <Modal open={purchasesModal} onClose={() => setPurchasesModal(false)} title={`Purchases — ${selectedUser?.name}`}>
        <div className="space-y-3">
          {purchases.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No purchases found.</p>
          ) : purchases.map((p, i) => (
            <div key={p._id || i} className="flex items-center justify-between p-3.5 rounded-2xl bg-black/30 border border-white/5">
              <div>
                <p className="text-white text-sm font-medium">{p.noteTitle || p.title}</p>
                <p className="text-gray-500 text-xs">{fmtDate(p.purchasedAt || p.createdAt)}</p>
              </div>
              <span className="text-violet-400 font-bold text-sm">₹{p.price}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

// ─── Content Moderation Tab ────────────────────────────────────────────────────

const ContentModerationTab = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const debouncedSearch = useDebounce(search, 500);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/notes?status=${filter}&search=${debouncedSearch}`);
      setNotes(res.data.notes || res.data || []);
    } catch { showToast('Failed to load notes', 'error'); }
    finally { setLoading(false); }
  }, [filter, debouncedSearch]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const moderate = async (id, action) => {
    try {
      await API.patch(`/admin/notes/${id}/moderate`, { action });
      setNotes(n => n.filter(x => x._id !== id));
      showToast(`Note ${action}ed`);
    } catch { showToast('Action failed', 'error'); }
  };

  const deleteNote = async () => {
    if (!confirmDelete) return;
    try {
      await API.delete(`/admin/notes/${confirmDelete.id}`);
      setNotes(n => n.filter(x => x._id !== confirmDelete.id));
      showToast('Note deleted permanently');
      setConfirmDelete(null);
    } catch { showToast('Delete failed', 'error'); }
  };

  return (
    <div className="space-y-6 pb-12 pt-4">
      <Toast toast={toast} />
      <SectionHeader icon={FiFileText} iconColor="bg-orange-500/20 text-orange-400" title="Content Moderation"
        subtitle="Review, approve, reject, and remove uploaded notes" />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected', 'all'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition capitalize ${filter === s ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition" />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? [...Array(4)].map((_, i) => <Shimmer key={i} className="h-20" />) :
          notes.length === 0 ? <div className="text-center py-20 text-gray-600">No notes found.</div> :
            notes.map((note, i) => (
              <motion.div key={note._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.07] transition group">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <FiFileText size={20} className="text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{note.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    By {note.uploadedBy?.name || 'Unknown'} · {fmtDate(note.createdAt)} · {note.subject || ''} · ₹{note.price || 0}
                  </p>
                </div>
                <Badge label={note.status || 'pending'}
                  color={note.status === 'approved' ? 'green' : note.status === 'rejected' ? 'red' : 'yellow'} />
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setPreview(note)} title="Preview"
                    className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition"><FiEye size={15} /></button>
                  {note.fileUrl && (
                    <a href={note.fileUrl} target="_blank" rel="noreferrer"
                      className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition"><FiExternalLink size={15} /></a>
                  )}
                  <button onClick={() => moderate(note._id, 'approve')}
                    className="p-2 rounded-xl hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition" title="Approve"><FiCheck size={15} /></button>
                  <button onClick={() => moderate(note._id, 'reject')}
                    className="p-2 rounded-xl hover:bg-orange-500/20 text-gray-400 hover:text-orange-400 transition" title="Reject"><FiXCircle size={15} /></button>
                  <button onClick={() => setConfirmDelete({ id: note._id, name: note.title })}
                    className="p-2 rounded-xl hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition" title="Delete"><FiTrash2 size={15} /></button>
                </div>
              </motion.div>
            ))
        }
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Note Preview">
        {preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[['Title', preview.title], ['Subject', preview.subject], ['Price', `₹${preview.price}`], ['Pages', preview.pageCount || '—'],
              ['Uploaded By', preview.uploadedBy?.name], ['Email', preview.uploadedBy?.email],
              ['Date', fmtDate(preview.createdAt)], ['Status', preview.status]].map(([k, v]) => (
                <div key={k} className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <p className="text-gray-500 text-xs">{k}</p>
                  <p className="text-white text-sm font-medium mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            {preview.description && (
              <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                <p className="text-gray-500 text-xs mb-2">Description</p>
                <p className="text-gray-300 text-sm">{preview.description}</p>
              </div>
            )}
            <div className="flex gap-3">
              <Btn variant="success" icon={FiCheck} onClick={() => { moderate(preview._id, 'approve'); setPreview(null); }}>Approve</Btn>
              <Btn variant="warning" icon={FiXCircle} onClick={() => { moderate(preview._id, 'reject'); setPreview(null); }}>Reject</Btn>
              <Btn variant="danger" icon={FiTrash2} onClick={() => { setConfirmDelete({ id: preview._id, name: preview.title }); setPreview(null); }}>Delete</Btn>
              {preview.fileUrl && <a href={preview.fileUrl} target="_blank" rel="noreferrer"><Btn icon={FiExternalLink}>Open File</Btn></a>}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={deleteNote}
        title="Confirm Note Deletion"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmText={confirmDelete?.name}
      />
    </div>
  );
};

// ─── Financials Tab ────────────────────────────────────────────────────────────

const FinancialsTab = () => {
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('transactions');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [txRes, wdRes] = await Promise.allSettled([
          API.get('/admin/transactions'),
          API.get('/admin/withdrawals'),
        ]);
        if (txRes.status === 'fulfilled') setTransactions(txRes.value.data.transactions || txRes.value.data || []);
        if (wdRes.status === 'fulfilled') setWithdrawals(wdRes.value.data.withdrawals || wdRes.value.data || []);
      } catch { showToast('Failed to load financial data', 'error'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleWithdrawal = async (id, action) => {
    try {
      await API.patch(`/admin/withdrawals/${id}`, { action });
      setWithdrawals(w => w.map(x => x._id === id ? { ...x, status: action === 'approve' ? 'approved' : 'rejected' } : x));
      showToast(`Withdrawal ${action}d`);
    } catch { showToast('Action failed', 'error'); }
  };

  return (
    <div className="space-y-6 pb-12 pt-4">
      <Toast toast={toast} />
      <SectionHeader icon={FiDollarSign} iconColor="bg-emerald-500/20 text-emerald-400" title="Financials & Payouts"
        subtitle="All transactions, withdrawal requests and revenue tracking" />

      <div className="flex gap-2">
        {[['transactions', 'All Transactions'], ['withdrawals', 'Withdrawal Requests']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${tab === id ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'}`}>
            {label}
            {id === 'withdrawals' && withdrawals.filter(w => w.status === 'pending').length > 0 && (
              <span className="ml-2 text-xs bg-red-500/30 text-red-400 px-2 py-0.5 rounded-full">
                {withdrawals.filter(w => w.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'transactions' && (
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-xs text-gray-500 uppercase tracking-wider">
                {['User', 'Description', 'Type', 'Amount', 'Date'].map(h => (
                  <th key={h} className="text-left px-5 py-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  {[...Array(5)].map((_, j) => <td key={j} className="px-5 py-4"><Shimmer className="h-4" /></td>)}
                </tr>
              )) : transactions.map((tx) => (
                <tr key={tx._id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5 text-gray-300">{tx.userName}</td>
                  <td className="px-5 py-3.5 text-gray-400 max-w-xs truncate">{tx.description}</td>
                  <td className="px-5 py-3.5">
                    <Badge label={tx.type} color={tx.type === 'credit' ? 'green' : 'red'} />
                  </td>
                  <td className={`px-5 py-3.5 font-bold ${tx.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'credit' ? '+' : '-'}₹{fmt(tx.amount)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{fmtDateTime(tx.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'withdrawals' && (
        <div className="space-y-3">
          {loading ? [...Array(4)].map((_, i) => <Shimmer key={i} className="h-20" />) :
            withdrawals.length === 0 ? <div className="text-center py-20 text-gray-600">No withdrawal requests.</div> :
              withdrawals.map((wd, i) => (
                <motion.div key={wd._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar name={wd.userName || wd.user?.name} />
                    <div>
                      <p className="text-white font-medium">{wd.userName || wd.user?.name}</p>
                      <p className="text-gray-500 text-xs">{wd.bankDetails?.accountNumber || wd.upiId || '—'} · {fmtDate(wd.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">₹{fmt(wd.amount)}</p>
                    <Badge label={wd.status} color={wd.status === 'approved' ? 'green' : wd.status === 'rejected' ? 'red' : 'yellow'} />
                  </div>
                  {wd.status === 'pending' && (
                    <div className="flex gap-2">
                      <Btn variant="success" icon={FiCheck} size="xs" onClick={() => handleWithdrawal(wd._id, 'approve')}>Approve</Btn>
                      <Btn variant="danger" icon={FiX} size="xs" onClick={() => handleWithdrawal(wd._id, 'reject')}>Reject</Btn>
                    </div>
                  )}
                </motion.div>
              ))
          }
        </div>
      )}
    </div>
  );
};

// ─── Live Chats Tab ────────────────────────────────────────────────────────────

const LiveChatsTab = () => {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  const msgText = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val.text || val.content || val.message || '';
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get('/admin/chats');
        setConversations(res.data || []);
      } catch { }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const loadMessages = async (conv) => {
    setSelected(conv);
    setMsgLoading(true);
    try {
      const res = await API.get(`/admin/chats/${conv._id}/messages`);
      setMessages(res.data || []);
    } catch { setMessages([]); }
    finally { setMsgLoading(false); }
  };

  const deleteConversation = async () => {
    if (!confirmDelete) return;
    try {
      await API.delete(`/admin/chats/${confirmDelete.id}`);
      setConversations(c => c.filter(x => x._id !== confirmDelete.id));
      if (selected?._id === confirmDelete.id) { setSelected(null); setMessages([]); }
      setConfirmDelete(null);
    } catch { }
  };

  const filtered = conversations.filter(c =>
    !search || c.participants?.some(p => p.name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12 pt-4">
      <SectionHeader icon={FiMessageSquare} iconColor="bg-cyan-500/20 text-cyan-400" title="Live Chat Monitor"
        subtitle="Read all conversations between users on the platform" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[600px]">
        {/* Conversation List */}
        <div className="bg-white/5 border border-white/10 rounded-3xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/[0.07]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? [...Array(5)].map((_, i) => <div key={i} className="p-4"><Shimmer className="h-10" /></div>) :
              filtered.map(conv => (
                <button key={conv._id} onClick={() => loadMessages(conv)}
                  className={`w-full flex items-center gap-3 p-4 border-b border-white/[0.04] hover:bg-white/[0.04] transition text-left group ${selected?._id === conv._id ? 'bg-violet-500/10' : ''}`}>
                  <div className="flex -space-x-2">
                    {conv.participants?.slice(0, 2).map((p) => <Avatar key={p._id || p.name} name={p.name} src={p.avatar} size={8} />)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {conv.participants?.map(p => p.name).join(' & ')}
                    </p>
                    <p className="text-gray-500 text-xs truncate">{msgText(conv.lastMessage) || 'No messages'}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: conv._id, name: conv.participants?.map(p => p.name).join(' & ') }); }}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-transparent group-hover:text-gray-500 hover:!text-red-400 transition">
                    <FiTrash2 size={12} />
                  </button>
                </button>
              ))
            }
          </div>
        </div>

        {/* Messages */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-600">
              <FiMessageSquare size={40} />
              <p>Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-white/[0.07] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {selected.participants?.slice(0, 2).map((p) => <Avatar key={p._id} name={p.name} src={p.avatar} size={8} />)}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{selected.participants?.map(p => p.name).join(' & ')}</p>
                    <p className="text-gray-500 text-xs">{messages.length} messages · Read-only view</p>
                  </div>
                </div>
                <Btn variant="danger" size="xs" icon={FiTrash2} onClick={() => setConfirmDelete({ id: selected._id, name: selected.participants?.map(p => p.name).join(' & ') })}>Delete</Btn>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgLoading ? [...Array(4)].map((_, i) => <Shimmer key={i} className="h-14" />) :
                  messages.length === 0 ? <p className="text-gray-600 text-sm text-center py-12">No messages in this conversation.</p> :
                    messages.map((msg) => {
                      const isSender = msg.sender?._id === selected.participants?.[0]?._id;
                      return (
                        <div key={msg._id} className={`flex gap-3 ${isSender ? '' : 'flex-row-reverse'}`}>
                          <Avatar name={msg.sender?.name} src={msg.sender?.avatar} size={7} />
                          <div className={`max-w-xs ${isSender ? '' : 'items-end'} flex flex-col gap-1`}>
                            <p className="text-gray-500 text-xs">{msg.sender?.name}</p>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm ${isSender ? 'bg-white/10 text-gray-200 rounded-tl-none' : 'bg-violet-600/30 text-violet-100 rounded-tr-none'}`}>
                              {msgText(msg)}
                            </div>
                            <p className="text-gray-600 text-xs">{fmtDateTime(msg.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmationModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={deleteConversation}
        title="Delete Conversation"
        message={`Are you sure you want to delete the conversation with ${confirmDelete?.name}?`}
        confirmText={confirmDelete?.name}
      />
    </div>
  );
};

// ─── Support & Reports Tab ────────────────────────────────────────────────────

const SupportTab = () => {
  const [reports, setReports] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('reports');
  const [replyModal, setReplyModal] = useState(null);
  const [replyText, setReplyText] = useState('');
  
  useEffect(() => {
    if (!replyModal) setReplyText('');
  }, [replyModal]);

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [rRes, cRes] = await Promise.allSettled([API.get('/admin/reports'), API.get('/admin/contacts')]);
        if (rRes.status === 'fulfilled') setReports(rRes.value.data || []);
        if (cRes.status === 'fulfilled') setContacts(cRes.value.data || []);
      } catch { }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const resolveReport = async (id, action) => {
    try {
      await API.patch(`/admin/reports/${id}`, { status: action });
      setReports(r => r.map(x => x._id === id ? { ...x, status: action } : x));
      showToast('Report updated');
    } catch { showToast('Failed', 'error'); }
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    try {
      await API.post(`/admin/contacts/${replyModal._id}/reply`, { message: replyText });
      showToast('Reply sent successfully');
      setReplyModal(null);
      setReplyText('');
    } catch { showToast('Failed to send reply', 'error'); }
  };

  return (
    <div className="space-y-6 pb-12 pt-4">
      <Toast toast={toast} />
      <SectionHeader icon={FiFlag} iconColor="bg-red-500/20 text-red-400" title="Support & Reports"
        subtitle="Handle user reports, abuse flags, and contact form messages" />

      <div className="flex gap-2">
        {[['reports', 'User Reports'], ['contacts', 'Contact Messages']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${tab === id ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'reports' && (
        <div className="space-y-3">
          {loading ? [...Array(4)].map((_, i) => <Shimmer key={i} className="h-24" />) :
            reports.length === 0 ? <div className="text-center py-20 text-gray-600">No reports found.</div> :
              reports.map((r, i) => (
                <motion.div key={r._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-white font-medium">{r.reason || r.type}</p>
                      <p className="text-gray-500 text-xs mt-0.5">Reported by {r.reportedBy?.name} · against {r.reportedUser?.name} · {fmtDate(r.createdAt)}</p>
                    </div>
                    <Badge label={r.status || 'open'} color={r.status === 'resolved' ? 'green' : r.status === 'dismissed' ? 'gray' : 'red'} />
                  </div>
                  {r.description && <p className="text-gray-400 text-sm bg-black/20 rounded-xl p-3">{r.description}</p>}
                  {r.status === 'open' && (
                    <div className="flex gap-2">
                      <Btn variant="danger" size="xs" icon={FiLock} onClick={() => resolveReport(r._id, 'action_taken')}>Take Action</Btn>
                      <Btn variant="success" size="xs" icon={FiCheckCircle} onClick={() => resolveReport(r._id, 'resolved')}>Resolve</Btn>
                      <Btn variant="ghost" size="xs" icon={FiX} onClick={() => resolveReport(r._id, 'dismissed')}>Dismiss</Btn>
                    </div>
                  )}
                </motion.div>
              ))
          }
        </div>
      )}

      {tab === 'contacts' && (
        <div className="space-y-3">
          {loading ? [...Array(4)].map((_, i) => <Shimmer key={i} className="h-24" />) :
            contacts.length === 0 ? <div className="text-center py-20 text-gray-600">No contact messages.</div> :
              contacts.map((c, i) => (
                <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-white font-medium">{c.subject || c.name}</p>
                      <p className="text-gray-500 text-xs">{c.email} · {fmtDate(c.createdAt)}</p>
                    </div>
                    <Badge label={c.replied ? 'Replied' : 'Pending'} color={c.replied ? 'green' : 'yellow'} />
                  </div>
                  <p className="text-gray-400 text-sm">{c.message}</p>
                  {!c.replied && (
                    <Btn variant="primary" size="xs" icon={FiSend} onClick={() => setReplyModal(c)}>Reply via Email</Btn>
                  )}
                </motion.div>
              ))
          }
        </div>
      )}

      <Modal open={!!replyModal} onClose={() => setReplyModal(null)} title={`Reply to ${replyModal?.email}`} maxW="max-w-xl">
        <div className="space-y-4">
          <div className="bg-black/30 rounded-xl p-3 border border-white/5 text-sm text-gray-400">{replyModal?.message}</div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Your Reply</label>
            <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={5} placeholder="Type your reply…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition resize-none" />
          </div>
          <div className="flex gap-3">
            <Btn variant="primary" icon={FiSend} onClick={sendReply}>Send Reply</Btn>
            <Btn variant="ghost" onClick={() => setReplyModal(null)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── Settings Tab ─────────────────────────────────────────────────────────────

// ─── Email Dashboard Tab ──────────────────────────────────────────────────────
const EmailsTab = () => {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [tab, setTab] = useState('stats'); // 'stats' | 'logs' | 'compose'
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Campaign form
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);

  // Test email form
  const [testTemplate, setTestTemplate] = useState('welcome');
  const [testEmail, setTestEmail] = useState('');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const TYPE_COLORS = {
    otp: '#a78bfa',
    welcome: '#22c55e',
    purchase: '#f59e0b',
    follower: '#38bdf8',
    note_alert: '#fb923c',
    password_reset: '#f87171',
    campaign: '#7c3aed'
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get('/admin/email/stats');
      setStats(res.data.stats);
    } catch { showToast('Failed to load stats', 'error'); }
  }, []);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      const res = await API.get(`/admin/email/logs?${params}`);
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch { showToast('Failed to load logs', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStats();
    fetchLogs(1);
  }, [fetchStats]);

  const sendCampaign = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !htmlBody.trim() || htmlBody === '<p><br></p>') {
      showToast('Subject and body are required', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await API.post('/admin/email/campaign', { subject, htmlBody, audience });
      showToast(res.data.message);
      setSubject('');
      setHtmlBody('');
      fetchStats();
      fetchLogs();
    } catch (err) {
      showToast(err.response?.data?.message || 'Campaign failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const sendTest = async () => {
    try {
      await API.post('/admin/email/test', { template: testTemplate, email: testEmail });
      showToast(`Test email sent!`);
    } catch { showToast('Test email failed', 'error'); }
  };

  return (
    <div className="space-y-6 pb-12 pt-4">
      <Toast toast={toast} />
      <SectionHeader icon={FiMail} iconColor="bg-indigo-500/20 text-indigo-400" title="Email Dashboard"
        subtitle="Manage marketing campaigns, system emails, and delivery logs" />

      <div className="flex gap-2">
        {[
          { id: 'stats', label: 'Overview', icon: FiPieChart },
          { id: 'logs', label: 'Delivery Logs', icon: FiClock },
          { id: 'compose', label: 'Compose Campaign', icon: FiSend }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${tab === t.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:bg-white/10'}`}>
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {stats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard title="Total Sent" rawValue={stats.total} icon={FiSend} color="violet" />
                <StatCard title="Delivered" rawValue={stats.sent} icon={FiCheckCircle} color="emerald" />
                <StatCard title="Failed" rawValue={stats.failed} icon={FiXCircle} color="red" />
                <StatCard title="Delivery Rate" rawValue={stats.deliveryRate} icon={FiActivity} color="blue" suffix="%" />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                  <FiFilter size={16} className="text-violet-400" />
                  Emails by Category
                </h3>
                <div className="flex flex-wrap gap-3">
                  {stats.byType.map((item) => (
                    <div key={item._id.type} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-4 hover:border-violet-500/30 transition">
                      <Badge label={item._id.type} color={TYPE_COLORS[item._id.type] === '#22c55e' ? 'green' : TYPE_COLORS[item._id.type] === '#f87171' ? 'red' : 'violet'} />
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-500">{item._id.status}</span>
                        <span className="text-white font-bold">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {stats.dailyVolume?.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">Last 7 Days Volume</h3>
                  <div className="flex items-end gap-3 h-40">
                    {(() => {
                      const max = Math.max(...stats.dailyVolume.map(d => d.count), 1);
                      return stats.dailyVolume.map((day) => (
                        <div key={day._id} className="flex-1 flex flex-col items-center gap-3 group">
                          <span className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition">{day.count}</span>
                          <div className="w-full bg-violet-600/20 rounded-t-lg relative overflow-hidden" style={{ height: `${(day.count / max) * 100}%` }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-violet-600 to-indigo-500" />
                          </div>
                          <span className="text-[10px] font-medium text-gray-500 uppercase">{day._id.split('-').slice(2)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </>
          ) : <Shimmer className="h-96" />}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-wrap gap-3">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition">
              <option value="">All Types</option>
              {['otp', 'welcome', 'purchase', 'follower', 'note_alert', 'password_reset', 'campaign'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition">
              <option value="">All Status</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
            <Btn variant="ghost" size="sm" icon={FiRefreshCw} onClick={() => fetchLogs(1)}>Apply Filters</Btn>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.05]">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Recipient</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Subject</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {loading ? [...Array(6)].map((_, i) => <tr key={i}><td colSpan={5} className="px-6 py-4"><Shimmer className="h-8" /></td></tr>) :
                  logs.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No emails found.</td></tr> :
                    logs.map(log => (
                      <tr key={log._id} className="hover:bg-white/[0.02] transition">
                        <td className="px-6 py-4 text-sm text-white font-medium">{log.to}</td>
                        <td className="px-6 py-4 text-sm text-gray-400 truncate max-w-[200px]">{log.subject}</td>
                        <td className="px-6 py-4"><Badge label={log.type} color="violet" /></td>
                        <td className="px-6 py-4"><Badge label={log.status} color={log.status === 'sent' ? 'green' : 'red'} /></td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-mono">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => fetchLogs(p)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition ${pagination.page === p ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/20 flex items-center justify-center text-violet-400">
                  <FiMail size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">Create New Campaign</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Audience</label>
                  <select value={audience} onChange={e => setAudience(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition">
                    <option value="all">All Verified Users</option>
                    <option value="buyers">Buyers Only</option>
                    <option value="sellers">Sellers Only</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Subject</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. 🎉 New notes added this week!"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Content Body (HTML)</label>
                <div className="bg-white rounded-2xl overflow-hidden quill-custom">
                  <ReactQuill theme="snow" value={htmlBody} onChange={setHtmlBody} style={{ height: 300, color: '#000' }} />
                </div>
              </div>

              <div className="pt-4">
                <Btn variant="primary" size="md" icon={FiSend} onClick={sendCampaign} disabled={sending} className="w-full justify-center py-4">
                  {sending ? '⏳ Sending to database...' : '🚀 Launch Campaign'}
                </Btn>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FiZap size={16} className="text-amber-400" />
                Send Test Email
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">Template</label>
                  <select value={testTemplate} onChange={e => setTestTemplate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white">
                    <option value="welcome">Welcome Email</option>
                    <option value="purchase">Purchase Receipt</option>
                    <option value="follower">New Follower</option>
                    <option value="campaign">Current Campaign Draft</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">Test Address</label>
                  <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white" />
                </div>
                <Btn variant="ghost" size="xs" icon={FiSend} onClick={sendTest} className="w-full">Send Test</Btn>
              </div>
            </div>

            <div className="bg-violet-600/10 border border-violet-500/20 rounded-3xl p-6">
              <h4 className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">Pro Tip</h4>
              <p className="text-xs text-violet-300/70 leading-relaxed">
                Use HTML tags like &lt;b&gt; and &lt;i&gt; for styling. Campaigns are sent in batches to ensure maximum deliverability and avoid spam filters.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsTab = () => {
  const [settings, setSettings] = useState({
    platformFee: 10,
    maintenanceMode: false,
    allowRegistrations: true,
    announcementBanner: '',
    minWithdrawalAmount: 100,
    maxFileSize: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    API.get('/admin/settings').then(r => { setSettings(s => ({ ...s, ...r.data })); }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await API.put('/admin/settings', settings);
      showToast('Settings saved successfully');
    } catch { showToast('Failed to save settings', 'error'); }
    finally { setSaving(false); }
  };

  const Toggle = ({ label, sub, field }) => (
    <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
      </div>
      <button onClick={() => setSettings(s => ({ ...s, [field]: !s[field] }))}
        className={`relative w-12 h-6 rounded-full transition-colors ${settings[field] ? 'bg-violet-600' : 'bg-white/10'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings[field] ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 pb-12 pt-4 max-w-2xl">
      <Toast toast={toast} />
      <SectionHeader icon={FiSettings} iconColor="bg-cyan-500/20 text-cyan-400" title="Platform Settings"
        subtitle="Configure global platform behaviour and limits" />

      {loading ? <Shimmer className="h-96" /> : (
        <div className="space-y-5">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Platform Controls</h3>
            <Toggle label="Maintenance Mode" sub="Show maintenance page to all non-admin users" field="maintenanceMode" />
            <Toggle label="Allow New Registrations" sub="Disable to prevent new users from signing up" field="allowRegistrations" />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Revenue Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Platform Fee (%)" type="number" min="0" max="100" value={settings.platformFee}
                onChange={e => setSettings(s => ({ ...s, platformFee: Number(e.target.value) }))} />
              <Input label="Min Withdrawal (₹)" type="number" min="0" value={settings.minWithdrawalAmount}
                onChange={e => setSettings(s => ({ ...s, minWithdrawalAmount: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Upload Limits</h3>
            <Input label="Max File Size (MB)" type="number" min="1" max="100" value={settings.maxFileSize}
              onChange={e => setSettings(s => ({ ...s, maxFileSize: Number(e.target.value) }))} />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Announcement Banner</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Banner Message (leave empty to hide)</label>
              <input value={settings.announcementBanner}
                onChange={e => setSettings(s => ({ ...s, announcementBanner: e.target.value }))}
                placeholder="e.g. Platform maintenance scheduled for May 15…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition" />
            </div>
          </div>

          <Btn variant="primary" size="md" icon={FiCheck} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </Btn>
        </div>
      )}
    </div>
  );
};

// ─── Main Layout ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({ pendingNotes: 0, openReports: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/admin/dashboard').then(res => {
      setStats({
        pendingNotes: res.data.pendingNotesCount || 0,
        openReports: res.data.openReportsCount || 0
      });
    }).catch(() => {});
  }, []);

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: FiActivity, badge: null },
    { id: 'users', label: 'User Management', icon: FiUsers, badge: null },
    { id: 'content', label: 'Content Moderation', icon: FiFileText, badge: stats.pendingNotes },
    { id: 'chats', label: 'Live Chats', icon: FiMessageSquare, badge: null },
    { id: 'finance', label: 'Financials', icon: FiDollarSign, badge: null },
    { id: 'support', label: 'Support & Reports', icon: FiFlag, badge: stats.openReports },
    { id: 'email', label: 'Email Dashboard', icon: FiMail, badge: null },
    { id: 'settings', label: 'Platform Settings', icon: FiSettings, badge: null },
  ];

  const handleTabClick = (id) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  const tabLabel = sidebarItems.find(i => i.id === activeTab)?.label || activeTab;

  return (
    <div className="min-h-screen bg-[#050508] font-sans text-white flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#08080d] border-r border-white/[0.07] z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <FiShield size={16} className="text-white" />
            </div>
            <span className="font-bold text-sm text-white tracking-wide">Admin Panel</span>
          </div>
          <button onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-500 hover:text-white hover:bg-white/5 border border-white/[0.07] transition-all">
            ← Back to Website
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 py-2">Navigation</p>
          {sidebarItems.map(item => {
            const isActive = activeTab === item.id && item.id !== 'email';
            return (
              <button key={item.id} onClick={() => handleTabClick(item.id)}
                className={`relative w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium overflow-hidden ${isActive ? 'bg-violet-600/15 text-violet-300 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]' : 'text-gray-500 hover:text-white hover:bg-white/[0.05]'}`}>
                {isActive && <div className="absolute left-0 top-0 w-1 h-full bg-violet-500" />}
                <div className="flex items-center gap-3 relative z-10">
                  <item.icon size={16} className={isActive ? 'text-violet-400' : 'text-gray-600'} />
                  {item.label}
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full leading-none">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.07]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-600/10 border border-violet-500/15">
            <div className="w-7 h-7 rounded-lg bg-violet-600/30 flex items-center justify-center">
              <FiShield size={14} className="text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Admin Access</p>
              <p className="text-[10px] text-violet-400/60">Full privileges</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden p-4 border-b border-white/[0.07] bg-[#08080d] sticky top-0 z-30 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/5 rounded-lg border border-white/10 text-gray-400 hover:text-white transition">
            <FiMenu size={18} />
          </button>
          <span className="text-sm font-medium text-white">{tabLabel}</span>
        </div>

        <div className="flex-1 p-5 lg:p-10 overflow-y-auto">
          {activeTab === 'overview' && <Overview onTabChange={setActiveTab} />}
          {activeTab === 'users' && <UserManagementTab />}
          {activeTab === 'content' && <ContentModerationTab />}
          {activeTab === 'chats' && <LiveChatsTab />}
          {activeTab === 'finance' && <FinancialsTab />}
          {activeTab === 'support' && <SupportTab />}
          {activeTab === 'email' && <EmailsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}