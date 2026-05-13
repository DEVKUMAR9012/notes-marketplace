import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiDollarSign, FiCheck, FiX } from 'react-icons/fi';
import API from '../../utils/api';
import { Shimmer, SectionHeader, Avatar, Badge, Btn, Toast, fmt, fmtDate, fmtDateTime } from './SharedAdminUI';

const FinancialsTab = () => {
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('transactions');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => { 
    setToast({ msg, type }); 
    setTimeout(() => setToast(null), 3500); 
  }, []);

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
  }, [showToast]);

  const handleWithdrawal = useCallback(async (id, action) => {
    try {
      await API.patch(`/admin/withdrawals/${id}`, { action });
      setWithdrawals(w => w.map(x => x._id === id ? { ...x, status: action === 'approve' ? 'approved' : 'rejected' } : x));
      showToast(`Withdrawal ${action}d`);
    } catch { showToast('Action failed', 'error'); }
  }, [showToast]);

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

export default FinancialsTab;
