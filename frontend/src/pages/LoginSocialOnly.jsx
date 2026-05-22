import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GoogleSignInButton from '../components/GoogleSignInButton';
import AppleSignInButton from '../components/AppleSignInButton';
import GitHubSignInButton from '../components/GitHubSignInButton';
import AnimatedLogo from '../components/AnimatedLogo';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

export default function LoginSocialOnly() {
  const navigate = useNavigate();
  const { user, guestInit } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);

  // If already logged in, redirect home
  useEffect(() => {
    if (user && !user.isGuest) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      const { data } = await API.post('/auth/guest-init');
      guestInit(data);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Guest init failed:', err);
    } finally {
      setGuestLoading(false);
    }
  };

  const handleGitLabClick = () => {
    // GitLab coming soon
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Lights */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-800/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-800/12 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6 overflow-visible">
              <AnimatedLogo size="large" />
            </div>
            <h1 className="text-3xl font-bold text-white">Welcome to Notes Marketplace</h1>
            <p className="text-gray-400 mt-3 text-sm">Choose how you'd like to continue</p>
          </div>

          {/* Social Auth Buttons */}
          <div className="space-y-3">
            {/* Google */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <GoogleSignInButton label="Continue with Google" redirectTo="/" />
            </motion.div>

            {/* Apple */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <AppleSignInButton label="Continue with Apple" redirectTo="/" />
            </motion.div>

            {/* GitHub */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GitHubSignInButton label="Continue with GitHub" redirectTo="/" />
            </motion.div>

            {/* GitLab - Coming Soon */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <button
                type="button"
                disabled
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '13px 20px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '14px',
                  cursor: 'not-allowed',
                  opacity: 0.6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#d1d5db' }}>
                    <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 2.4c5.302 0 9.6 4.298 9.6 9.6s-4.298 9.6-9.6 9.6-9.6-4.298-9.6-9.6 4.298-9.6 9.6-9.6z" />
                  </svg>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#d1d5db' }}>
                    Continue with GitLab
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Coming Soon
                </span>
              </button>
            </motion.div>

            {/* Guest Login */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={guestLoading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '13px 20px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '14px',
                  cursor: guestLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.18s',
                  opacity: guestLoading ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!guestLoading) { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
              >
                {guestLoading ? (
                  <span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                ) : (
                  <span style={{ fontSize: 18 }}>👤</span>
                )}
                <span style={{ fontSize: 14, fontWeight: 600, color: '#d1d5db' }}>
                  {guestLoading ? 'Initializing...' : 'Continue as Guest'}
                </span>
              </button>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </motion.div>
          </div>

          {/* Footer Text */}
          <p className="text-xs text-gray-500 text-center mt-8 leading-relaxed">
            Guest sessions stay only in this browser and do not create a saved account
          </p>

          {/* Sign Up Link */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-gray-400 text-sm">
              New here? <span className="text-gray-500">Sign up with any method above</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
