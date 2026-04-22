import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser, FiMail, FiMapPin, FiUpload, FiDownload,
  FiDollarSign, FiStar, FiBook, FiEdit2, FiCheck,
  FiX, FiCamera, FiTrendingUp, FiShoppingBag, FiEye, FiHeart
} from 'react-icons/fi';
import API from '../utils/api';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <motion.div
    whileHover={{ y: -4, scale: 1.02 }}
    className="relative bg-white/5 border border-white/10 rounded-2xl p-5 overflow-hidden group"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 ${color}`} />
    <div className={`inline-flex p-2.5 rounded-xl mb-3 ${color} bg-opacity-20`}>
      <Icon className="text-white text-lg" />
    </div>
    <p className="text-2xl font-black text-white mb-0.5">{value}</p>
    <p className="text-xs text-gray-400">{label}</p>
    {sub && <p className="text-[11px] text-gray-600 mt-1">{sub}</p>}
  </motion.div>
);

// ─── Note Row ─────────────────────────────────────────────────────────────────
const NoteRow = ({ note, type }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-3 p-3 bg-white/4 hover:bg-white/8 rounded-xl border border-white/8 transition-all group"
  >
    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center flex-shrink-0">
      <FiBook className="text-violet-400 text-sm" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-white font-medium truncate">{note.title}</p>
      <p className="text-[11px] text-gray-500">{note.subject} {note.semester ? `• Sem ${note.semester}` : ''}</p>
    </div>
    {type === 'uploaded' && (
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-emerald-400 font-semibold">₹{note.totalEarnings || 0}</p>
        <p className="text-[11px] text-gray-600">{note.downloads || 0} downloads</p>
      </div>
    )}
    {type === 'purchased' && (
      <a
        href={`http://localhost:5000${note.pdfUrl}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600/30 hover:bg-violet-600/60 rounded-lg text-violet-300 text-xs transition flex-shrink-0"
      >
        <FiEye className="text-xs" /> View
      </a>
    )}
  </motion.div>
);

