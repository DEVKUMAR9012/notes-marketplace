/**
 * GoogleSignInButton.jsx
 * 
 * A proper, always-visible Google Sign In button.
 * Works with the Google Identity Services (GSI) script via One-Tap popup.
 * 
 * Setup required:
 *   1. Add REACT_APP_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com to frontend/.env
 *   2. Add GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com to backend/.env
 *   3. Google Cloud Console → APIs → OAuth → Authorized JS origins:
 *        http://localhost:3000  |  https://yourdomain.com
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { syncToken } from '../utils/api';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const isConfigured =
  typeof CLIENT_ID === 'string' &&
  CLIENT_ID.endsWith('.apps.googleusercontent.com');

export default function GoogleSignInButton({ redirectTo = '/', label = 'Continue with Google' }) {
  const { login, user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gsiReady, setGsiReady] = useState(false);

  // ── Poll until GSI script is loaded ──────────────────────────────
  useEffect(() => {
    if (!isConfigured) return;
    if (window.google?.accounts?.id) { setGsiReady(true); return; }
    const t = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(t);
        setGsiReady(true);
      }
    }, 150);
    return () => clearInterval(t);
  }, []);

  // ── Initialize GSI when ready ────────────────────────────────────
  useEffect(() => {
    if (!gsiReady || !isConfigured) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredential,
      cancel_on_tap_outside: true,
      context: 'signin',
    });
  }, [gsiReady]);

  const handleCredential = useCallback(async (response) => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        credential: response.credential,
        ...(isGuest && user?._id ? { guestId: user._id } : {}),
      };
      const { data } = await API.post('/auth/google-one-tap', payload);
      syncToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      login(data);
      navigate(data.isNewUser ? '/profile' : redirectTo, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Google sign-in failed. Try again.');
    } finally {
      setLoading(false);
    }
  }, [login, navigate, isGuest, user, redirectTo]);

  const handleClick = () => {
    if (!isConfigured) {
      setError('Google Sign-In is not configured yet. Please add your Google Client ID.');
      return;
    }
    if (!gsiReady) {
      setError('Google is loading, please wait a moment...');
      return;
    }
    setError('');
    // Re-initialize with latest callback (captures fresh closure)
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredential,
      cancel_on_tap_outside: true,
      context: 'signin',
    });
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One-tap was blocked/dismissed — fall back to popup
        if (!window.google.accounts.oauth2 || !window.google.accounts.oauth2.initTokenClient) {
          console.log('One-Tap not available, reason:', notification.getNotDisplayedReason?.() || notification.getSkippedReason?.());
        }
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
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
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.18s',
          opacity: loading ? 0.7 : 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
      >
        {loading ? (
          <span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
        ) : (
          /* Google official coloured G */
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        <span style={{ fontSize: 14, fontWeight: 600, color: '#d1d5db' }}>
          {loading ? 'Signing in...' : label}
        </span>
      </button>

      {error && (
        <p style={{ marginTop: 8, fontSize: 12, color: '#f87171', textAlign: 'center' }}>
          {error}
        </p>
      )}

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
