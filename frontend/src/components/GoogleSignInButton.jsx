/**
 * GoogleSignInButton.jsx
 *
 * Uses Google's official `onGoogleLibraryLoad` callback (dispatched as a DOM
 * event from index.html) so the button renders the INSTANT the GSI script is
 * ready — no polling, no delay, no jump on refresh.
 *
 * Setup:
 *   1. frontend/.env  → REACT_APP_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
 *   2. backend/.env   → GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
 *   3. Google Cloud Console → OAuth → Authorized JS origins:
 *        http://localhost:3000  |  https://yourdomain.com
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { syncToken } from '../utils/api';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const isConfigured =
  typeof CLIENT_ID === 'string' &&
  CLIENT_ID.trim().length > 10 &&
  CLIENT_ID.includes('.apps.googleusercontent.com');

export default function GoogleSignInButton({ redirectTo = '/', label = 'Continue with Google' }) {
  const { login, user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gsiReady, setGsiReady] = useState(() => !!window.google?.accounts?.id);
  const buttonRef = useRef(null);

  // ── Credential handler ────────────────────────────────────────────────────
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

  // ── Render the Google button widget ──────────────────────────────────────
  const renderGoogleButton = useCallback(() => {
    if (!isConfigured || !buttonRef.current || !window.google?.accounts?.id) return;

    // 1️⃣  initialize() MUST come first — attaches the credential callback
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredential,
      use_fedcm_for_prompt: false,
    });

    // 2️⃣  renderButton() after — now the rendered button has a handler
    buttonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: label,
      logo_alignment: 'left',
      width: '400',
    });
  }, [handleCredential, label]);

  // ── Wait for GSI library via official event, then render ─────────────────
  useEffect(() => {
    if (!isConfigured) return;

    // Case A: library already loaded (e.g. hard refresh where script was cached)
    if (window.google?.accounts?.id) {
      setGsiReady(true);
      return;
    }

    // Case B: library not yet loaded — listen for the event fired by index.html
    const onReady = () => setGsiReady(true);
    window.addEventListener('google-gsi-ready', onReady);
    return () => window.removeEventListener('google-gsi-ready', onReady);
  }, []);

  // ── Re-render button whenever gsiReady flips true or label/callback changes
  useEffect(() => {
    if (gsiReady) renderGoogleButton();
  }, [gsiReady, renderGoogleButton]);

  // ── Not configured ────────────────────────────────────────────────────────
  if (!isConfigured) {
    return (
      <button
        type="button"
        disabled
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '13px 20px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          cursor: 'not-allowed',
          opacity: 0.5,
        }}
      >
        <GoogleIconSvg />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#6b7280' }}>
          Google Sign-In not configured
        </span>
      </button>
    );
  }

  return (
    <div>
      {/* Skeleton shown while GSI library loads — same height as Google's button */}
      {!gsiReady && (
        <div style={{
          width: '100%',
          height: '44px',
          borderRadius: '14px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <GoogleIconSvg opacity={0.35} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.25)' }}>
            {label}
          </span>
        </div>
      )}

      {/* Google's own button widget — rendered into this div */}
      <div
        ref={buttonRef}
        style={{
          width: '100%',
          display: gsiReady ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '44px',
        }}
      />

      {error && (
        <p style={{ marginTop: 8, fontSize: 12, color: '#f87171', textAlign: 'center' }}>
          {error}
        </p>
      )}

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// Inline Google 'G' icon — avoids an extra icon library dependency
function GoogleIconSvg({ opacity = 1 }) {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ opacity, flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
