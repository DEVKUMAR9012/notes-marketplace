import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiDollarSign,
  FiTrendingUp,
  FiBookOpen,
  FiShoppingBag,
  FiUpload,
  FiExternalLink,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiEye,
  FiPlus,
  FiUser,
  FiShield,
  FiCreditCard,
  FiDownload,
  FiRefreshCw,
  FiLock
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import PDFThumbnail from '../components/PDFThumbnail';

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Payout Modal State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutUpi, setPayoutUpi] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/seller/dashboard');
      if (res.data?.success) {
        setData(res.data);
        if (res.data.stats?.upiId) {
          setPayoutUpi(res.data.stats.upiId);
        }
      }
    } catch (err) {
      console.error('Failed to load seller dashboard:', err);
      // If user is not a seller, redirect to onboard
      if (err.status === 403 || err.message?.includes('Seller account required')) {
        toast('Please complete seller onboarding first to access this dashboard.');
        navigate('/seller/onboard');
      } else {
        toast.error(err.message || 'Could not load seller dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    const amount = Number(payoutAmount);
    if (!amount || amount < 50) {
      return toast.error('Minimum withdrawal amount is ₹50');
    }
    if (amount > (data?.stats?.walletBalance || 0)) {
      return toast.error('Withdrawal amount exceeds available wallet balance');
    }
    if (!payoutUpi.trim()) {
      return toast.error('Please provide a valid UPI ID for payout');
    }

    setPayoutLoading(true);
    try {
      const res = await API.post('/seller/withdraw', {
        amount,
        upiId: payoutUpi.trim()
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Payout request submitted successfully!');
        setShowPayoutModal(false);
        setPayoutAmount('');
        fetchDashboardData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit payout request');
    } finally {
      setPayoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-coral-500/30 border-t-coral-500 rounded-full animate-spin" />
        <span className="text-xs text-gray-500 font-medium">Loading your creator dashboard...</span>
      </div>
    );
  }

  const stats = data?.stats || {};
  const notes = data?.notes || [];
  const orders = data?.orders || [];
  const withdrawals = data?.withdrawals || [];
  const chartData = data?.chartData || [];

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-display">
              Seller Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              <FiCheckCircle className="text-emerald-600" /> Verified Seller
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Track your study material sales, student downloads, and request instant UPI earnings payouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
            style={{ background: 'var(--accent)' }}
          >
            <FiUpload size={16} />
            <span>Upload New Material</span>
          </Link>

          <Link
            to={`/seller/${user?._id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border backdrop-blur-md hover:bg-black/5 transition"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <FiUser size={15} />
            <span className="hidden sm:inline">Public Profile</span>
            <FiExternalLink size={13} className="text-gray-400" />
          </Link>

          <button
            onClick={fetchDashboardData}
            title="Refresh Data"
            className="p-2.5 rounded-xl border hover:bg-black/5 text-gray-600 transition"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <FiRefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── KPI Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        {/* Wallet Balance (Withdrawable) */}
        <div className="p-5 rounded-3xl border shadow-sm backdrop-blur-xl relative overflow-hidden"
             style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Available Wallet</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-emerald-700 bg-emerald-100">
              <FiCreditCard size={17} />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-gray-900 font-display">
            ₹{stats.walletBalance || 0}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Ready to transfer</span>
            <button
              onClick={() => setShowPayoutModal(true)}
              disabled={(stats.walletBalance || 0) < 50}
              className="text-xs font-bold text-coral-600 hover:text-coral-700 underline disabled:opacity-40 disabled:no-underline"
            >
              Withdraw &rarr;
            </button>
          </div>
        </div>

        {/* Total Net Earnings */}
        <div className="p-5 rounded-3xl border shadow-sm backdrop-blur-xl relative overflow-hidden"
             style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Earnings</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-coral-600 bg-coral-100">
              <FiDollarSign size={17} />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-gray-900 font-display">
            ₹{stats.totalEarnings || 0}
          </div>
          <div className="mt-3 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <FiTrendingUp /> 90% Net Seller Share
          </div>
        </div>

        {/* Total Orders / Sales */}
        <div className="p-5 rounded-3xl border shadow-sm backdrop-blur-xl relative overflow-hidden"
             style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Sales</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-blue-600 bg-blue-100">
              <FiShoppingBag size={17} />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-gray-900 font-display">
            {stats.totalSales || 0}
          </div>
          <div className="mt-3 text-[11px] text-gray-500">
            {orders.length} verified orders
          </div>
        </div>

        {/* Listed Materials */}
        <div className="p-5 rounded-3xl border shadow-sm backdrop-blur-xl relative overflow-hidden"
             style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Materials Listed</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-purple-600 bg-purple-100">
              <FiBookOpen size={17} />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-gray-900 font-display">
            {stats.totalMaterials || notes.length || 0}
          </div>
          <div className="mt-3 text-[11px] text-gray-500">
            Across {new Set(notes.map(n => n.subject)).size} subjects
          </div>
        </div>

      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b mb-6 overflow-x-auto pb-1"
           style={{ borderColor: 'var(--border)' }}>
        {[
          { id: 'overview', label: 'Overview & Charts', icon: FiTrendingUp },
          { id: 'materials', label: `My Materials (${notes.length})`, icon: FiBookOpen },
          { id: 'orders', label: `Orders & Sales (${orders.length})`, icon: FiShoppingBag },
          { id: 'payouts', label: `Payouts & UPI (${withdrawals.length})`, icon: FiCreditCard },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-coral-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-black/5'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: OVERVIEW & CHART ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Chart & Quick Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Monthly Earnings Chart */}
            <div className="lg:col-span-2 p-6 rounded-3xl border shadow-sm backdrop-blur-xl"
                 style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 font-display">Monthly Revenue Performance</h2>
                  <p className="text-xs text-gray-500">Net earnings from material purchases (last 6 months)</p>
                </div>
                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  90% Payout Rate
                </div>
              </div>

              <div className="h-64 w-full">
                {chartData && chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          fontSize: '12px'
                        }}
                        formatter={(value) => [`₹${value}`, 'Net Earnings']}
                      />
                      <Bar dataKey="earnings" fill="#f97b5b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                    <FiTrendingUp size={32} className="mb-2 opacity-40" />
                    <p className="text-xs">No sales data recorded yet. Upload materials to start earning!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions & Payout Card */}
            <div className="p-6 rounded-3xl border shadow-sm backdrop-blur-xl flex flex-col justify-between"
                 style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <FiShield className="text-emerald-600" /> Payout Destination
                </div>
                <div className="p-3.5 rounded-2xl border bg-gray-50/70 mb-4" style={{ borderColor: 'var(--border)' }}>
                  <div className="text-[11px] text-gray-500">Configured Payout UPI ID:</div>
                  <div className="font-mono text-sm font-bold text-gray-800 truncate mt-0.5">
                    {stats.upiId || user?.sellerProfile?.upiId || 'Not Configured'}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <FiLock size={10} /> 100% Private (never shown to buyers)
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-xs text-gray-600 py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                    <span>Available Balance</span>
                    <span className="font-bold text-gray-900">₹{stats.walletBalance || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                    <span>Pending Processing</span>
                    <span className="font-bold text-amber-600">₹{stats.pendingWithdrawals || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 py-1">
                    <span>Minimum Withdrawal</span>
                    <span className="font-semibold text-gray-700">₹50</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowPayoutModal(true)}
                disabled={(stats.walletBalance || 0) < 50}
                className="w-full py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                <FiDollarSign size={17} />
                <span>Request Payout (₹{stats.walletBalance || 0})</span>
              </button>
            </div>

          </div>

          {/* Recent Orders Snippet */}
          <div className="p-6 rounded-3xl border shadow-sm backdrop-blur-xl"
               style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 font-display">Recent Sales</h2>
                <p className="text-xs text-gray-500">Students who purchased your notes recently</p>
              </div>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-xs font-bold text-coral-600 hover:text-coral-700"
              >
                View all ({orders.length}) &rarr;
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                No orders yet. Once other students purchase your notes, their orders will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-gray-400 uppercase tracking-wider font-semibold"
                        style={{ borderColor: 'var(--border)' }}>
                      <th className="pb-3">Material</th>
                      <th className="pb-3">Buyer</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Price</th>
                      <th className="pb-3">Your Earning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {orders.slice(0, 5).map(order => (
                      <tr key={order._id} className="hover:bg-black/2 transition">
                        <td className="py-3 font-semibold text-gray-900 max-w-[200px] truncate">
                          {order.noteTitle || order.note?.title || 'Study Material'}
                        </td>
                        <td className="py-3 text-gray-600">
                          {order.buyerName || order.buyer?.name || 'Student'}
                        </td>
                        <td className="py-3 text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="py-3 font-bold text-gray-900">
                          ₹{order.amount}
                        </td>
                        <td className="py-3 font-bold text-emerald-600">
                          +₹{order.sellerEarning}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── TAB 2: MY MATERIALS ── */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Your Listed Materials ({notes.length})</h2>
            <Link
              to="/upload"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm"
              style={{ background: 'var(--accent)' }}
            >
              <FiPlus size={14} /> Add New Note
            </Link>
          </div>

          {notes.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border backdrop-blur-xl"
                 style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
              <FiBookOpen size={40} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-base font-bold text-gray-800">No study materials uploaded yet</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Upload your class notes, summaries, or previous year solved papers to start earning 90% per sale.
              </p>
              <Link
                to="/upload"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md"
                style={{ background: 'var(--accent)' }}
              >
                <FiUpload size={14} /> Upload Your First Note
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map(note => (
                <div
                  key={note._id}
                  className="p-4 rounded-3xl border shadow-sm backdrop-blur-xl flex flex-col justify-between hover:shadow-md transition"
                  style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}
                >
                  <div>
                    {/* Thumbnail / Header */}
                    <div className="relative h-36 sm:h-44 w-full rounded-2xl overflow-hidden bg-gray-900/5 mb-3 border"
                         style={{ borderColor: 'var(--border)' }}>
                      <div className="absolute inset-0">
                        <PDFThumbnail pdfUrl={note.pdfUrl} title={note.title} note={note} />
                      </div>
                      <div className="absolute top-2 right-2 z-10">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                          note.status === 'approved'
                            ? 'bg-emerald-500 text-white'
                            : note.status === 'rejected'
                            ? 'bg-red-500 text-white'
                            : 'bg-amber-400 text-gray-900'
                        }`}>
                          {note.status}
                        </span>
                      </div>
                      <div className="absolute bottom-2 left-2 z-10">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-white/95 text-gray-900 shadow-sm border border-black/5">
                          {note.price > 0 ? `₹${note.price}` : 'FREE'}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{note.title}</h4>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {note.subject} {note.course ? `• ${note.course}` : ''} {note.branch ? `• ${note.branch}` : ''}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 my-3 p-2 rounded-xl bg-black/2 border text-center"
                         style={{ borderColor: 'var(--border)' }}>
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase">Sales</div>
                        <div className="text-xs font-bold text-gray-800">{note.downloads || 0}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase">Earned</div>
                        <div className="text-xs font-bold text-emerald-600">₹{note.totalEarnings || 0}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase">Rating</div>
                        <div className="text-xs font-bold text-amber-500">★ {note.rating || 5.0}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <Link
                      to={`/note/${note._id}/preview`}
                      className="flex-1 text-center py-2 rounded-xl border text-xs font-semibold hover:bg-black/5 transition"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      View Listing
                    </Link>
                    {note.pdfUrl && (
                      <a
                        href={note.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-xl border text-xs font-semibold hover:bg-black/5 transition text-gray-600"
                        style={{ borderColor: 'var(--border)' }}
                        title="Download PDF"
                      >
                        <FiDownload size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: ORDERS & SALES ── */}
      {activeTab === 'orders' && (
        <div className="p-6 rounded-3xl border shadow-sm backdrop-blur-xl"
             style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Verified Sales & Order History</h2>
              <p className="text-xs text-gray-500">Full audit trail of student purchases with 10% platform fee breakdown</p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              No orders recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-gray-400 uppercase tracking-wider font-semibold"
                      style={{ borderColor: 'var(--border)' }}>
                    <th className="pb-3">Order ID</th>
                    <th className="pb-3">Material Title</th>
                    <th className="pb-3">Buyer Name</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Gross Price</th>
                    <th className="pb-3">Fee (10%)</th>
                    <th className="pb-3">Net Earning</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {orders.map(order => (
                    <tr key={order._id} className="hover:bg-black/2 transition">
                      <td className="py-3 font-mono text-[11px] text-gray-500">
                        {order.razorpayOrderId ? order.razorpayOrderId.slice(-10) : order._id.slice(-8)}
                      </td>
                      <td className="py-3 font-semibold text-gray-900 max-w-[200px] truncate">
                        {order.noteTitle || order.note?.title || 'Material'}
                      </td>
                      <td className="py-3 text-gray-700">
                        {order.buyerName || order.buyer?.name || 'Verified Student'}
                      </td>
                      <td className="py-3 text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 font-bold text-gray-900">
                        ₹{order.amount}
                      </td>
                      <td className="py-3 text-gray-400">
                        -₹{order.platformFee}
                      </td>
                      <td className="py-3 font-bold text-emerald-600">
                        +₹{order.sellerEarning}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {order.status || 'paid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: PAYOUTS & WITHDRAWALS ── */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          
          {/* Payout Overview Card */}
          <div className="p-6 rounded-3xl border shadow-sm backdrop-blur-xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center"
               style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Available Wallet Balance</span>
              <div className="text-3xl font-black text-gray-900 font-display mt-1">₹{stats.walletBalance || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Minimum withdrawal requirement is ₹50</p>
            </div>

            <div className="p-4 rounded-2xl border bg-gray-50" style={{ borderColor: 'var(--border)' }}>
              <div className="text-xs font-bold text-gray-700">Payout UPI ID (Private)</div>
              <div className="font-mono text-sm text-gray-900 font-semibold mt-1">
                {stats.upiId || user?.sellerProfile?.upiId || 'None registered'}
              </div>
              <div className="text-[10px] text-gray-400 mt-1">Funds are credited within 24-48 business hours.</div>
            </div>

            <div>
              <button
                onClick={() => setShowPayoutModal(true)}
                disabled={(stats.walletBalance || 0) < 50}
                className="w-full py-3.5 rounded-2xl font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                <FiDollarSign size={18} />
                <span>Request Payout Now</span>
              </button>
            </div>
          </div>

          {/* Past Withdrawals Table */}
          <div className="p-6 rounded-3xl border shadow-sm backdrop-blur-xl"
               style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
            <h2 className="text-base font-bold text-gray-900 mb-1 font-display">Withdrawal History</h2>
            <p className="text-xs text-gray-500 mb-4">Requests submitted to admin for manual or UPI settlement</p>

            {withdrawals.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs">
                No past withdrawals found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-gray-400 uppercase tracking-wider font-semibold"
                        style={{ borderColor: 'var(--border)' }}>
                      <th className="pb-3">Request Date</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Destination UPI</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Processed Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {withdrawals.map(w => (
                      <tr key={w._id} className="hover:bg-black/2 transition">
                        <td className="py-3 text-gray-700">
                          {new Date(w.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3 font-bold text-gray-900">
                          ₹{w.amount}
                        </td>
                        <td className="py-3 font-mono text-gray-600">
                          {w.upiId || 'Default UPI'}
                        </td>
                        <td className="py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            w.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : w.status === 'rejected'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {w.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-gray-400">
                          {w.processedAt ? new Date(w.processedAt).toLocaleDateString('en-IN') : 'Pending'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── PAYOUT MODAL ── */}
      <AnimatePresence>
        {showPayoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full p-6 rounded-3xl border shadow-2xl backdrop-blur-xl bg-white"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 font-display">Request Earnings Payout</h3>
                <button
                  onClick={() => setShowPayoutModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <FiXCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleRequestPayout} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Withdrawal Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="50"
                      max={stats.walletBalance || 0}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                      style={{ borderColor: 'var(--border-strong)' }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-gray-500 mt-1">
                    <span>Available: ₹{stats.walletBalance || 0}</span>
                    <button
                      type="button"
                      onClick={() => setPayoutAmount(String(stats.walletBalance || 0))}
                      className="text-coral-500 font-bold hover:underline"
                    >
                      Withdraw Max
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Payout UPI ID (VPA) *
                  </label>
                  <input
                    type="text"
                    required
                    value={payoutUpi}
                    onChange={(e) => setPayoutUpi(e.target.value)}
                    placeholder="e.g. mobile@paytm or yourname@oksbi"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-coral-400"
                    style={{ borderColor: 'var(--border-strong)' }}
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Double-check your UPI ID to prevent payment delays.
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <FiAlertCircle className="shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Withdrawals are processed manually via UPI by platform administrators within 24-48 business hours.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPayoutModal(false)}
                    className="px-4 py-2.5 rounded-xl border text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={payoutLoading}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}
                  >
                    {payoutLoading ? 'Submitting...' : 'Confirm Withdrawal'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
