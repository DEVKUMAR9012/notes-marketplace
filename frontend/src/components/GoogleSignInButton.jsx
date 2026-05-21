/**
 * GoogleSignInButton.jsx
 * 
 * A proper, always-visible Google Sign In button using Google's official button widget.
 * 
 * Setup required:
 *   1. Add REACT_APP_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com to frontend/.env
 *   2. Add GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com to backend/.env
 *   3. Google Cloud Console → APIs → OAuth → Authorized JS origins:
 *        http://localhost:3000  |  https://yourdomain.com
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { syncToken } from '../utils/api';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// Debug log so we can see what value is being read
console.log('[GoogleSignInButton] CLIENT_ID:', CLIENT_ID);

const isConfigured =
  typeof CLIENT_ID === 'string' &&
  CLIENT_ID.trim().length > 10 &&
  CLIENT_ID.includes('.apps.googleusercontent.com');

export default function GoogleSignInButton({ redirectTo = '/', label = 'Continue with Google' }) {
  const { login, user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const buttonRef = useRef(null);

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

  useEffect(() => {
    if (!isConfigured || !buttonRef.current || !window.google?.accounts?.id) return;

    // Clear the container first in case of re-renders
    buttonRef.current.innerHTML = '';

    // Render Google's official button widget
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: label,
      logo_alignment: 'left',
      width: '400',
    });

    // Initialize with callback
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredential,
      use_fedcm_for_prompt: false,
    });
  }, [isConfigured, handleCredential, label]);

  return (
    <div>
      <div
        ref={buttonRef}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />

      {!isConfigured && (
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '13px 20px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '14px',
          cursor: 'not-allowed',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#6b7280' }}>
            Google Sign-In not configured
          </span>
        </div>
      )}

      {error && (
        <p style={{ marginTop: 8, fontSize: 12, color: '#f87171', textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  );
}
