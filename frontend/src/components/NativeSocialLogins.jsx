/**
 * NativeSocialLogins.jsx
 *
 * Renders the Google One-Tap prompt silently on the Login page.
 * No visible markup — the prompt appears as Google's native overlay.
 *
 * Prerequisites:
 *   1. Add REACT_APP_GOOGLE_CLIENT_ID=<your_id> to frontend/.env
 *   2. Add GOOGLE_CLIENT_ID=<your_id>            to backend/.env
 *   3. In Google Cloud Console → OAuth consent screen → Authorized JS origins:
 *        http://localhost:3000
 *        https://noteshere.site
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { syncToken } from '../utils/api';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export default function NativeSocialLogins() {
  const { login, user, isGuest } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't prompt if user is already fully logged in
    if (user && !isGuest) return;
    if (!GOOGLE_CLIENT_ID) {
      console.warn('NativeSocialLogins: REACT_APP_GOOGLE_CLIENT_ID not set. One-Tap disabled.');
      return;
    }

    const initOneTap = () => {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        cancel_on_tap_outside: false,
        // context tells Google what UI copy to show
        context: 'signin',
      });

      // Show the native One-Tap dialog in the top-right corner
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.log('One-Tap not displayed:', notification.getNotDisplayedReason());
        }
        if (notification.isSkippedMoment()) {
          console.log('One-Tap skipped:', notification.getSkippedReason());
        }
      });
    };

    const handleCredentialResponse = async (response) => {
      try {
        const payload = {
          credential: response.credential,
          // Pass guestId so backend can absorb the invisible session into the new account
          ...(isGuest && user?._id ? { guestId: user._id } : {}),
        };

        const { data } = await API.post('/auth/google-one-tap', payload);

        syncToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        login(data);

        // Route new signups to profile, returning users to home
        navigate(data.isNewUser ? '/profile' : '/');
      } catch (err) {
        console.error('Google One-Tap callback failed:', err?.response?.data?.message || err.message);
      }
    };

    // GSI script may not be loaded yet (async defer) — poll until ready
    if (window.google?.accounts?.id) {
      initOneTap();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initOneTap();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [user, isGuest, login, navigate]);

  // Invisible — Google renders its own overlay
  return null;
}
