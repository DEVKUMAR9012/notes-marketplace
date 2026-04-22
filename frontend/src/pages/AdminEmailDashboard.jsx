import { useState, useEffect, useCallback } from 'react';
import API from '../utils/api';

// ── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${color}33`,
    borderRadius: 16,
    padding: '24px',
    flex: 1,
    minWidth: 160
  }}>
    <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 4 }}>{label}</div>
    <div style={{ color: '#fff', fontSize: 28, fontWeight: 800 }}>{value}</div>
  </div>
);

// ── Badge ───────────────────────────────────────────────────────────────────
const Badge = ({ label, color }) => (
  <span style={{
    background: `${color}22`,
    color: color,
    border: `1px solid ${color}44`,
    borderRadius: 6,
    padding: '2px 10px',
    fontSize: 12,
    fontWeight: 600
  }}>{label}</span>
);

const TYPE_COLORS = {
  otp: '#a78bfa',
  welcome: '#22c55e',
  purchase: '#f59e0b',
  follower: '#38bdf8',
  note_alert: '#fb923c',
  password_reset: '#f87171',
  campaign: '#7c3aed'
};

export default function AdminEmailDashboard() {
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

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get('/email/stats');
      setStats(res.data.stats);
    } catch {
      showToast('Failed to load stats', 'error');
    }
  }, []);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      const res = await API.get(`/email/logs?${params}`);
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch {
      showToast('Failed to load logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, [fetchStats, fetchLogs]);

  const sendCampaign = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !htmlBody.trim()) {
      showToast('Subject and body are required', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await API.post('/email/campaign', { subject, htmlBody, audience });
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
      await API.post('/email/test', { template: testTemplate, email: testEmail });
      showToast(`Test email sent to ${testEmail || 'your account'}!`);
    } catch {
      showToast('Test email failed', 'error');
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(124,58,237,0.3)',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box'
  };

  const tabStyle = (active) => ({
    padding: '10px 24px',
    borderRadius: 10,
    border: active ? '1px solid #7c3aed' : '1px solid rgba(255,255,255,0.08)',
    background: active ? 'rgba(124,58,237,0.2)' : 'transparent',
    color: active ? '#a78bfa' : 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontWeight: active ? 700 : 400,
    fontSize: 14,
    transition: 'all 0.2s'
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f1a',
      color: '#fff',
      fontFamily: "'Segoe UI', sans-serif",
      padding: '32px 24px'
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'error' ? '#7f1d1d' : '#14532d',
          border: `1px solid ${toast.type === 'error' ? '#f87171' : '#22c55e'}`,
          color: '#fff', borderRadius: 12, padding: '14px 20px',
          fontSize: 14, fontWeight: 600, maxWidth: 380,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.2s ease'
        }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          📧 Email Dashboard
        </h1>
        <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 15 }}>
          Manage campaigns, view delivery logs, and monitor email performance
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { id: 'stats', label: '📊 Stats & Overview' },
          { id: 'logs', label: '📋 Email Logs' },
          { id: 'compose', label: '✉️ Compose Campaign' }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── STATS TAB ── */}
      {tab === 'stats' && (
        <div>
          {stats ? (
            <>
              {/* Stat Cards */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
                <StatCard icon="📤" label="Total Sent" value={stats.total.toLocaleString()} color="#7c3aed" />
                <StatCard icon="✅" label="Delivered" value={stats.sent.toLocaleString()} color="#22c55e" />
                <StatCard icon="❌" label="Failed" value={stats.failed.toLocaleString()} color="#f87171" />
                <StatCard icon="📈" label="Delivery Rate" value={stats.deliveryRate} color="#f59e0b" />
              </div>

              {/* By Type Breakdown */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(124,58,237,0.2)',
                borderRadius: 16, padding: 24, marginBottom: 28
              }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>Emails by Type</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {stats.byType.map((item, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${TYPE_COLORS[item._id.type] || '#7c3aed'}33`,
                      borderRadius: 10, padding: '12px 18px',
                      display: 'flex', alignItems: 'center', gap: 10
                    }}>
                      <Badge label={item._id.type} color={TYPE_COLORS[item._id.type] || '#7c3aed'} />
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{item._id.status}</span>
                      <span style={{ color: '#fff', fontWeight: 700 }}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Volume */}
              {stats.dailyVolume.length > 0 && (
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: 16, padding: 24
                }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>Last 7 Days Volume</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100 }}>
                    {stats.dailyVolume.map((day, i) => {
                      const max = Math.max(...stats.dailyVolume.map(d => d.count), 1);
                      const h = Math.round((day.count / max) * 80);
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{day.count}</span>
                          <div style={{
                            width: '100%', height: h || 4,
                            background: 'linear-gradient(180deg,#7c3aed,#4f46e5)',
                            borderRadius: 4
                          }} />
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                            {day._id.split('-').slice(1).join('/')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>Loading stats...</div>
          )}
        </div>
      )}

      {/* ── LOGS TAB ── */}
      {tab === 'logs' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inputStyle, width: 160 }}>
              <option value="">All Types</option>
              {['otp','welcome','purchase','follower','note_alert','password_reset','campaign'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 140 }}>
              <option value="">All Status</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
            <button
              onClick={() => fetchLogs(1)}
              style={{
                background: 'rgba(124,58,237,0.2)', border: '1px solid #7c3aed',
                color: '#a78bfa', borderRadius: 10, padding: '12px 20px',
                cursor: 'pointer', fontWeight: 600, fontSize: 14
              }}
            >
              Apply Filter
            </button>
          </div>

          {/* Table */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 16, overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(124,58,237,0.1)' }}>
                  {['To', 'Subject', 'Type', 'Status', 'Sent At'].map(h => (
                    <th key={h} style={{
                      padding: '14px 16px', textAlign: 'left',
                      color: 'rgba(255,255,255,0.5)', fontSize: 12,
                      fontWeight: 600, letterSpacing: 0.5
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No emails found</td></tr>
                ) : logs.map((log, i) => (
                  <tr key={log._id} style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{log.to}</td>
                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.6)', fontSize: 13, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.subject}</td>
                    <td style={{ padding: '12px 16px' }}><Badge label={log.type} color={TYPE_COLORS[log.type] || '#7c3aed'} /></td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge label={log.status} color={log.status === 'sent' ? '#22c55e' : '#f87171'} />
                    </td>
                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                      {new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => fetchLogs(p)}
                  style={{
                    padding: '8px 14px', borderRadius: 8,
                    border: p === pagination.page ? '1px solid #7c3aed' : '1px solid rgba(255,255,255,0.1)',
                    background: p === pagination.page ? 'rgba(124,58,237,0.2)' : 'transparent',
                    color: p === pagination.page ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', fontSize: 13
                  }}
                >{p}</button>
              ))}
            </div>
          )}
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 12 }}>
            {pagination.total} total emails
          </p>
        </div>
      )}

      {/* ── COMPOSE TAB ── */}
      {tab === 'compose' && (
        <div style={{ maxWidth: 700 }}>
          {/* Campaign Composer */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 16, padding: 28, marginBottom: 24
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, color: '#fff' }}>📣 Send Campaign</h3>
            <form onSubmit={sendCampaign} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 6 }}>Audience</label>
                <select value={audience} onChange={e => setAudience(e.target.value)} style={inputStyle}>
                  <option value="all">All Verified Users</option>
                  <option value="buyers">Buyers Only (users who purchased notes)</option>
                  <option value="sellers">Sellers Only (users who made sales)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 6 }}>Subject Line</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. 🎉 New Notes Added This Week!"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 6 }}>
                  Email Body <span style={{ color: 'rgba(255,255,255,0.3)' }}>(HTML supported)</span>
                </label>
                <textarea
                  value={htmlBody}
                  onChange={e => setHtmlBody(e.target.value)}
                  placeholder="<p>Hi! We just added <strong>50 new notes</strong> this week...</p>"
                  rows={8}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                style={{
                  background: sending ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                  border: 'none', borderRadius: 10, padding: '14px 32px',
                  color: '#fff', fontWeight: 700, fontSize: 16,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  opacity: sending ? 0.7 : 1
                }}
              >
                {sending ? '⏳ Sending...' : '🚀 Send Campaign'}
              </button>
            </form>
          </div>

          {/* Test Email */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: 24
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>🧪 Send Test Email</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select value={testTemplate} onChange={e => setTestTemplate(e.target.value)} style={{ ...inputStyle, width: 180 }}>
                <option value="welcome">Welcome Email</option>
                <option value="purchase">Purchase Receipt</option>
                <option value="follower">New Follower</option>
                <option value="campaign">Campaign</option>
              </select>
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="your@email.com (optional)"
                style={{ ...inputStyle, flex: 1, minWidth: 200 }}
              />
              <button
                onClick={sendTest}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, padding: '12px 20px',
                  color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap'
                }}
              >
                Send Test
              </button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: '12px 0 0' }}>
              Leave email blank to send to your own account email.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
