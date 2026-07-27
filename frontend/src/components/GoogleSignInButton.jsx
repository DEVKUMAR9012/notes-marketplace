/**
 * GoogleSignInButton.jsx
 * 🔥 Spinning gradient border (purple→pink→coral) + pulsing inner glow
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

export default function GoogleSignInButton({ redirectTo = '/', label = 'Sign in with Google' }) {
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

  // ── Render the official Google widget ────────────────────────────────────
  const renderGoogleButton = useCallback(() => {
    if (!isConfigured || !buttonRef.current || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredential,
      use_fedcm_for_prompt: false,
    });
    buttonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: label,
      logo_alignment: 'left',
      width: '360',
    });
  }, [handleCredential, label]);

  // ── Event-driven: fires the instant index.html's onGoogleLibraryLoad runs ─
  useEffect(() => {
    if (!isConfigured) return;
    if (window.google?.accounts?.id) { setGsiReady(true); return; }
    const onReady = () => setGsiReady(true);
    window.addEventListener('google-gsi-ready', onReady);
    return () => window.removeEventListener('google-gsi-ready', onReady);
  }, []);

  useEffect(() => {
    if (gsiReady) renderGoogleButton();
  }, [gsiReady, renderGoogleButton]);

  // ── Not configured fallback ───────────────────────────────────────────────
  if (!isConfigured) {
    return (
      <button type="button" disabled style={styles.notConfigured}>
        <GoogleG />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#4b5563' }}>Google Sign-In not configured</span>
      </button>
    );
  }

  return (
    <div>
      {/* ── Shimmer skeleton while GSI loads ────────────────────────────── */}
      {!gsiReady && (
        <div style={styles.skeleton}>
          <GoogleG opacity={0.4} />
          <span style={styles.auroraText}>{label}</span>
        </div>
      )}

      {/* ── 🔥 Spinning gradient border wrapper ─────────────────────────── */}
      <div style={{ display: gsiReady ? 'block' : 'none' }}>
        {/* Outer glow aura */}
        <div style={styles.outerGlow}>
          {/* Overflow clip container */}
          <div style={styles.spinnerClip}>
            {/* Rotating conic gradient — oversized so it fills all corners */}
            <div className="gsb-spinner" style={styles.conicSpinner} />
            {/* Inner dark surface */}
            <div style={styles.innerSurface}>
              {/* Pulsing radial inner glow */}
              <div className="gsb-inner-glow" style={styles.innerGlow} />
              {/* Google's actual button */}
              <div
                ref={buttonRef}
                style={styles.buttonHost}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ marginTop: 8, fontSize: 12, color: '#f87171', textAlign: 'center' }}>
          {error}
        </p>
      )}

      <style>{`
        @keyframes gsb-spin       { to { transform: rotate(360deg); } }
        @keyframes gsb-aura-pulse {
          0%,100% { box-shadow: 0 0 18px rgba(139,92,246,0.45), 0 0 40px rgba(139,92,246,0.18); }
          50%      { box-shadow: 0 0 28px rgba(236,72,153,0.55), 0 0 60px rgba(236,72,153,0.22); }
        }
        @keyframes gsb-glow-pulse {
          0%,100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        @keyframes gsb-aurora {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes gsb-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .gsb-spinner    { animation: gsb-spin 2.8s linear infinite; }
        .gsb-inner-glow { animation: gsb-glow-pulse 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ── Inline styles (keeps JSX clean) ─────────────────────────────────────────
const styles = {
  notConfigured: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '10px', padding: '13px 20px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px', cursor: 'not-allowed', opacity: 0.5,
  },
  skeleton: {
    width: '100%', height: '46px', borderRadius: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    background: 'linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%', animation: 'gsb-shimmer 1.5s infinite',
    border: '1px solid rgba(255,255,255,0.07)',
  },
  auroraText: {
    fontSize: 14, fontWeight: 600,
    background: 'linear-gradient(90deg,#a78bfa,#f472b6,#fb923c,#a78bfa)',
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
    animation: 'gsb-aurora 2s linear infinite',
  },
  outerGlow: {
    borderRadius: '16px',
    animation: 'gsb-aura-pulse 2.5s ease-in-out infinite',
  },
  spinnerClip: {
    position: 'relative', borderRadius: '16px',
    padding: '2px', overflow: 'hidden',
  },
  conicSpinner: {
    position: 'absolute', inset: '-60px',
    background: 'conic-gradient(from 0deg,#f97b5b,#fb923c,#10b981,#f97b5b)',
    transformOrigin: '50% 50%',
  },
  innerSurface: {
    position: 'relative', borderRadius: '14px',
    background: '#ffffff',
    overflow: 'hidden',
  },
  innerGlow: {
    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
    background: 'radial-gradient(ellipse at 50% 120%,rgba(249,123,91,0.08) 0%,transparent 65%)',
  },
  buttonHost: {
    position: 'relative', zIndex: 1,
    display: 'flex', justifyContent: 'center', minHeight: '44px',
  },
};

// Inline Google 'G' logo
function GoogleG({ opacity = 1 }) {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ opacity, flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
