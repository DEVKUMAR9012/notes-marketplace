import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import GoogleSignInButton from '../components/GoogleSignInButton';
import AnimatedLogo from '../components/AnimatedLogo';
import { useAuth } from '../context/AuthContext';
import API, { syncToken } from '../utils/api';

export default function LoginSocialOnly() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  
  // Email login state toggle
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Only redirect if user is fully logged in and not a temporary guest
  useEffect(() => {
    if (user && !user.isGuest) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setEmailError('Please enter both email and password');
      return;
    }
    setEmailLoading(true);
    setEmailError('');
    try {
      const { data } = await API.post('/auth/login', { email, password });
      syncToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      login(data);
      navigate('/', { replace: true });
    } catch (err) {
      setEmailError(err?.response?.data?.message || 'Invalid email or password');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #c7f2d0 0%, #dbf8be 45%, #ecfade 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* 🌌 Ambient mint & lime blur orbs */}
      <div style={{
        position: 'absolute', top: '-15%', left: '-10%',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, transparent 70%)',
        pointerEvents: 'none',
        filter: 'blur(40px)',
      }} />

      <div style={{
        position: 'absolute', bottom: '-15%', right: '-10%',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(249, 123, 91, 0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
        filter: 'blur(40px)',
      }} />

      {/* Subtle grid texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.05) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
      }} />

      {/* Decorative floating sparkle in bottom right (matching screenshot) */}
      <div style={{
        position: 'absolute', bottom: '15%', right: '8%',
        pointerEvents: 'none', opacity: 0.7,
      }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <path d="M12 0L14.4 9.6L24 12L14.4 14.4L12 24L9.6 14.4L0 12L9.6 9.6L12 0Z" fill="rgba(255, 255, 255, 0.75)" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: '430px', width: '100%', position: 'relative', zIndex: 1 }}
      >
        <div style={{
          background: 'rgba(255, 255, 255, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          borderRadius: '32px',
          padding: '38px 34px 30px',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02)',
        }}>

          {/* ── Logo & Header ────────────────────────────────────────────── */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', overflow: 'visible' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: '-12px',
                  background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
                  borderRadius: '50%', filter: 'blur(10px)', pointerEvents: 'none',
                }} />
                <AnimatedLogo size="medium" />
              </div>
            </div>

            {/* Overline text */}
            <div style={{
              fontSize: '10px', fontWeight: 800, letterSpacing: '0.18em',
              textTransform: 'uppercase', marginBottom: '10px',
              color: '#059669',
            }}>
              NOTES MARKETPLACE
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize: '25px', fontWeight: 800, color: '#111827',
              margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.2,
            }}>
              Join the community{' '}
              <span style={{
                background: 'linear-gradient(135deg, #f97b5b, #fb923c, #10b981)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>✨</span>
            </h1>
            <p style={{ color: '#6b7280', fontSize: '13.5px', margin: 0 }}>
              Sign in to start learning &amp; sharing
            </p>
          </div>

          {/* ── Action Buttons ───────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* 🔥 Google — Primary Button with animated glow border */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <GoogleSignInButton label="Sign in with Google" redirectTo="/" />
            </motion.div>

            {/* 🍎 Apple — Light Card with OAuth setup pending */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}>
              <button
                type="button"
                disabled
                style={styles.socialCard}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#9ca3af">
                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                  </svg>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1f2937' }}>Sign in with Apple</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>OAuth setup pending</div>
                  </div>
                </div>
              </button>
            </motion.div>

            {/* 🐙 GitHub — Light Card with OAuth setup pending */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <button
                type="button"
                disabled
                style={styles.socialCard}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#9ca3af">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1f2937' }}>Sign in with GitHub</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>OAuth setup pending</div>
                  </div>
                </div>
              </button>
            </motion.div>

            {/* 🦊 GitLab — Light Card with SOON Badge */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}>
              <button
                type="button"
                disabled
                style={styles.socialCard}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0c.05.05.09.11.11.18l2.44 7.49h8.1l2.44-7.51a.42.42 0 01.11-.18.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51 1.22 3.78a.84.84 0 01-.3.94z" fill="#9ca3af"/>
                  </svg>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1f2937' }}>Sign in with GitLab</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>OAuth setup pending</div>
                  </div>
                </div>
                <span style={styles.soonBadge}>SOON</span>
              </button>
            </motion.div>

          </div>

          {/* ── Email Sign-In Option ─────────────────────────────────────── */}
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setShowEmailForm(!showEmailForm)}
              style={{
                background: 'none', border: 'none', color: '#4b5563',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                padding: '6px 12px', borderRadius: '8px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#111827'}
              onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
            >
              {showEmailForm ? 'Hide email sign-in ▲' : 'Use email sign-in instead'}
            </button>
          </div>

          {/* Inline Email / Password Form (Expands smoothly) */}
          <AnimatePresence>
            {showEmailForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleEmailSubmit}
                style={{ overflow: 'hidden', marginTop: '12px' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {emailError && (
                    <div style={{
                      padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca',
                      color: '#b91c1c', borderRadius: '10px', fontSize: '12px', textAlign: 'center',
                    }}>
                      {emailError}
                    </div>
                  )}

                  <div style={{ position: 'relative' }}>
                    <FiMail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      style={{
                        width: '100%', padding: '11px 14px 11px 40px',
                        background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)',
                        borderRadius: '12px', fontSize: '13px', outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ position: 'relative' }}>
                    <FiLock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      style={{
                        width: '100%', padding: '11px 40px 11px 40px',
                        background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)',
                        borderRadius: '12px', fontSize: '13px', outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer',
                      }}
                    >
                      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={emailLoading}
                    style={{
                      width: '100%', padding: '11px',
                      background: 'linear-gradient(135deg, #059669, #10b981)',
                      color: '#ffffff', border: 'none', borderRadius: '12px',
                      fontSize: '13px', fontWeight: 700, cursor: emailLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    <span>{emailLoading ? 'Signing in...' : 'Sign In with Email'}</span>
                    <FiArrowRight size={14} />
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <div style={{
            marginTop: '20px', paddingTop: '16px',
            borderTop: '1px solid rgba(0, 0, 0, 0.06)', textAlign: 'center',
          }}>
            <p style={{ fontSize: '13px', color: '#4b5563', margin: 0 }}>
              Don't have an account?{' '}
              <Link
                to="/register"
                style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}
              >
                Sign up with any method.
              </Link>
            </p>
          </div>

          {/* Copyright notice (matching screenshot) */}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>
              &copy; {new Date().getFullYear()} Notes Marketplace, Inc.
            </span>
          </div>

        </div>
      </motion.div>

    </div>
  );
}

const styles = {
  socialCard: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '11px 18px',
    background: '#f8fafc',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '16px',
    cursor: 'not-allowed',
    transition: 'background 0.2s',
  },
  soonBadge: {
    fontSize: '9.5px',
    fontWeight: 800,
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    background: '#d1fae5',
    padding: '2.5px 8px',
    borderRadius: '20px',
    border: '1px solid #a7f3d0',
  },
};
