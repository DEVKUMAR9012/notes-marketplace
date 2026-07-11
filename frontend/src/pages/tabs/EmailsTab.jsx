import React, { useState, useEffect, useCallback, memo, lazy, Suspense } from 'react';
import { FiMail, FiPieChart, FiClock, FiSend, FiCheckCircle, FiXCircle, FiActivity, FiFilter, FiRefreshCw, FiZap } from 'react-icons/fi';
import API from '../../utils/api';
import { Shimmer, SectionHeader, StatCard, Badge, Btn, Toast } from './SharedAdminUI';

// Lazy load ReactQuill — it's heavy (ReactQuill + findDOMNode deprecation warning suppressed)
const ReactQuill = lazy(() => import('react-quill').then(m => {
  // Dynamically import CSS only once
  import('react-quill/dist/quill.snow.css');
  return m;
}));

// ─── Type color map (memoized outside component to prevent recreation)
const TYPE_COLORS = {
  otp: 'violet', welcome: 'green', purchase: 'yellow',
  follower: 'blue', note_alert: 'orange', password_reset: 'red',
  campaign: 'violet'
};

// ─── Sub-components (memo-wrapped for render isolation)

const StatsPanel = memo(function StatsPanel({ stats }) {
  if (!stats) return <Shimmer className="h-96" />;
  // Guard: byType and dailyVolume may be undefined from API
  const byType = Array.isArray(stats.byType) ? stats.byType : [];
  const dailyVolume = Array.isArray(stats.dailyVolume) ? stats.dailyVolume : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Sent"    rawValue={stats.total        ?? 0} icon={FiSend}         color="violet" />
        <StatCard title="Delivered"     rawValue={stats.sent         ?? 0} icon={FiCheckCircle}  color="emerald" />
        <StatCard title="Failed"        rawValue={stats.failed       ?? 0} icon={FiXCircle}      color="red" />
        <StatCard title="Delivery Rate" rawValue={stats.deliveryRate ?? 0} icon={FiActivity}     color="blue" suffix="%" />
      </div>

      {byType.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
            <FiFilter size={16} className="text-violet-400" /> Emails by Category
          </h3>
          <div className="flex flex-wrap gap-3">
            {byType.map((item) => (
              <div
                key={`${item._id?.type ?? 'unknown'}-${item._id?.status ?? 'unknown'}`}
                className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-4 hover:border-violet-500/30 transition"
              >
                <Badge label={item._id?.type ?? '—'} color={TYPE_COLORS[item._id?.type] ?? 'violet'} />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-gray-500">{item._id?.status ?? '—'}</span>
                  <span className="text-white font-bold">{item.count ?? 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dailyVolume.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">Last 7 Days Volume</h3>
          <div className="flex items-end gap-3 h-40">
            {(() => {
              const max = Math.max(...dailyVolume.map(d => d.count ?? 0), 1);
              return dailyVolume.map((day) => (
                <div key={day._id} className="flex-1 flex flex-col items-center gap-3 group">
                  <span className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition">
                    {day.count ?? 0}
                  </span>
                  <div
                    className="w-full bg-violet-600/20 rounded-t-lg relative overflow-hidden"
                    style={{ height: `${((day.count ?? 0) / max) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-violet-600 to-indigo-500" />
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 uppercase">
                    {day._id?.split('-').slice(2).join('') ?? '—'}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {byType.length === 0 && dailyVolume.length === 0 && (
        <div className="text-center py-16 text-gray-500 text-sm">No email data available yet.</div>
      )}
    </div>
  );
});

const LogsPanel = memo(function LogsPanel({
  logs, loading, pagination,
  filterType, setFilterType,
  filterStatus, setFilterStatus,
  fetchLogs
}) {
  // Guard: logs may be undefined from API failure
  const safeLogs = Array.isArray(logs) ? logs : [];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap gap-3">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition"
        >
          <option value="">All Types</option>
          {['otp', 'welcome', 'purchase', 'follower', 'note_alert', 'password_reset', 'campaign'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition"
        >
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
              {['Recipient', 'Subject', 'Type', 'Status', 'Sent At'].map(h => (
                <th key={h} className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading
              ? [...Array(6)].map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-6 py-4"><Shimmer className="h-8" /></td></tr>
                ))
              : safeLogs.length === 0
                ? <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No emails found.</td></tr>
                : safeLogs.map(log => (
                    <tr key={log._id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-4 text-sm text-white font-medium">{log.to ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-400 truncate max-w-[200px]">{log.subject ?? '—'}</td>
                      <td className="px-6 py-4"><Badge label={log.type ?? '—'} color="violet" /></td>
                      <td className="px-6 py-4"><Badge label={log.status ?? '—'} color={log.status === 'sent' ? 'green' : 'red'} /></td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
            }
          </tbody>
        </table>
      </div>

      {(pagination?.pages ?? 1) > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => fetchLogs(p)}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition ${
                pagination.page === p
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                  : 'bg-white/5 text-gray-500 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

const ComposePanel = memo(function ComposePanel({
  subject, setSubject,
  htmlBody, setHtmlBody,
  audience, setAudience,
  sending, sendCampaign,
  testTemplate, setTestTemplate,
  testEmail, setTestEmail,
  sendTest
}) {
  return (
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
              <select
                value={audience}
                onChange={e => setAudience(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition"
              >
                <option value="all">All Verified Users</option>
                <option value="buyers">Buyers Only</option>
                <option value="sellers">Sellers Only</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. 🎉 New notes added this week!"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Content Body (HTML)</label>
            <div className="bg-white rounded-2xl overflow-hidden quill-custom">
              {/* Suspense for lazy-loaded ReactQuill */}
              <Suspense fallback={<div className="h-[332px] animate-pulse bg-gray-100 rounded-2xl" />}>
                <ReactQuill
                  theme="snow"
                  value={htmlBody}
                  onChange={setHtmlBody}
                  style={{ height: 300, color: '#000' }}
                />
              </Suspense>
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
            <FiZap size={16} className="text-amber-400" /> Send Test Email
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Template</label>
              <select
                value={testTemplate}
                onChange={e => setTestTemplate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
              >
                <option value="welcome">Welcome Email</option>
                <option value="purchase">Purchase Receipt</option>
                <option value="follower">New Follower</option>
                <option value="campaign">Current Campaign Draft</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Test Address</label>
              <input
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
              />
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
  );
});

// ─── Main EmailsTab ───────────────────────────────────────────────────────────
const EmailsTab = () => {
  // Safe defaults: empty arrays prevent .length crash on undefined
  const [stats, setStats]         = useState(null);
  const [logs, setLogs]           = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filterType, setFilterType]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [tab, setTab]             = useState('stats');
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState(null);

  const [subject, setSubject]     = useState('');
  const [htmlBody, setHtmlBody]   = useState('');
  const [audience, setAudience]   = useState('all');
  const [sending, setSending]     = useState(false);

  const [testTemplate, setTestTemplate] = useState('welcome');
  const [testEmail, setTestEmail]       = useState('');

  // Suppress React Quill's findDOMNode deprecation warning (library issue with React 18)
  useEffect(() => {
    const originalError = console.error;
    const errorHandler = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('findDOMNode')) {
        return; // Suppress this specific warning
      }
      originalError.apply(console, args);
    };
    console.error = errorHandler;
    return () => { console.error = originalError; };
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get('/admin/email/stats');
      // Guard: ensure stats object and nested arrays are safe
      setStats({
        total:        res.data?.stats?.total        ?? 0,
        sent:         res.data?.stats?.sent         ?? 0,
        failed:       res.data?.stats?.failed       ?? 0,
        deliveryRate: res.data?.stats?.deliveryRate ?? 0,
        byType:       Array.isArray(res.data?.stats?.byType)       ? res.data.stats.byType       : [],
        dailyVolume:  Array.isArray(res.data?.stats?.dailyVolume)  ? res.data.stats.dailyVolume  : [],
      });
    } catch {
      showToast('Failed to load stats', 'error');
      // Set safe empty state so UI renders fallback instead of crashing
      setStats({ total: 0, sent: 0, failed: 0, deliveryRate: 0, byType: [], dailyVolume: [] });
    }
  }, [showToast]);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (filterType)   params.set('type',   filterType);
      if (filterStatus) params.set('status', filterStatus);
      const res = await API.get(`/admin/email/logs?${params}`);
      // Guard: API may return undefined logs
      setLogs(Array.isArray(res.data?.logs) ? res.data.logs : []);
      setPagination(res.data?.pagination ?? { page: 1, pages: 1, total: 0 });
    } catch {
      showToast('Failed to load logs', 'error');
      setLogs([]);        // safe fallback — prevents .length crash
      setPagination({ page: 1, pages: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, showToast]);

  useEffect(() => {
    fetchStats();
    fetchLogs(1);
  }, [fetchStats, fetchLogs]);

  const sendCampaign = useCallback(async (e) => {
    e?.preventDefault();
    if (!subject.trim() || !htmlBody.trim() || htmlBody === '<p><br></p>') {
      showToast('Subject and body are required', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await API.post('/admin/email/campaign', { subject, htmlBody, audience });
      showToast(res.data?.message ?? 'Campaign sent!');
      setSubject('');
      setHtmlBody('');
      fetchStats();
      fetchLogs(1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Campaign failed', 'error');
    } finally {
      setSending(false);
    }
  }, [subject, htmlBody, audience, fetchStats, fetchLogs, showToast]);

  const sendTest = useCallback(async () => {
    if (!testEmail.trim()) { showToast('Enter a test email address', 'error'); return; }
    try {
      await API.post('/admin/email/test', { template: testTemplate, email: testEmail });
      showToast('Test email sent!');
    } catch {
      showToast('Test email failed', 'error');
    }
  }, [testTemplate, testEmail, showToast]);

  const TABS = [
    { id: 'stats',   label: 'Overview',          icon: FiPieChart },
    { id: 'logs',    label: 'Delivery Logs',      icon: FiClock },
    { id: 'compose', label: 'Compose Campaign',   icon: FiSend },
  ];

  return (
    <div className="space-y-6 pb-12 pt-4">
      <Toast toast={toast} />
      <SectionHeader
        icon={FiMail}
        iconColor="bg-indigo-500/20 text-indigo-400"
        title="Email Dashboard"
        subtitle="Manage marketing campaigns, system emails, and delivery logs"
      />

      {/* Tab switcher */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${
              tab === t.id
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats'   && <StatsPanel stats={stats} />}
      {tab === 'logs'    && (
        <LogsPanel
          logs={logs} loading={loading} pagination={pagination}
          filterType={filterType}     setFilterType={setFilterType}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          fetchLogs={fetchLogs}
        />
      )}
      {tab === 'compose' && (
        <ComposePanel
          subject={subject}         setSubject={setSubject}
          htmlBody={htmlBody}       setHtmlBody={setHtmlBody}
          audience={audience}       setAudience={setAudience}
          sending={sending}         sendCampaign={sendCampaign}
          testTemplate={testTemplate} setTestTemplate={setTestTemplate}
          testEmail={testEmail}     setTestEmail={setTestEmail}
          sendTest={sendTest}
        />
      )}
    </div>
  );
};

export default EmailsTab;
