import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GoogleSignInButton from '../components/GoogleSignInButton';
import AppleSignInButton from '../components/AppleSignInButton';
import GitHubSignInButton from '../components/GitHubSignInButton';
import AnimatedLogo from '../components/AnimatedLogo';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

export default function RegisterSocialOnly() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    if (user && !user.isGuest) navigate('/profile', { replace: true });
  }, [user, navigate]);

  const handleGuestSignup = async () => {
    setGuestLoading(true);
    try {
      const { data } = await API.post('/auth/guest-init');
      login(data);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Guest init failed:', err);
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07071a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* 🌌 Purple depth orb — top-left */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-15%',
        width: '700px', height: '700px',
        background: 'radial-gradient(circle, rgba(109,40,217,0.22) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* 🌌 Magenta depth orb — bottom-right */}
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-15%',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(219,39,119,0.17) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Subtle grid texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: '440px', width: '100%', position: 'relative', zIndex: 1 }}
      >
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '28px',
          padding: '40px 36px 36px',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}>

          {/* ── Logo ──────────────────────────────────────────────────────── */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px', overflow: 'visible' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: '-12px',
                  background: 'radial-gradient(circle, rgba(139,92,246,0.38) 0%, transparent 70%)',
                  borderRadius: '50%', filter: 'blur(10px)', pointerEvents: 'none',
                  animation: 'logo-breathe 3s ease-in-out infinite',
                }} />
                <AnimatedLogo size="large" />
              </div>
            </div>

            {/* Brand name — gradient */}
            <div style={{
              fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em',
              textTransform: 'uppercase', marginBottom: '14px',
              background: 'linear-gradient(90deg, #a78bfa 0%, #f472b6 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Notes Marketplace
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize: '26px', fontWeight: 800, color: '#fff',
              margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.2,
            }}>
              Join the community{' '}
              <span style={{
                background: 'linear-gradient(135deg, #a78bfa, #f472b6, #fb923c)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>✦</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', margin: 0 }}>
              Sign up to start learning &amp; sharing
            </p>
          </div>

          {/* ── Buttons ───────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* 🔥 Google — primary CTA */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
              <GoogleSignInButton label="Sign up with Google" redirectTo="/profile" />
            </motion.div>

            {/* 🍎 Apple */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
              <AppleSignInButton label="Sign up with Apple" redirectTo="/profile" />
            </motion.div>

            {/* GitHub */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}>
              <GitHubSignInButton label="Sign up with GitHub" redirectTo="/profile" />
            </motion.div>

            {/* GitLab — coming soon */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
              <button type="button" disabled style={styles.gitlabBtn}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <GitLabIcon />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563' }}>Sign up with GitLab</span>
                </div>
                <span style={styles.soonBadge}>Soon</span>
              </button>
            </motion.div>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.30 }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '2px 0' }}
            >
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            </motion.div>

            {/* 👤 Guest — ghost / de-emphasized */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
              <button
                type="button"
                onClick={handleGuestSignup}
                disabled={guestLoading}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', padding: '11px 20px',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '14px', cursor: guestLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', opacity: guestLoading ? 0.55 : 0.65,
                }}
                onMouseEnter={e => {
                  if (!guestLoading) {
                    e.currentTarget.style.opacity = '0.88';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '0.65';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {guestLoading
                  ? <span style={styles.spinner} />
                  : <span style={{ fontSize: 15, lineHeight: 1 }}>👤</span>
                }
                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>
                  {guestLoading ? 'Starting session…' : 'Continue as Guest'}
                </span>
              </button>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }}>
            <p style={{
              fontSize: 11, color: 'rgba(255,255,255,0.18)', textAlign: 'center',
              marginTop: '18px', marginBottom: 0, lineHeight: 1.65,
            }}>
              Guest sessions stay only in this browser and do not create a saved account
            </p>
            <div style={{
              marginTop: '18px', paddingTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center',
            }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', margin: 0 }}>
                Already have an account?{' '}
                <span style={{ color: 'rgba(255,255,255,0.38)' }}>Use login with any method</span>
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <style>{`
        @keyframes logo-breathe {
          0%,100% { opacity: 0.7; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  gitlabBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px', cursor: 'not-allowed', opacity: 0.5,
  },
  soonBadge: {
    fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase',
    letterSpacing: '0.08em', background: 'rgba(139,92,246,0.12)',
    padding: '3px 8px', borderRadius: '20px', border: '1px solid rgba(139,92,246,0.2)',
  },
  spinner: {
    width: 15, height: 15,
    border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.5)',
    borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite',
  },
};

function GitLabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0c.05.05.09.11.11.18l2.44 7.49h8.1l2.44-7.51a.42.42 0 01.11-.18.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51 1.22 3.78a.84.84 0 01-.3.94z" fill="#4b5563"/>
    </svg>
  );
}