// ─── CSS Bar Chart ────────────────────────────────────────────────────────────
const CSSBarChart = ({ data, dataKey, color }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => Number(d[dataKey]) || 0), 1);

  return (
    <div className="flex items-end gap-2 h-48 mt-4">
      {data.map((item, i) => {
        const val = Number(item[dataKey]) || 0;
        const heightPct = (val / maxVal) * 100;
        return (
          <div key={i} className="relative flex-1 group h-full flex flex-col justify-end">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 pointer-events-none">
              {item.name}: {dataKey === 'earnings' ? `₹${val}` : val}
            </div>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${heightPct}%` }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="w-full rounded-t-sm transition-all group-hover:brightness-125"
              style={{ backgroundColor: color, minHeight: heightPct > 0 ? '4px' : '0' }}
            />
            <div className="text-center mt-2 text-[10px] text-gray-500 truncate">
              {item.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Profile Page ─────────────────────────────────────────────────────────────
export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', college: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [chartType, setChartType] = useState('earnings');
  const fileInputRef = useRef(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await API.get('/profile/me');
      setProfile(res.data.user);
      setEditForm({
        name: res.data.user.name || '',
        college: res.data.user.college || '',
        bio: res.data.user.bio || '',
      });
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('college', editForm.college);
      formData.append('bio', editForm.bio);
      if (imageFile) formData.append('profileImage', imageFile);

      const res = await API.put('/profile/update', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(prev => ({ ...prev, ...res.data.user }));
      setEditing(false);
      setImageFile(null);
    } catch (err) {
      alert('Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiTrendingUp },
    { id: 'uploads', label: `Uploaded (${profile?.uploadedNotes?.length || 0})`, icon: FiUpload },
    { id: 'purchased', label: `Purchased (${profile?.purchasedNotes?.length || 0})`, icon: FiShoppingBag },
    { id: 'wishlist', label: `Wishlist (${profile?.wishlist?.length || 0})`, icon: FiHeart },
    { id: 'wallet', label: 'Wallet', icon: FiDollarSign },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center text-gray-400">
        Failed to load profile. Please refresh.
      </div>
    );
  }

  const avatarSrc = imagePreview || (profile.profileImage ? `http://localhost:5000${profile.profileImage}` : null);
  const initials = profile.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-violet-800/12 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-fuchsia-800/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 py-8 sm:py-12">

        {/* ── Profile Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white/4 border border-white/10 rounded-3xl p-6 sm:p-8 mb-8 overflow-hidden"
        >
          {/* Background shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-900/20 via-transparent to-fuchsia-900/20 pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-violet-500/40 bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-white">{initials}</span>
                )}
              </div>
              {editing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center border-2 border-gray-950 hover:bg-violet-700 transition"
                >
                  <FiCamera className="text-xs text-white" />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-violet-500/60 transition"
                    placeholder="Your name"
                  />
                  <input
                    value={editForm.college}
                    onChange={e => setEditForm(f => ({ ...f, college: e.target.value }))}
                    className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-violet-500/60 transition"
                    placeholder="College / University"
                  />
                  <textarea
                    value={editForm.bio}
                    onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                    rows={2}
                    className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-violet-500/60 transition resize-none"
                    placeholder="Short bio..."
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-black text-white mb-1">{profile.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-2">
                    <span className="flex items-center gap-1"><FiMail className="text-xs" /> {profile.email}</span>
                    {profile.college && <span className="flex items-center gap-1"><FiMapPin className="text-xs" /> {profile.college}</span>}
                  </div>
                  {profile.bio && <p className="text-sm text-gray-500 max-w-md">{profile.bio}</p>}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="flex items-center gap-1 text-xs text-yellow-400 font-medium">
                      <FiStar className="fill-yellow-400" /> {profile.sellerRating?.toFixed(1) || '5.0'} Seller Rating
                    </span>
                    <span className="w-1 h-1 bg-gray-600 rounded-full" />
                    <span className="text-xs text-gray-500">{profile.totalSales || 0} Sales</span>
                  </div>
                </>
              )}
            </div>

            {/* Edit/Save buttons */}
            <div className="flex gap-2 flex-shrink-0">
              {editing ? (
                <>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveProfile} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50">
                    <FiCheck /> {saving ? 'Saving...' : 'Save'}
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditing(false); setImagePreview(null); setImageFile(null); }}
                    className="p-2 bg-white/8 hover:bg-white/15 rounded-xl text-gray-400 hover:text-white transition">
                    <FiX />
                  </motion.button>
                </>
              ) : (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/8 hover:bg-white/15 border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white transition">
                  <FiEdit2 className="text-xs" /> Edit Profile
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none">
          {tabs.map(tab => (
            <motion.button key={tab.id} whileTap={{ scale: 0.96 }}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200
                ${activeTab === tab.id ? 'bg-violet-600/30 border-violet-500/50 text-violet-300' : 'bg-white/4 border-white/10 text-gray-500 hover:text-gray-300'}`}>
              <tab.icon className="text-sm" /> {tab.label}
            </motion.button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>

            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={FiUpload} label="Notes Uploaded" value={profile.uploadedNotes?.length || 0} color="bg-violet-500" />
                  <StatCard icon={FiShoppingBag} label="Notes Purchased" value={profile.purchasedNotes?.length || 0} color="bg-blue-500" />
                  <StatCard icon={FiDollarSign} label="Total Earnings" value={`₹${profile.totalEarnings || 0}`} color="bg-emerald-500" sub="After 10% platform fee" />
                  <StatCard icon={FiDownload} label="Total Sales" value={profile.totalSales || 0} color="bg-fuchsia-500" />
                </div>

                {/* Earnings Chart */}
                {profile.chartData?.length > 0 && (
                  <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-white text-base">Performance (Last 6 months)</h3>
                      <div className="flex gap-2">
                        {['earnings', 'sales'].map(t => (
                          <button key={t} onClick={() => setChartType(t)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${chartType === t ? 'bg-violet-600 text-white' : 'bg-white/8 text-gray-400 hover:text-white'}`}>
                            {t === 'earnings' ? '₹ Earnings' : '📥 Sales'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <CSSBarChart
                      data={profile.chartData}
                      dataKey={chartType}
                      color={chartType === 'earnings' ? '#8b5cf6' : '#ec4899'}
                    />
                  </div>
                )}

                {/* Recent uploads preview */}
                {profile.uploadedNotes?.length > 0 && (
                  <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-white text-sm">Recent Uploads</h3>
                      <button onClick={() => setActiveTab('uploads')} className="text-xs text-violet-400 hover:text-violet-300 transition">View all →</button>
                    </div>
                    <div className="space-y-2">
                      {profile.uploadedNotes.slice(0, 3).map(note => (
                        <NoteRow key={note._id} note={note} type="uploaded" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* UPLOADED NOTES */}
            {activeTab === 'uploads' && (
              <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
                <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
                  <FiUpload className="text-violet-400" /> Your Uploaded Notes
                </h3>
                {profile.uploadedNotes?.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-3">📤</div>
                    <p className="text-gray-400">No notes uploaded yet</p>
                    <p className="text-gray-600 text-sm mt-1">Start selling by uploading your first note</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {profile.uploadedNotes.map(note => <NoteRow key={note._id} note={note} type="uploaded" />)}
                  </div>
                )}
              </div>
            )}

            {/* PURCHASED NOTES */}
            {activeTab === 'purchased' && (
              <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
                <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
                  <FiShoppingBag className="text-blue-400" /> Purchased Notes
                </h3>
                {profile.purchasedNotes?.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-3">🛒</div>
                    <p className="text-gray-400">No purchases yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {profile.purchasedNotes.map(note => <NoteRow key={note._id} note={note} type="purchased" />)}
                  </div>
                )}
              </div>
            )}

            {/* WISHLIST */}
            {activeTab === 'wishlist' && (
              <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
                <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
                  <FiHeart className="text-pink-400 fill-pink-400" /> Saved Notes
                </h3>
                {profile.wishlist?.length === 0 ? (
                   <div className="text-center py-16">
                     <div className="text-5xl mb-3">❤️</div>
                     <p className="text-gray-400">Wishlist empty</p>
                   </div>
                ) : (
                  <div className="space-y-2">
                     {profile.wishlist?.map(note => <NoteRow key={note._id} note={note} type="purchased" />)}
                  </div>
                )}
              </div>
            )}

            {/* WALLET */}
            {activeTab === 'wallet' && <WalletTab profile={profile} onRefresh={fetchProfile} />}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Wallet Tab ───────────────────────────────────────────────────────────────
function WalletTab({ profile, onRefresh }) {
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', upiId: '' });
  const [withdrawing, setWithdrawing] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(true);

  useEffect(() => { fetchWallet(); }, []);

  const fetchWallet = async () => {
    try {
      const res = await API.get('/profile/wallet');
      setWallet(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawForm.amount || !withdrawForm.upiId) return alert('Fill all fields');
    if (Number(withdrawForm.amount) < 50) return alert('Minimum withdrawal is ₹50');
    setWithdrawing(true);
    try {
      const res = await API.post('/payment/withdraw', {
        amount: Number(withdrawForm.amount),
        upiId: withdrawForm.upiId,
      });
      alert(res.data.message);
      setWithdrawForm({ amount: '', upiId: '' });
      fetchWallet();
      onRefresh();
    } catch (err) {
      alert(err.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loadingWallet) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Available Balance', value: `₹${wallet?.balance || 0}`, color: 'from-violet-600 to-fuchsia-600', big: true },
          { label: 'Total Earned', value: `₹${wallet?.totalEarnings || 0}`, color: 'from-emerald-600 to-teal-600' },
          { label: 'Total Sales', value: wallet?.totalSales || 0, color: 'from-blue-600 to-indigo-600' },
        ].map(({ label, value, color, big }) => (
          <div key={label} className={`relative bg-gradient-to-br ${color} rounded-2xl p-5 overflow-hidden`}>
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative">
              <p className="text-white/70 text-xs mb-1">{label}</p>
              <p className={`font-black text-white ${big ? 'text-3xl' : 'text-2xl'}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Withdraw */}
      <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
        <h3 className="font-bold text-white text-sm mb-4">💸 Withdraw Earnings</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            value={withdrawForm.amount}
            onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="Amount (min ₹50)"
            className="flex-1 bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-violet-500/60 transition placeholder-gray-600"
          />
          <input
            type="text"
            value={withdrawForm.upiId}
            onChange={e => setWithdrawForm(f => ({ ...f, upiId: e.target.value }))}
            placeholder="UPI ID (e.g. user@upi)"
            className="flex-1 bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-violet-500/60 transition placeholder-gray-600"
          />
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleWithdraw}
            disabled={withdrawing || !wallet?.balance}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40 whitespace-nowrap"
          >
            {withdrawing ? 'Processing...' : 'Withdraw'}
          </motion.button>
        </div>
        <p className="text-xs text-gray-600 mt-2">Platform takes 10% fee on each sale. Withdrawals processed in 2-3 business days.</p>
      </div>

      {/* Transaction history */}
      <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
        <h3 className="font-bold text-white text-sm mb-4">📋 Transaction History</h3>
        {!wallet?.transactions?.length ? (
          <p className="text-gray-500 text-sm text-center py-8">No transactions yet</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-none">
            {wallet.transactions.map((tx, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/4 rounded-xl">
                <div>
                  <p className="text-sm text-white">{tx.description}</p>
                  <p className="text-[11px] text-gray-600">{new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
                <span className={`text-sm font-bold ${tx.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}