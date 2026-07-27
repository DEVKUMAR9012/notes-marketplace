import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiGithub } from 'react-icons/fi';

const GITHUB_CLIENT_ID = process.env.REACT_APP_GITHUB_CLIENT_ID;
const isConfigured = typeof GITHUB_CLIENT_ID === 'string' && GITHUB_CLIENT_ID.trim().length > 0;

export default function GitHubSignInButton({ redirectTo = '/', label = 'Continue with GitHub' }) {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Store redirectTo so GitHubCallback can pick it up after redirect
  const handleGitHubAuth = () => {
    if (!isConfigured) {
      setError('GitHub Sign-In is not configured. Add REACT_APP_GITHUB_CLIENT_ID to your .env file.');
      return;
    }

    setLoading(true);
    setError('');

    // Persist context for the callback page
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('github_oauth_state', state);
    localStorage.setItem('github_redirect_to', redirectTo);
    if (isGuest && user?._id) {
      localStorage.setItem('github_guest_id', user._id);
    }

    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/github/callback`);
    const scope = encodeURIComponent('user:email');

    window.location.href =
      `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
  };

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
            <FiGithub size={20} color="#9ca3af" />
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
        onClick={handleGitHubAuth}
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
          <FiGithub size={20} color="#111827" />
        )}
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
          {loading ? 'Connecting…' : label}
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
