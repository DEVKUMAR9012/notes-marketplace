import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiFileText, FiPackage, FiDollarSign, FiActivity,
  FiMail, FiShield, FiAlertTriangle, FiMenu, FiRefreshCw,
  FiArrowUpRight, FiArrowDownRight, FiChevronRight, FiZap
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';

import UserManagement from './admin/UserManagement';

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

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-violet-600/30 text-violet-300',
  'bg-indigo-600/30 text-indigo-300',
  'bg-cyan-600/30 text-cyan-300',
  'bg-emerald-600/30 text-emerald-300',
  'bg-amber-600/30 text-amber-300',
  'bg-rose-600/30 text-rose-300',
  'bg-pink-600/30 text-pink-300',
  'bg-sky-600/30 text-sky-300',
];

function avatarColor(name = '') {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
);

const StatCardSkeleton = () => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-5">
    <Shimmer className="w-14 h-14 rounded-xl" />
    <div className="flex-1 space-y-2">
      <Shimmer className="h-3 w-24 rounded-md" />
      <Shimmer className="h-8 w-32 rounded-md" />
    </div>
  </div>
);

const FeedRowSkeleton = () => (
  <div className="flex items-center gap-4 p-3">
    <Shimmer className="w-10 h-10 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Shimmer className="h-3 w-3/4 rounded-md" />
      <Shimmer className="h-2 w-1/2 rounded-md" />
    </div>
    <Shimmer className="h-6 w-16 rounded-full" />
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

const colorMap = {
  blue: { wrap: 'bg-blue-500/15 border-blue-500/25', text: 'text-blue-400', bar: 'bg-blue-400', stroke: 'stroke-blue-500' },
  emerald: { wrap: 'bg-emerald-500/15 border-emerald-500/25', text: 'text-emerald-400', bar: 'bg-emerald-400', stroke: 'stroke-emerald-500' },
  orange: { wrap: 'bg-orange-500/15 border-orange-500/25', text: 'text-orange-400', bar: 'bg-orange-400', stroke: 'stroke-orange-500' },
};

const StatCard = ({ title, rawValue = 0, icon: Icon, color, delay, prefix = '', suffix = '' }) => {
  const animated = useCountUp(rawValue, 1000, rawValue > 0);
  const c = colorMap[color];

  const points = color === 'blue' ? "0,25 20,20 40,30 60,15 80,20 100,5" :
                 color === 'emerald' ? "0,30 20,15 40,25 60,10 80,15 100,0" :
                 "0,20 20,25 40,15 60,20 80,5 100,10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-5 hover:bg-white/[0.08] transition-colors group relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-20 ${c.bar}`} />
      </div>
      
      <svg className={`absolute bottom-0 right-0 w-1/2 h-12 opacity-20 pointer-events-none ${c.stroke}`} viewBox="0 0 100 35" preserveAspectRatio="none">
        <polyline points={points} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className={`relative z-10 w-14 h-14 rounded-xl flex items-center justify-center border flex-shrink-0 ${c.wrap} ${c.text}`}>
        <Icon size={22} />
      </div>
      <div className="relative z-10">
        <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
        <p className="text-white text-3xl font-bold tracking-tight tabular-nums">
          {prefix}{animated.toLocaleString()}{suffix}
        </p>
      </div>
    </motion.div>
  );
};

// ─── Live Badge ───────────────────────────────────────────────────────────────

const LiveDot = () => (
  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
    </span>
    Live
  </span>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, iconColor, title, action }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${iconColor}`}><Icon size={20} /></div>
      <h2 className="text-base font-semibold text-white">{title}</h2>
    </div>
    {action}
  </div>
);

// ─── ViewAll Link ─────────────────────────────────────────────────────────────

const ViewAll = ({ onClick }) => (
  <button onClick={onClick} className="text-xs text-gray-500 hover:text-violet-400 transition-colors flex items-center gap-1 group">
    View all <FiChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
  </button>
);

// ─── Coming Soon Placeholder ──────────────────────────────────────────────────

const ComingSoon = ({ icon: Icon, color, title, description, features = [] }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center text-center"
  >
    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${color}`}>
      <Icon size={32} />
    </div>
    <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
    <p className="text-gray-500 text-sm max-w-md mb-8">{description}</p>
    {features.length > 0 && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 text-left">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
            <span className="text-sm text-gray-400">{f}</span>
          </div>
        ))}
      </div>
    )}
    <div className="mt-8 flex items-center gap-2 text-xs text-gray-600 bg-white/5 px-4 py-2 rounded-full border border-white/5">
      <FiZap size={12} className="text-yellow-500" /> In development
    </div>
  </motion.div>
);

// ─── Overview ─────────────────────────────────────────────────────────────────

