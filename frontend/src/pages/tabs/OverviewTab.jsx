import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiUsers, FiFileText, FiPackage, FiDollarSign, FiActivity,
  FiRefreshCw, FiAlertTriangle, FiZap, FiMessageSquare,
  FiFlag, FiCreditCard, FiSettings, FiChevronRight,
  FiArrowUpRight, FiArrowDownRight
} from 'react-icons/fi';
import API from '../../utils/api';
import { useAdminStore } from '../../store/adminStore';
import { Shimmer, StatCard, SectionHeader, Avatar, fmt, fmtDate, fmtDateTime, Btn } from './SharedAdminUI';

const OverviewTab = ({ onTabChange }) => {
  const { overviewData: data, setOverviewData, overviewLastUpdated: lastUpdated, setOverviewLastUpdated } = useAdminStore();
  const [loading, setLoading] = useState(!data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const res = await API.get('/admin/dashboard');
      setOverviewData(res.data);
      setOverviewLastUpdated(new Date());
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setOverviewData, setOverviewLastUpdated]);

  useEffect(() => { 
    if (!data) fetchData(); 
  }, [data, fetchData]);

  const [, forceUpdate] = useReducer(x => x + 1, 0);
  useEffect(() => {
    const id = setInterval(forceUpdate, 10000);
    return () => clearInterval(id);
  }, []);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time metrics, revenue, and platform activity.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-gray-600">Updated {Math.round((Date.now() - new Date(lastUpdated).getTime()) / 1000)}s ago</span>}
          <button onClick={() => fetchData(true)} disabled={refreshing} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition">
            <FiRefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" rawValue={metrics?.totalUsers || 0} icon={FiUsers} color="blue" delay={0.05} onClick={() => onTabChange('users')} />
        <StatCard title="Notes Uploaded" rawValue={metrics?.totalNotes || 0} icon={FiFileText} color="emerald" delay={0.10} onClick={() => onTabChange('content')} />
        <StatCard title="Total Bundles" rawValue={metrics?.totalBundles || 0} icon={FiPackage} color="orange" delay={0.15} />
        <StatCard title="Platform Revenue" rawValue={metrics?.platformRevenue || 0} icon={FiDollarSign} color="violet" delay={0.20} prefix="₹" onClick={() => onTabChange('finance')} />
      </div>

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

export default OverviewTab;
