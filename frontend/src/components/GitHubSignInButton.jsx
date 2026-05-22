import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { syncToken } from '../utils/api';
import { FiGithub } from 'react-icons/fi';

const GITHUB_CLIENT_ID = process.env.REACT_APP_GITHUB_CLIENT_ID;
const isConfigured = GITHUB_CLIENT_ID && GITHUB_CLIENT_ID.length > 0;

export default function GitHubSignInButton({ redirectTo = '/', label = 'Continue with GitHub' }) {
  const { login, user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Listen for callback from GitHub (when user returns from GitHub OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code) {
      handleGitHubCallback(code, state);
    }
  }, []);

  const handleGitHubCallback = async (code, state) => {
    try {
      const payload = {
        code,
        state,
        ...(isGuest && user?._id ? { guestId: user._id } : {}),
      };
      const { data } = await API.post('/auth/github/callback', payload);
      syncToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      login(data);
      navigate(data.isNewUser ? '/profile' : redirectTo, { replace: true });
    } catch (err) {
      console.error('GitHub callback error:', err);
      setError(err?.response?.data?.message || 'GitHub sign-in failed');
    }
  };

  const handleGitHubAuth = () => {
    if (!isConfigured) {
      setError('GitHub Sign-In not configured. Please set REACT_APP_GITHUB_CLIENT_ID.');
      return;
    }

    setLoading(true);
    setError('');

    // GitHub OAuth redirect
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('github_oauth_state', state);

    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/github/callback`);
    const scope = encodeURIComponent('user:email');
    
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleGitHubAuth}
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
          <FiGithub size={20} />
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
