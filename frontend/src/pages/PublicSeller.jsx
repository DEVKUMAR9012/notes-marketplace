import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import BuyModal from '../components/BuyModal';
import PDFThumbnail from '../components/PDFThumbnail';
import {
  FiCheckCircle,
  FiBookOpen,
  FiDownload,
  FiStar,
  FiUserPlus,
  FiUserCheck,
  FiShield,
  FiEye,
  FiShoppingBag,
  FiShare2,
  FiArrowLeft
} from 'react-icons/fi';

export default function PublicSeller() {
  const { id } = useParams();
  const { user: currentUser, isGuest } = useAuth();

  const [seller, setSeller] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Buy Modal State
  const [selectedNoteForBuy, setSelectedNoteForBuy] = useState(null);

  const fetchSellerProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get(`/profile/${id}`);
      if (res.data?.user) {
        setSeller(res.data.user);
        setNotes(res.data.user.uploadedNotes || []);
        if (currentUser && res.data.user.followers) {
          setIsFollowing(res.data.user.followers.includes(currentUser._id));
        }
      }
    } catch (err) {
      console.error('Fetch public seller error:', err);
      toast.error(err.message || 'Could not load seller profile');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser]);

  useEffect(() => {
    fetchSellerProfile();
  }, [fetchSellerProfile]);

  const handleToggleFollow = async () => {
    if (isGuest || !currentUser) {
      return toast.error('Please log in to follow creators');
    }
    if (currentUser._id === id) {
      return toast('This is your own profile!');
    }

    setFollowLoading(true);
    try {
      const res = await API.post('/profile/follow', { targetUserId: id });
      if (res.data?.message) {
        setIsFollowing(res.data.message === 'Followed');
        toast.success(res.data.message === 'Followed' ? `Followed ${seller.name}!` : `Unfollowed ${seller.name}`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${seller?.name} on Notes Marketplace`,
        text: `Check out study materials and notes by ${seller?.name} on Notes Marketplace!`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Seller profile link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-coral-500/30 border-t-coral-500 rounded-full animate-spin" />
        <span className="text-xs text-gray-500">Loading creator profile...</span>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-800">Creator Not Found</h2>
        <p className="text-sm text-gray-500 mt-2 mb-6">This seller profile may have been removed or does not exist.</p>
        <Link
          to="/explorer"
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md"
          style={{ background: 'var(--accent)' }}
        >
          Explore All Materials
        </Link>
      </div>
    );
  }

  const totalDownloads = notes.reduce((sum, n) => sum + (n.downloads || 0), 0);
  const averageRating = notes.length > 0
    ? (notes.reduce((sum, n) => sum + (n.rating || 5.0), 0) / notes.length).toFixed(1)
    : '5.0';

  const isOwnProfile = currentUser && currentUser._id === id;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      
      {/* Back button */}
      <div className="mb-6">
        <Link
          to="/explorer"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
        >
          <FiArrowLeft /> Back to Explorer
        </Link>
      </div>

      {/* Seller Hero Card */}
      <div className="rounded-3xl border shadow-xl backdrop-blur-xl p-6 sm:p-8 mb-8 relative overflow-hidden"
           style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
        
        {/* Decorative background shape */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-30"
             style={{ background: 'var(--accent)' }} />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative">
              {seller.profileImage || seller.avatar ? (
                <img
                  src={seller.profileImage || seller.avatar}
                  alt={seller.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-2 shadow-md"
                  style={{ borderColor: 'var(--border-strong)' }}
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center font-black text-2xl sm:text-3xl text-white shadow-md"
                     style={{ background: 'var(--accent)' }}>
                  {seller.name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                   title="Verified Seller">
                <FiCheckCircle size={14} />
              </div>
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 font-display">
                  {seller.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <FiCheckCircle className="text-emerald-600" /> Verified Creator
                </span>
              </div>

              <div className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">
                {seller.sellerProfile?.course || seller.stream || 'Student'} 
                {seller.sellerProfile?.branch ? ` • ${seller.sellerProfile.branch}` : ''}
                {seller.collegeName || seller.college ? ` • ${seller.collegeName || seller.college}` : ''}
              </div>

              {seller.bio && (
                <p className="text-xs text-gray-600 mt-2 max-w-xl italic line-clamp-2">
                  "{seller.bio}"
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            {isOwnProfile ? (
              <Link
                to="/seller/dashboard"
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md text-center"
                style={{ background: 'var(--accent)' }}
              >
                Go to My Seller Dashboard
              </Link>
            ) : (
              <button
                onClick={handleToggleFollow}
                disabled={followLoading}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  isFollowing
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'text-white shadow-md hover:shadow-lg'
                }`}
                style={!isFollowing ? { background: 'var(--accent)' } : {}}
              >
                {isFollowing ? (
                  <>
                    <FiUserCheck size={15} />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <FiUserPlus size={15} />
                    <span>Follow Creator</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleShare}
              title="Share Profile"
              className="p-2.5 rounded-xl border hover:bg-black/5 text-gray-600 transition"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <FiShare2 size={16} />
            </button>
          </div>

        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase font-semibold">Materials</div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 font-display mt-0.5">{notes.length}</div>
          </div>
          <div className="text-center border-x" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xs text-gray-400 uppercase font-semibold">Downloads</div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 font-display mt-0.5">{totalDownloads}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase font-semibold">Rating</div>
            <div className="text-lg sm:text-xl font-bold text-amber-500 font-display mt-0.5">★ {averageRating}</div>
          </div>
        </div>

      </div>

      {/* Safety & Academic Guarantee Notice */}
      <div className="p-4 rounded-2xl border bg-emerald-50/60 border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2.5">
          <FiShield className="text-emerald-700 text-base shrink-0" />
          <span>
            <strong>Verified Academic Content:</strong> Materials uploaded by this student creator are reviewed for quality, clarity, and syllabus alignment.
          </span>
        </div>
      </div>

      {/* Materials Section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 font-display">
            Study Materials by {seller.name} ({notes.length})
          </h2>
        </div>

        {notes.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border backdrop-blur-xl"
               style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
            <FiBookOpen size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-600 font-medium">This creator hasn't published any public notes yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {notes.map(note => (
              <div
                key={note._id}
                className="rounded-3xl border shadow-sm backdrop-blur-xl overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}
              >
                <div>
                  {/* Thumbnail / Header */}
                  <div className="relative h-44 sm:h-52 w-full bg-gray-900/5 overflow-hidden border-b"
                       style={{ borderColor: 'var(--border)' }}>
                    <div className="absolute inset-0">
                      <PDFThumbnail pdfUrl={note.pdfUrl} title={note.title} note={note} />
                    </div>

                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-white/95 text-gray-900 shadow-md border border-black/5">
                        {note.price > 0 ? `₹${note.price}` : 'FREE'}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">
                      {note.title}
                    </h3>
                    <div className="text-xs text-gray-500 mb-3">
                      {note.subject} {note.course ? `• ${note.course}` : ''} {note.branch ? `• ${note.branch}` : ''}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 py-1.5 px-2.5 rounded-xl bg-black/2 border"
                         style={{ borderColor: 'var(--border)' }}>
                      <span>★ {note.rating || 5.0} rating</span>
                      <span>{note.downloads || 0} downloads</span>
                    </div>
                  </div>
                </div>

                {/* Card CTA */}
                <div className="p-4 pt-0 flex items-center gap-2">
                  <Link
                    to={`/note/${note._id}/preview`}
                    className="flex-1 text-center py-2.5 rounded-xl border text-xs font-semibold hover:bg-black/5 transition"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    View Details
                  </Link>

                  {note.price > 0 ? (
                    <button
                      onClick={() => setSelectedNoteForBuy(note)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:shadow-md transition flex items-center gap-1.5"
                      style={{ background: 'var(--accent)' }}
                    >
                      <FiShoppingBag size={14} />
                      <span>Buy ₹{note.price}</span>
                    </button>
                  ) : (
                    note.pdfUrl && (
                      <a
                        href={note.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition flex items-center gap-1"
                      >
                        <FiDownload size={14} />
                        <span>Free</span>
                      </a>
                    )
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buy Modal Integration */}
      {selectedNoteForBuy && (
        <BuyModal
          note={selectedNoteForBuy}
          onClose={() => setSelectedNoteForBuy(null)}
          onSuccess={() => {
            toast.success(`Purchased ${selectedNoteForBuy.title}!`);
            setSelectedNoteForBuy(null);
          }}
        />
      )}

    </div>
  );
}
