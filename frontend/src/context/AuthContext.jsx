import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API, { syncToken } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Hydrate from localStorage immediately to avoid flicker
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false); // ⭐ Don't block UI on first load

  // ── Background Session Engine ─────────────────────────────────────────────
  // Called on mount. Three outcomes:
  //   A) No token → create silent invisible guest session
  //   B) Token exists + /auth/me succeeds → refresh user from server
  //   C) Token exists + /auth/me fails (expired) → clear & re-create silent guest
  const initializeSession = useCallback(async () => {
    const token = localStorage.getItem('token');
    setLoading(true); // Show loading only if already mounted for 2+ seconds

    if (!token) {
      // ── A: Fresh visitor — create invisible ghost session ──────────────
      try {
        const { data } = await API.post('/auth/guest-init', {}, { timeout: 30000 }); // 30s timeout for cold start
        if (data?.success) {
          syncToken(data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        }
      } catch (err) {
        console.warn('Guest session creation delayed (backend warming up):', err.message);
        // Silent fail — app works fine without a session
      }
    } else {
      // ── B/C: Returning visitor — validate & refresh ────────────────────
      syncToken(token); // Attach existing token to Axios first
      try {
        const { data } = await API.get('/auth/me');
        const freshUser = data.user || data;
        localStorage.setItem('user', JSON.stringify(freshUser));
        setUser(freshUser);
      } catch {
        // ── C: Token expired/invalid → nuke it and start fresh ghost session
        syncToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        try {
          const { data } = await API.post('/auth/guest-init', {}, { timeout: 30000 });
          if (data?.success) {
            syncToken(data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
          }
        } catch {
          // Silent fail
        }
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // ── Login: handles both { user, token } and flat { _id, token, ... } shapes
  const login = (responseData) => {
    let userData, token;

    if (responseData.user && responseData.token) {
      userData = responseData.user;
      token = responseData.token;
    } else if (responseData._id && responseData.token) {
      const { token: authToken, ...userInfo } = responseData;
      userData = userInfo;
      token = authToken;
    } else {
      throw new Error('Invalid auth response format');
    }

    syncToken(token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  // ── Logout: clear everything and silently re-init a ghost session
  const logout = () => {
    syncToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    // Small delay to let route changes settle before creating new ghost session
    setTimeout(() => initializeSession(), 300);
  };

  // ── updateUser: merge partial data (used after profile edits) ─────────────
  const updateUser = (updatedData) => {
    const merged = { ...user, ...updatedData };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  const isGuest = user?.role === 'guest' || user?.isGuest === true;

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      loading,
      login,
      logout,
      updateUser,
      isGuest,
      initializeSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};