import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, FiBookOpen, FiCompass, FiMail, 
  FiCalendar, FiAlertTriangle, FiCheckCircle,
  FiPlus, FiMinus, FiStar, FiLinkedin, FiGithub, FiTwitter
} from 'react-icons/fi';
import API from '../../../utils/api';

export default function ProfileSidebar({ show, onClose, userId, currentUser }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [reportReason, setReportReason] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch public profile on mount / userId change
  useEffect(() => {
    if (!show || !userId) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/profile/${userId}`);
        setProfile(res.data.user);
        
        // Reconcile following state
        const isFollowing = res.data.user?.followers?.some(
          id => String(id) === String(currentUser?._id)
        );
        setFollowing(!!isFollowing);
        setFollowersCount(res.data.user?.followers?.length || 0);
        setShowReportForm(false);
        setReportReason('');
        setSuccessMsg('');
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [show, userId, currentUser?._id]);

  const handleFollowToggle = async () => {
    if (!profile) return;
    try {
      // Optimistic Update
      const oldFollowing = following;
      setFollowing(!oldFollowing);
      setFollowersCount(prev => oldFollowing ? prev - 1 : prev + 1);

      await API.post('/profile/follow/toggle', { targetUserId: profile._id });
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      // Revert state on error
      setFollowing(following);
      setFollowersCount(followersCount);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportReason.trim() || !profile) return;
    try {
      setReporting(true);
      await API.post(`/profile/${profile._id}/report`, { reason: reportReason });
      setSuccessMsg('Report submitted successfully.');
      setReportReason('');
      setTimeout(() => {
        setShowReportForm(false);
        setSuccessMsg('');
      }, 2000);
    } catch (err) {
      console.error('Failed to report user:', err);
    } finally {
      setReporting(false);
    }
  };

  if (!show) return null;

  // Format joined date
  const joinedDate = profile?.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })
    : 'N/A';

  return (
    <AnimatePresence>
      <div className="profile-sidebar-overlay" onClick={onClose}>
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="profile-sidebar-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="profile-sidebar-header">
            <h3>User Information</h3>
            <button className="close-profile-btn" onClick={onClose} aria-label="Close profile">
              <FiX size={18} />
            </button>
          </div>

          {loading ? (
            <div className="profile-sidebar-loader-capsule">
              <div className="profile-loader-spinner" />
              <p>Fetching profile details...</p>
            </div>
          ) : !profile ? (
            <div className="profile-sidebar-error">
              <p>Could not load user profile details.</p>
            </div>
          ) : (
            <div className="profile-sidebar-body">
              {/* Profile Card Summary */}
              <div className="profile-summary-section">
                <div className="profile-summary-avatar-wrapper">
                  {profile.profileImage ? (
                    <img src={profile.profileImage} alt={profile.name} className="profile-large-avatar" />
                  ) : (
                    <div className="profile-large-avatar-fallback">
                      {profile.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  {profile.isOnline && <div className="profile-online-badge" />}
                </div>

                <h4 className="profile-summary-name">
                  {profile.name}
                  {profile.totalSales > 0 && (
                    <FiCheckCircle className="profile-verified-badge" title="Verified Seller" />
                  )}
                </h4>
                <p className="profile-summary-email"><FiMail size={12} /> {profile.email}</p>
                <p className="profile-summary-joined"><FiCalendar size={12} /> Member since {joinedDate}</p>

                {/* Follow Button */}
                {String(currentUser?._id) !== String(profile._id) && (
                  <button 
                    onClick={handleFollowToggle}
                    className={`profile-follow-btn ${following ? 'following' : ''}`}
                  >
                    {following ? <><FiMinus /> Unfollow</> : <><FiPlus /> Follow</>}
                  </button>
                )}
              </div>

              {/* Stats Grid */}
              <div className="profile-stats-grid">
                <div className="profile-stat-box">
                  <span className="stat-value">{followersCount}</span>
                  <span className="stat-label">Followers</span>
                </div>
                <div className="profile-stat-box">
                  <span className="stat-value">{profile.following?.length || 0}</span>
                  <span className="stat-label">Following</span>
                </div>
                <div className="profile-stat-box">
                  <span className="stat-value flex items-center justify-center gap-1">
                    {profile.rating ? profile.rating.toFixed(1) : 'N/A'} <FiStar size={12} className="text-amber-400 fill-amber-400" />
                  </span>
                  <span className="stat-label">Rating</span>
                </div>
                <div className="profile-stat-box">
                  <span className="stat-value">{profile.uploadedNotes?.length || 0}</span>
                  <span className="stat-label">Uploads</span>
                </div>
              </div>

              {/* Profile Details List */}
              <div className="profile-details-list">
                {profile.bio && (
                  <div className="profile-detail-item">
                    <h5>Bio</h5>
                    <p className="bio-text">{profile.bio}</p>
                  </div>
                )}

                <div className="profile-detail-item">
                  <h5>College / University</h5>
                  <p>{profile.college || 'Not specified'}</p>
                </div>

                {profile.expertise && (
                  <div className="profile-detail-item">
                    <h5>Expertise</h5>
                    <p className="expertise-pill">{profile.expertise}</p>
                  </div>
                )}

                {/* Social Links */}
                {profile.socialLinks && (profile.socialLinks.linkedin || profile.socialLinks.github || profile.socialLinks.twitter) && (
                  <div className="profile-detail-item">
                    <h5>Social Links</h5>
                    <div className="profile-social-links-row">
                      {profile.socialLinks.linkedin && (
                        <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                          <FiLinkedin size={16} />
                        </a>
                      )}
                      {profile.socialLinks.github && (
                        <a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer" title="GitHub">
                          <FiGithub size={16} />
                        </a>
                      )}
                      {profile.socialLinks.twitter && (
                        <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" title="Twitter">
                          <FiTwitter size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Uploaded Notes List */}
              <div className="profile-uploaded-notes-section">
                <h5>Uploaded Notes ({profile.uploadedNotes?.length || 0})</h5>
                {profile.uploadedNotes?.length > 0 ? (
                  <div className="profile-notes-scroller">
                    {profile.uploadedNotes.map(note => (
                      <a 
                        key={note._id}
                        href={`/explorer?search=${encodeURIComponent(note.title)}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="profile-note-row-card"
                      >
                        <div className="note-row-icon">
                          <FiBookOpen size={14} />
                        </div>
                        <div className="note-row-info">
                          <h6>{note.title}</h6>
                          <p>{note.subject} • {note.price === 0 ? 'Free' : `₹${note.price}`}</p>
                        </div>
                        <FiCompass size={14} className="note-row-arrow" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="no-notes-text">No notes uploaded by this user yet.</p>
                )}
              </div>

              {/* Report Action Row */}
              {String(currentUser?._id) !== String(profile._id) && (
                <div className="profile-sidebar-report-area">
                  {!showReportForm ? (
                    <button 
                      onClick={() => setShowReportForm(true)}
                      className="report-sidebar-trigger"
                    >
                      <FiAlertTriangle size={14} /> Report User
                    </button>
                  ) : (
                    <form onSubmit={handleReportSubmit} className="report-sidebar-form">
                      <h6>Report {profile.name}</h6>
                      <textarea
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="Reason for reporting this user..."
                        required
                        rows={3}
                      />
                      {successMsg && <p className="report-success-msg">{successMsg}</p>}
                      <div className="report-actions">
                        <button 
                          type="submit" 
                          disabled={reporting || !reportReason.trim()}
                          className="report-submit-btn"
                        >
                          {reporting ? 'Reporting...' : 'Submit'}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setShowReportForm(false)}
                          className="report-cancel-btn"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
