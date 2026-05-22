import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { syncToken } from '../utils/api';

const APPLE_CLIENT_ID = process.env.REACT_APP_APPLE_CLIENT_ID;
const APPLE_TEAM_ID = process.env.REACT_APP_APPLE_TEAM_ID;
const APPLE_KEY_ID = process.env.REACT_APP_APPLE_KEY_ID;

const isConfigured = APPLE_CLIENT_ID && APPLE_TEAM_ID;

export default function AppleSignInButton({ redirectTo = '/', label = 'Continue with Apple' }) {
  const { login, user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load AppleID script
  useEffect(() => {
    if (!isConfigured) return;
    
    const script = document.createElement('script');
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  const handleAppleAuth = () => {
    if (!isConfigured) {
      setError('Apple Sign-In not configured. Please set env variables.');
      return;
    }

    if (!window.AppleID) {
      setError('Apple ID service not loaded. Try again.');
      return;
    }

    setLoading(true);
    setError('');

    window.AppleID.auth.init({
      clientId: APPLE_CLIENT_ID,
      teamId: APPLE_TEAM_ID,
      keyId: APPLE_KEY_ID,
      redirectURI: `${window.location.origin}/auth/apple/callback`,
      scope: 'name email',
      redirectMethod: 'POST',
      usePopup: true,
    });

    window.AppleID.auth.signIn().then(async (response) => {
      try {
        const { data } = await API.post('/auth/apple', {
          identityToken: response.authorization.id_token,
          ...(isGuest && user?._id ? { guestId: user._id } : {}),
        });
        syncToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        login(data);
        navigate(data.isNewUser ? '/profile' : redirectTo, { replace: true });
      } catch (err) {
        setError(err?.response?.data?.message || 'Apple sign-in failed');
        setLoading(false);
      }
    }).catch((err) => {
      console.error('Apple auth error:', err);
      setError('Apple sign-in cancelled or failed');
      setLoading(false);
    });
  };

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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
