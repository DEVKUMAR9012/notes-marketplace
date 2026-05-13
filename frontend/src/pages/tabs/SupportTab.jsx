import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiFlag, FiLock, FiCheckCircle, FiX, FiSend } from 'react-icons/fi';
import API from '../../utils/api';
import { Shimmer, SectionHeader, Badge, Btn, Modal, Toast, fmtDate } from './SharedAdminUI';

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

  const showToast = useCallback((msg, type = 'success') => { 
    setToast({ msg, type }); 
    setTimeout(() => setToast(null), 3500); 
  }, []);

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

  const resolveReport = useCallback(async (id, action) => {
    try {
      await API.patch(`/admin/reports/${id}`, { status: action });
      setReports(r => r.map(x => x._id === id ? { ...x, status: action } : x));
      showToast('Report updated');
    } catch { showToast('Failed', 'error'); }
  }, [showToast]);

  const sendReply = useCallback(async () => {
    if (!replyText.trim()) return;
    try {
      await API.post(`/admin/contacts/${replyModal._id}/reply`, { message: replyText });
      showToast('Reply sent successfully');
      setReplyModal(null);
      setReplyText('');
    } catch { showToast('Failed to send reply', 'error'); }
  }, [replyText, replyModal, showToast]);

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

export default SupportTab;