const Overview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await API.get('/admin/dashboard');
      setData(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load dashboard data. Please check your backend connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const timeSince = lastUpdated
    ? `${Math.round((Date.now() - lastUpdated) / 1000)}s ago`
    : null;

  if (loading) {
    return (
      <div className="space-y-8 pb-12 pt-4 animate-pulse">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="h-9 w-48 bg-white/5 rounded-xl" />
            <div className="h-4 w-72 bg-white/5 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-3">
              <Shimmer className="h-5 w-40 rounded-lg" />
              {[...Array(3)].map((_, j) => <FeedRowSkeleton key={j} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-12">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
          <FiAlertTriangle size={28} />
        </div>
        <p className="text-red-400 font-medium">{error}</p>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition"
        >
          <FiRefreshCw size={14} /> Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, recentActivity } = data;

  return (
    <div className="space-y-8 pb-12 pt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            Overview
          </h1>
          <p className="text-gray-500 mt-2 text-sm">Real-time metrics, revenue, and platform activity.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
          {timeSince && (
            <span className="text-xs text-gray-500 hidden md:block">Updated {timeSince}</span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="Refresh Dashboard"
            className="flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 w-10 h-10 rounded-full transition-all text-gray-300 hover:text-white disabled:opacity-50"
          >
            <FiRefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/admin/email')}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/25 px-5 py-2.5 rounded-xl transition-all text-sm font-bold text-white"
          >
            <FiMail size={16} /> Email Dashboard
          </button>
        </motion.div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard title="Active Users" rawValue={metrics?.totalUsers || 0} icon={FiUsers} color="blue" delay={0.05} />
        <StatCard title="Notes Uploaded" rawValue={metrics?.totalNotes || 0} icon={FiFileText} color="emerald" delay={0.1} />
        <StatCard title="Total Bundles" rawValue={metrics?.totalBundles || 0} icon={FiPackage} color="orange" delay={0.15} />
      </div>

      {/* Revenue & Signups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-3xl p-7"
        >
          <SectionHeader
            icon={FiDollarSign}
            iconColor="bg-emerald-500/20 text-emerald-400"
            title="Revenue"
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/30 rounded-2xl p-5 border border-white/5 relative overflow-hidden">
              <FiDollarSign className="absolute -right-4 -bottom-4 w-28 h-28 text-white/[0.03] transform -rotate-12 pointer-events-none" />
              <div className="relative z-10">
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">Gross Sales</p>
                <p className="text-3xl font-bold text-white tabular-nums">
                  ₹{(metrics?.grossSales || 0).toLocaleString()}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400">
                  <FiArrowUpRight size={12} /> All time
                </div>
              </div>
            </div>
            <div className="bg-violet-600/10 rounded-2xl p-5 border border-violet-500/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent" />
              <FiDollarSign className="absolute -right-4 -bottom-4 w-28 h-28 text-violet-500/10 transform -rotate-12 pointer-events-none" />
              <div className="relative z-10">
                <p className="text-violet-400/70 text-xs font-medium uppercase tracking-wider mb-3">Platform Cut (10%)</p>
                <p className="text-3xl font-bold text-violet-300 tabular-nums">
                  ₹{(metrics?.platformRevenue || 0).toLocaleString()}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-violet-400/60">
                  <FiArrowUpRight size={12} /> Net revenue
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* New Signups */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white/5 border border-white/10 rounded-3xl p-7"
        >
          <SectionHeader
            icon={FiUsers}
            iconColor="bg-blue-500/20 text-blue-400"
            title="New Signups"
            action={<ViewAll onClick={() => { }} />}
          />
          <div className="space-y-2">
            {recentActivity?.users?.length ? recentActivity.users.map((user, i) => (
              <motion.div
                key={user._id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-2xl bg-black/20 border border-white/5 hover:bg-black/40 hover:translate-x-1 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0 ${avatarColor(user.name)}`}>
                    {user.avatar || user.profileImage
                      ? <img src={user.avatar || user.profileImage} className="w-full h-full object-cover" alt="" />
                      : (user.name?.charAt(0)?.toUpperCase() || '?')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.name}</p>
                    <p className="text-gray-500 text-xs truncate">{user.email}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-600 bg-white/5 px-3 py-1 rounded-full flex-shrink-0 ml-2">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </motion.div>
            )) : (
              <p className="text-gray-600 text-sm text-center py-8">No recent signups.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Transactions & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-3xl p-7"
        >
          <SectionHeader
            icon={FiActivity}
            iconColor="bg-pink-500/20 text-pink-400"
            title="Transaction Feed"
            action={<LiveDot />}
          />
          <div className="space-y-2">
            {recentActivity?.transactions?.length ? recentActivity.transactions.map((tx, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.04 }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-black/20 border border-white/5 hover:bg-black/40 hover:translate-x-1 transition-all duration-300"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === 'credit'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-red-500/15 text-red-400'
                  }`}>
                  {tx.type === 'credit'
                    ? <FiArrowUpRight size={14} />
                    : <FiArrowDownRight size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-gray-600 text-xs mt-0.5 truncate">
                    {tx.userName} · {new Date(tx.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <span className={`flex-shrink-0 text-sm font-bold px-3 py-1 rounded-lg ${tx.type === 'credit'
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-red-400 bg-red-500/10'
                  }`}>
                  {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                </span>
              </motion.div>
            )) : (
              <p className="text-gray-600 text-sm text-center py-8">No recent transactions.</p>
            )}
          </div>
        </motion.div>

        {/* Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-white/5 border border-white/10 rounded-3xl p-7"
        >
          <SectionHeader
            icon={FiFileText}
            iconColor="bg-orange-500/20 text-orange-400"
            title="Latest Uploads"
            action={<ViewAll onClick={() => { }} />}
          />
          <div className="space-y-2">
            {recentActivity?.notes?.length ? recentActivity.notes.map((note, i) => (
              <motion.div
                key={note._id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.04 }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-black/20 border border-white/5 hover:bg-black/40 hover:translate-x-1 transition-all duration-300 group"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-white text-sm font-medium truncate group-hover:text-violet-300 transition-colors">{note.title}</p>
                  <p className="text-gray-600 text-xs mt-0.5">
                    By {note.uploadedBy?.name || 'Unknown'} · {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`ml-auto flex-shrink-0 text-sm font-bold px-3 py-1.5 rounded-lg ${note.price === 0
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-violet-500/10 text-violet-300'
                  }`}>
                  {note.price === 0 ? 'FREE' : `₹${note.price}`}
                </span>
              </motion.div>
            )) : (
              <p className="text-gray-600 text-sm text-center py-8">No recent uploads.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ─── Main Layout ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: FiActivity, badge: null },
    { id: 'users', label: 'User Management', icon: FiUsers, badge: null },
    { id: 'content', label: 'Content Moderation', icon: FiFileText, badge: 3 },
    { id: 'finance', label: 'Financials', icon: FiDollarSign, badge: null },
    { id: 'support', label: 'Support & Reports', icon: FiShield, badge: 1 },
    { id: 'email', label: 'Email Dashboard', icon: FiMail, badge: null },
  ];

  const handleTabClick = (id) => {
    if (id === 'email') { navigate('/admin/email'); return; }
    setActiveTab(id);
    setSidebarOpen(false);
  };

  const tabContent = {
    users: {
      icon: FiUsers, color: 'bg-blue-500/10 text-blue-400',
      title: 'User Management', description: 'Manage, verify, and moderate user accounts across the platform.',
      features: ['Seller verification queue', 'Block / unblock accounts', 'Role management', 'Account activity logs'],
    },
    content: {
      icon: FiFileText, color: 'bg-orange-500/10 text-orange-400',
      title: 'Content Moderation', description: 'Review newly uploaded notes and bundles before they go live.',
      features: ['Approve / reject notes', 'Bundle review queue', 'Flag management', 'DMCA reporting'],
    },
    finance: {
      icon: FiDollarSign, color: 'bg-emerald-500/10 text-emerald-400',
      title: 'Financials & Payouts', description: 'Track all Razorpay transactions and process seller withdrawal requests.',
      features: ['Withdrawal approvals', 'Razorpay reconciliation', 'Payout history', 'Revenue reports'],
    },
    support: {
      icon: FiShield, color: 'bg-red-500/10 text-red-400',
      title: 'Support & Reports', description: 'Manage user reports and respond to contact queries.',
      features: ['User report inbox', 'Contact form replies', 'Dispute resolution', 'Ticket status tracking'],
    },
  };

  return (
    <div className="min-h-screen bg-[#050508] font-sans text-white flex">

      {/* Mobile overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#08080d]
        border-r border-white/[0.07] z-50 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo area */}
        <div className="p-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <FiShield size={16} className="text-white" />
            </div>
            <span className="font-bold text-sm text-white tracking-wide">Admin Panel</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-500 hover:text-white hover:bg-white/5 border border-white/[0.07] transition-all"
          >
            ← Back to Website
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 py-2">Navigation</p>
          {sidebarItems.map(item => {
            const isActive = activeTab === item.id && item.id !== 'email';
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`relative w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium overflow-hidden
                  ${isActive
                    ? 'bg-violet-600/15 text-violet-300 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]'
                    : 'text-gray-500 hover:text-white hover:bg-white/[0.05]'
                  }`}
              >
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

        {/* Footer badge */}
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
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 bg-white/5 rounded-lg border border-white/10 text-gray-400 hover:text-white transition"
          >
            <FiMenu size={18} />
          </button>
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <span className="text-gray-600">Admin</span>
            <span>/</span>
            <span className="text-white font-medium capitalize">{activeTab}</span>
          </div>
        </div>

        <div className="flex-1 p-5 lg:p-10 overflow-y-auto">
          {activeTab === 'overview' && <Overview />}
          {activeTab === 'users' && <UserManagement />}
          {['content', 'finance', 'support'].map(id =>
            activeTab === id && tabContent[id] ? (
              <ComingSoon key={id} {...tabContent[id]} />
            ) : null
          )}
        </div>
      </main>
    </div>
  );
}