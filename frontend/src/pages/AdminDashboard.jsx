import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiFileText, FiDollarSign, FiActivity,
  FiMail, FiShield, FiMenu,
  FiMessageSquare,
  FiSettings, FiFlag, FiUpload, FiVolume2
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import ErrorBoundary from '../components/ErrorBoundary';

// Lazy load the newly extracted tabs
const OverviewTab = lazy(() => import('./tabs/OverviewTab'));
const UserManagementTab = lazy(() => import('./tabs/UserManagementTab'));
const ContentModerationTab = lazy(() => import('./tabs/ContentModerationTab'));
const LiveChatsTab = lazy(() => import('./tabs/LiveChatsTab'));
const FinancialsTab = lazy(() => import('./tabs/FinancialsTab'));
const SupportTab = lazy(() => import('./tabs/SupportTab'));
const EmailsTab = lazy(() => import('./tabs/EmailsTab'));
const SettingsTab = lazy(() => import('./tabs/SettingsTab'));
const BulkUploadsTab = lazy(() => import('./tabs/BulkUploadsTab'));
const BannersTab = lazy(() => import('./tabs/BannersTab'));

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
    { id: 'bulk-upload', label: 'Bulk Upload', icon: FiUpload, badge: null },
    { id: 'content', label: 'Content Moderation', icon: FiFileText, badge: stats.pendingNotes },
    { id: 'chats', label: 'Live Chats', icon: FiMessageSquare, badge: null },
    { id: 'finance', label: 'Financials', icon: FiDollarSign, badge: null },
    { id: 'support', label: 'Support & Reports', icon: FiFlag, badge: stats.openReports },
    { id: 'email', label: 'Email Dashboard', icon: FiMail, badge: null },
    { id: 'banners', label: 'Broadcast Banners', icon: FiVolume2, badge: null },
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
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => handleTabClick(item.id)}
                className={`relative w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium overflow-hidden ${isActive ? 'bg-violet-600/15 text-violet-300 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]' : 'text-gray-500 hover:text-white hover:bg-white/[0.05]'}`}>
                {isActive && <div className="absolute left-0 top-0 w-1 h-full bg-violet-500" />}
                <div className="flex items-center gap-3 relative z-10">
                  <item.icon size={16} className={isActive ? 'text-violet-400' : 'text-gray-600'} />
                  {item.label}
                </div>
                {item.badge > 0 && (
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
          <ErrorBoundary>
            <Suspense fallback={<div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-white/5 rounded w-3/4"></div><div className="space-y-2"><div className="h-4 bg-white/5 rounded"></div><div className="h-4 bg-white/5 rounded w-5/6"></div></div></div></div>}>
              {activeTab === 'overview' && <OverviewTab onTabChange={setActiveTab} />}
              {activeTab === 'users' && <UserManagementTab />}
              {activeTab === 'bulk-upload' && <BulkUploadsTab />}
              {activeTab === 'content' && <ContentModerationTab />}
              {activeTab === 'chats' && <LiveChatsTab />}
              {activeTab === 'finance' && <FinancialsTab />}
              {activeTab === 'support' && <SupportTab />}
              {activeTab === 'email' && <EmailsTab />}
              {activeTab === 'banners' && <BannersTab />}
              {activeTab === 'settings' && <SettingsTab />}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}