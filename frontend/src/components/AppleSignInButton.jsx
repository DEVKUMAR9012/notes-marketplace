import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { syncToken } from '../utils/api';

const APPLE_CLIENT_ID = process.env.REACT_APP_APPLE_CLIENT_ID;
const isConfigured = typeof APPLE_CLIENT_ID === 'string' && APPLE_CLIENT_ID.trim().length > 0;

export default function AppleSignInButton({ redirectTo = '/', label = 'Continue with Apple' }) {
  const { login, user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sdkReady = useRef(false);

  // Load AppleID script and initialize once
  useEffect(() => {
    if (!isConfigured) return;

    const initApple = () => {
      if (!window.AppleID || sdkReady.current) return;
      try {
        window.AppleID.auth.init({
          clientId: APPLE_CLIENT_ID,
          redirectURI: `${window.location.origin}/auth/apple/callback`,
          scope: 'name email',
          usePopup: true,
        });
        sdkReady.current = true;
      } catch (e) {
        console.warn('Apple SDK init error:', e);
      }
    };

    // If script already loaded
    if (window.AppleID) {
      initApple();
      return;
    }

    // Load the script
    const script = document.createElement('script');
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.onload = initApple;
    document.body.appendChild(script);

    return () => {
      // Don't remove script on unmount — it may be needed elsewhere
    };
  }, []);

  const handleAppleAuth = async () => {
    if (!isConfigured) {
      setError('Apple Sign-In is not configured. Add REACT_APP_APPLE_CLIENT_ID to your .env file.');
      return;
    }

    if (!window.AppleID) {
      setError('Apple ID service is still loading. Please try again in a moment.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await window.AppleID.auth.signIn();
      const { data } = await API.post('/auth/apple', {
        identityToken: response.authorization.id_token,
        user: response.user || null,
        ...(isGuest && user?._id ? { guestId: user._id } : {}),
      });
      syncToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      login(data);
      navigate(data.isNewUser ? '/profile' : redirectTo, { replace: true });
    } catch (err) {
      if (err?.error === 'popup_closed_by_user') {
        // User cancelled — not an error
      } else {
        console.error('Apple auth error:', err);
        setError(err?.response?.data?.message || 'Apple sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show graceful disabled state when not configured
  if (!isConfigured) {
    return (
      <div>
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
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            cursor: 'not-allowed',
            opacity: 0.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" fill="#9ca3af" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af' }}>{label}</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Not configured
          </span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAppleAuth}
        disabled={loading}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '13px 20px',
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: '14px',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.18s',
          opacity: loading ? 0.7 : 1,
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.22)'; } }}
        onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; }}
      >
        {loading ? (
          <span style={{ width: 20, height: 20, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#111827', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#111827" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
          </svg>
        )}
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
          {loading ? 'Signing in…' : label}
        </span>
      </button>

      {error && (
        <p style={{ marginTop: 8, fontSize: 12, color: '#f87171', textAlign: 'center' }}>
          {error}
        </p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
