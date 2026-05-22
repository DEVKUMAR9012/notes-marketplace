import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { syncToken } from '../utils/api';

/**
 * GitHubCallback.jsx
 *
 * Dedicated page that handles the GitHub OAuth redirect.
 * GitHub redirects here with ?code=... after the user authorises the app.
 * This page exchanges the code for a JWT and then navigates home.
 */
export default function GitHubCallback() {
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      navigate('/login', { replace: true });
      return;
    }

    if (!code) {
      navigate('/login', { replace: true });
      return;
    }

    // Read context stored before the redirect
    const redirectTo = localStorage.getItem('github_redirect_to') || '/';
    const guestId = localStorage.getItem('github_guest_id') || null;

    // Clean up stored values
    localStorage.removeItem('github_oauth_state');
    localStorage.removeItem('github_redirect_to');
    localStorage.removeItem('github_guest_id');

    const exchange = async () => {
      try {
        const payload = {
          code,
          ...(guestId ? { guestId } : {}),
        };
        const { data } = await API.post('/auth/github/callback', payload);
        syncToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        login(data);
        navigate(data.isNewUser ? '/profile' : redirectTo, { replace: true });
      } catch (err) {
        console.error('GitHub callback error:', err);
        navigate('/login?error=github_failed', { replace: true });
      }
    };

    exchange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #111827, #1f2937, #000)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
    }}>
      <span style={{
        width: 40,
        height: 40,
        border: '3px solid rgba(139,92,246,0.2)',
        borderTopColor: '#8b5cf6',
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'system-ui' }}>
        Signing in with GitHub…
      </p>
    </div>
  );
}
