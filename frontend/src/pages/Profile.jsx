import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiUser, FiMail, FiMapPin, FiUpload, FiDownload,
  FiDollarSign, FiBook, FiEdit2, FiCheck,
  FiCamera, FiTrendingUp, FiShoppingBag, FiEye, FiHeart,
  FiMessageSquare, FiUserPlus, FiFlag, FiLinkedin, FiInstagram, FiMessageCircle, FiAward
} from 'react-icons/fi';
import API, { API_BASE_URL } from '../utils/api';

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
        href={`${API_BASE_URL}${note.pdfUrl.startsWith('/') ? '' : '/'}${note.pdfUrl}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600/30 hover:bg-violet-600/60 rounded-lg text-violet-300 text-xs transition flex-shrink-0"
      >
        <FiEye className="text-xs" /> View
      </a>
    )}
  </motion.div>
);

// ─── Timeline Row ────────────────────────────────────────────────────────────
const TimelineRow = ({ title, time }) => (
  <div className="flex gap-4 relative">
    <div className="flex flex-col items-center">
      <div className="w-3 h-3 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]" />
      <div className="w-0.5 h-full bg-white/10 my-1" />
    </div>
    <div className="pb-6">
      <p className="text-sm text-white font-medium">{title}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{time}</p>
    </div>
  </div>
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  
  const isOwnProfile = !id || id === authUser?._id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', college: '', bio: '', phoneNumber: '', expertise: '', stream: '', headerImage: '',
    socialLinks: { whatsapp: '', telegram: '', email: '', instagram: '', github: '', linkedin: '' }
  });
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [chartType, setChartType] = useState('earnings');
  const [avatarError, setAvatarError] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    try {
      const endpoint = isOwnProfile ? '/profile/me' : `/profile/${id}`;
      const res = await API.get(endpoint);
      const u = res.data.user;
      setProfile(u);
      setEditForm({
        name: u.name || '',
        college: u.college || '',
        bio: u.bio || '',
        phoneNumber: u.phoneNumber || '',
        expertise: u.expertise || '',
        stream: u.stream || '',
        headerImage: u.headerImage || '',
        socialLinks: {
          whatsapp: u.socialLinks?.whatsapp || '',
          telegram: u.socialLinks?.telegram || '',
          email: u.socialLinks?.email || '',
          instagram: u.socialLinks?.instagram || '',
          github: u.socialLinks?.github || '',
          linkedin: u.socialLinks?.linkedin || '',
        }
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
      formData.append('phoneNumber', editForm.phoneNumber);
      formData.append('expertise', editForm.expertise);
      formData.append('stream', editForm.stream);
      formData.append('headerImage', editForm.headerImage);
      formData.append('socialLinks', JSON.stringify(editForm.socialLinks));

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

  const allTabs = [
    { id: 'overview', label: 'Overview', icon: FiTrendingUp },
    { id: 'uploads', label: `Uploaded (${profile?.uploadedNotes?.length || 0})`, icon: FiUpload },
    { id: 'purchased', label: `Purchased (${profile?.purchasedNotes?.length || 0})`, icon: FiShoppingBag },
    { id: 'wishlist', label: `Wishlist (${profile?.wishlist?.length || 0})`, icon: FiHeart },
    { id: 'activity', label: 'Activity', icon: FiAward },
    { id: 'wallet', label: 'Wallet', icon: FiDollarSign },
  ];
  
  const tabs = isOwnProfile 
    ? allTabs 
    : allTabs.filter(t => !['purchased', 'wishlist', 'wallet'].includes(t.id));

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

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url.replace(/\\/g, '/')}`;
  };
  const avatarSrc = imagePreview || getImageUrl(profile.profileImage) || profile.avatar;
  const initials = profile.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  // Computed completion
  const requiredFields = ['name', 'college', 'bio', 'phoneNumber', 'expertise', 'stream'];
  const completedFields = requiredFields.filter(f => editForm[f] && editForm[f].trim() !== '').length + (avatarSrc && !avatarError ? 1 : 0) + (editForm.socialLinks.whatsapp || editForm.socialLinks.instagram ? 1 : 0);
  const totalFields = requiredFields.length + 2;
  const completionPct = Math.round((completedFields / totalFields) * 100);

  const missingFields = [];
  if (!editForm.phoneNumber) missingFields.push('Phone number');
  if (!editForm.socialLinks.whatsapp && !editForm.socialLinks.instagram && !editForm.socialLinks.linkedin) missingFields.push('Social links');
  if (!editForm.expertise) missingFields.push('Expertise');
  if (!editForm.stream) missingFields.push('Stream');

  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-violet-800/12 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-fuchsia-800/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
        
        {/* Profile Completion Bar */}
        {isOwnProfile && completionPct < 100 && !editing && (
          <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1 w-full">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold text-white">Profile Completion</span>
                <span className="text-xs text-violet-400 font-bold">{completionPct}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${completionPct}%` }} />
              </div>
            </div>
            <div className="text-xs text-gray-400">
              <span className="text-gray-300">Missing:</span> {missingFields.join(', ')}
            </div>
            <button onClick={() => setEditing(true)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition text-nowrap">
              Complete Profile
            </button>
          </div>
        )}

        {/* ── Profile Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white/4 border border-white/10 rounded-3xl mb-8 overflow-hidden"
        >
          {/* Header Cover Image/Gradient */}
          <div className="h-40 sm:h-56 w-full relative">
            {profile.headerImage ? (
               <img src={profile.headerImage} alt="Cover" className="w-full h-full object-cover" />
            ) : (
               <div className="w-full h-full bg-gradient-to-r from-violet-900/60 via-purple-900/60 to-fuchsia-900/60" />
            )}
            {editing && (
               <div className="absolute top-4 right-4">
                 <input 
                   placeholder="Cover Image URL (Optional)"
                   value={editForm.headerImage}
                   onChange={(e) => setEditForm({...editForm, headerImage: e.target.value})}
                   className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 outline-none backdrop-blur-md"
                 />
               </div>
            )}
          </div>

          <div className="px-6 sm:px-8 pb-8 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 -mt-16 sm:-mt-20 mb-4">
              
              {/* Avatar & Badges */}
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-[#07070f] bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-xl">
                    {avatarSrc && !avatarError ? (
                      <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
                    ) : (
                      <span className="text-5xl font-black text-white">{initials}</span>
                    )}
                  </div>
                  {editing && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center border-4 border-[#07070f] hover:bg-violet-700 transition shadow-lg"
                    >
                      <FiCamera className="text-sm text-white" />
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
                {!editing && !isOwnProfile && (
                  <>
                    <button onClick={() => navigate('/chat', { state: { startChatWith: profile } })} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition text-gray-300">
                      <FiMessageSquare /> Message Seller
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-medium transition text-white shadow-lg shadow-violet-500/20">
                      <FiUserPlus /> Follow
                    </button>
                    <button className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition tooltip-trigger relative group">
                      <FiFlag />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">Report</span>
                    </button>
                  </>
                )}
                {isOwnProfile && (
                  editing ? (
                    <>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveProfile} disabled={saving}
                        className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-bold text-white transition disabled:opacity-50">
                        <FiCheck /> {saving ? 'Saving...' : 'Save Profile'}
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditing(false); fetchProfile(); }}
                        className="px-4 py-2.5 bg-white/8 hover:bg-white/15 rounded-xl text-sm text-gray-300 transition">
                        Cancel
                      </motion.button>
                    </>
                  ) : (
                    <button onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white/8 hover:bg-white/15 border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white transition">
                      <FiEdit2 className="text-xs" /> Edit Profile
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Info Section */}
            <div className="max-w-3xl">
              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-violet-500/60 transition" placeholder="Full Name" />
                  <input value={editForm.college} onChange={e => setEditForm({...editForm, college: e.target.value})} className="bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-violet-500/60 transition" placeholder="College / University" />
                  <input value={editForm.stream} onChange={e => setEditForm({...editForm, stream: e.target.value})} className="bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-violet-500/60 transition" placeholder="Stream / Class (e.g., JEE Aspirant, B.Tech CS)" />
                  <input value={editForm.expertise} onChange={e => setEditForm({...editForm, expertise: e.target.value})} className="bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-violet-500/60 transition" placeholder="Expertise (e.g., Physics, Data Structures)" />
                  <input value={editForm.phoneNumber} onChange={e => setEditForm({...editForm, phoneNumber: e.target.value})} className="bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-violet-500/60 transition" placeholder="Phone Number (Private)" />
                  <textarea value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} rows={1} className="sm:col-span-2 bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-violet-500/60 transition resize-none" placeholder="Short bio about yourself..." />
                  
                  {/* Social Links Form */}
                  <div className="sm:col-span-2 mt-2"><p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Social Links</p></div>
                  <input value={editForm.socialLinks.whatsapp} onChange={e => setEditForm({...editForm, socialLinks: {...editForm.socialLinks, whatsapp: e.target.value}})} className="bg-white/8 border border-white/15 rounded-xl px-4 py-2 text-white text-sm outline-none" placeholder="WhatsApp Number" />
                  <input value={editForm.socialLinks.telegram} onChange={e => setEditForm({...editForm, socialLinks: {...editForm.socialLinks, telegram: e.target.value}})} className="bg-white/8 border border-white/15 rounded-xl px-4 py-2 text-white text-sm outline-none" placeholder="Telegram Username" />
                  <input value={editForm.socialLinks.linkedin} onChange={e => setEditForm({...editForm, socialLinks: {...editForm.socialLinks, linkedin: e.target.value}})} className="bg-white/8 border border-white/15 rounded-xl px-4 py-2 text-white text-sm outline-none" placeholder="LinkedIn URL" />
                  <input value={editForm.socialLinks.instagram} onChange={e => setEditForm({...editForm, socialLinks: {...editForm.socialLinks, instagram: e.target.value}})} className="bg-white/8 border border-white/15 rounded-xl px-4 py-2 text-white text-sm outline-none" placeholder="Instagram Username" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-3xl font-black text-white">{profile.name}</h1>
                    {profile.isVerified && <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold"><FiCheck /> Verified</span>}
                    {profile.totalSales > 10 && <span className="bg-gradient-to-r from-orange-400 to-yellow-500 text-black text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">⭐ Top Seller</span>}
                    {(profile.uploadedNotes?.length || 0) > 5 && <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">📚 Active</span>}
                    <span className="bg-fuchsia-600/50 border border-fuchsia-500/30 text-fuchsia-100 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">🎓 Student</span>
                  </div>
                  
                  {profile.stream && <p className="text-violet-400 text-sm font-semibold mb-2">{profile.stream}</p>}
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-3">
                    {profile.college && <span className="flex items-center gap-1"><FiMapPin className="text-xs" /> {profile.college}</span>}
                    <span className="flex items-center gap-1"><FiMail className="text-xs" /> {profile.email}</span>
                  </div>
                  
                  {profile.bio && <p className="text-sm text-gray-300 leading-relaxed mb-4 max-w-2xl">{profile.bio}</p>}
                  
                  {profile.expertise && (
                    <div className="flex flex-wrap items-center gap-2 mb-5">
                      <span className="text-xs text-gray-500 font-medium">Expert in:</span>
                      {profile.expertise.split(',').map((item, idx) => (
                        <span key={idx} className="bg-white/10 text-gray-300 text-[11px] px-2.5 py-1 rounded-md border border-white/5">{item.trim()}</span>
                      ))}
                    </div>
                  )}

                  {/* Social Buttons */}
                  <div className="flex gap-2">
                    {profile.socialLinks?.whatsapp && (
                      <a href={`https://wa.me/${profile.socialLinks.whatsapp}`} target="_blank" rel="noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366] hover:text-white transition tooltip-trigger relative group">
                        <FiMessageCircle size={18} />
                      </a>
                    )}
                    {profile.socialLinks?.telegram && (
                      <a href={`https://t.me/${profile.socialLinks.telegram}`} target="_blank" rel="noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0088cc]/20 text-[#0088cc] hover:bg-[#0088cc] hover:text-white transition">
                        <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/></svg>
                      </a>
                    )}
                    {profile.socialLinks?.linkedin && (
                      <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0077b5]/20 text-[#0077b5] hover:bg-[#0077b5] hover:text-white transition">
                        <FiLinkedin size={18} />
                      </a>
                    )}
                    {profile.socialLinks?.instagram && (
                      <a href={`https://instagram.com/${profile.socialLinks.instagram}`} target="_blank" rel="noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] bg-opacity-20 text-pink-400 hover:text-white transition border border-pink-500/20 hover:border-transparent">
                        <FiInstagram size={18} />
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none border-b border-white/5">
          {tabs.map(tab => (
            <motion.button key={tab.id} whileTap={{ scale: 0.96 }}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200
                ${activeTab === tab.id ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-white/20'}`}>
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
                {/* Micro Stats (Mocked for trust) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                   <div className="bg-white/5 rounded-xl p-4 flex items-center gap-4 border border-white/5">
                     <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"><FiMessageSquare className="text-blue-400" /></div>
                     <div><p className="text-xs text-gray-400">Response Time</p><p className="text-lg font-bold text-white">&lt; 2 hours</p></div>
                   </div>
                   <div className="bg-white/5 rounded-xl p-4 flex items-center gap-4 border border-white/5">
                     <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center"><FiCheck className="text-emerald-400" /></div>
                     <div><p className="text-xs text-gray-400">Completion Rate</p><p className="text-lg font-bold text-white">100%</p></div>
                   </div>
                   <div className="bg-white/5 rounded-xl p-4 flex items-center gap-4 border border-white/5">
                     <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 flex items-center justify-center"><FiUser className="text-fuchsia-400" /></div>
                     <div><p className="text-xs text-gray-400">Return Customers</p><p className="text-lg font-bold text-white">5+</p></div>
                   </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={FiUpload} label="Notes Uploaded" value={profile.uploadedNotes?.length || 0} color="bg-violet-500" />
                  <StatCard icon={FiShoppingBag} label="Notes Purchased" value={profile.purchasedNotes?.length || 0} color="bg-blue-500" />
                  <StatCard icon={FiDollarSign} label="Total Earnings" value={`₹${profile.totalEarnings || 0}`} color="bg-emerald-500" sub="After 10% fee" />
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

            {/* ACTIVITY TIMELINE */}
            {activeTab === 'activity' && (
               <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
                 <h3 className="font-bold text-white text-base mb-6 flex items-center gap-2">
                   <FiAward className="text-yellow-400" /> Recent Activity & Achievements
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* Timeline */}
                   <div>
                     <h4 className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">Timeline</h4>
                     <div className="space-y-0 relative">
                       <TimelineRow title="Joined Notes Marketplace" time={new Date(profile.createdAt).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})} />
                       {profile.uploadedNotes?.slice(0, 3).map((n, i) => (
                         <TimelineRow key={i} title={`Uploaded "${n.title}"`} time="Recently" />
                       ))}
                       {profile.totalSales > 0 && <TimelineRow title={`Reached ${profile.totalSales} sales!`} time="Recently" />}
                     </div>
                   </div>
                   {/* Achievements */}
                   <div>
                     <h4 className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">Achievements</h4>
                     <div className="grid grid-cols-2 gap-3">
                       <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                         <div className="text-3xl mb-2">🏆</div>
                         <p className="text-xs text-white font-semibold">Top Rated</p>
                         <p className="text-[10px] text-gray-500 mt-1">Maintained 4.5+ stars</p>
                       </div>
                       <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                         <div className="text-3xl mb-2">🔥</div>
                         <p className="text-xs text-white font-semibold">Trending</p>
                         <p className="text-[10px] text-gray-500 mt-1">High recent activity</p>
                       </div>
                       <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                         <div className="text-3xl mb-2">💯</div>
                         <p className="text-xs text-white font-semibold">100% Positive</p>
                         <p className="text-[10px] text-gray-500 mt-1">Great feedback</p>
                       </div>
                       <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                         <div className="text-3xl mb-2">📈</div>
                         <p className="text-xs text-white font-semibold">{profile.totalSales || 0}+ Downloads</p>
                         <p className="text-[10px] text-gray-500 mt-1">Community impact</p>
                       </div>
                     </div>
                   </div>
                 </div>
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