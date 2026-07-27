import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API, { syncToken } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Hydrate from localStorage immediately to avoid flicker or hanging
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('user');
      if (cached) return JSON.parse(cached);
      const fallback = {
        _id: 'guest_' + Math.random().toString(36).substring(2, 10),
        name: 'Guest Explorer',
        role: 'guest',
        isGuest: true,
      };
      localStorage.setItem('user', JSON.stringify(fallback));
      return fallback;
    } catch {
      return { _id: 'guest_fallback', name: 'Guest Explorer', role: 'guest', isGuest: true };
    }
  });
  const [loading, setLoading] = useState(false);

  const createLocalGuestFallback = () => {
    const fallback = {
      _id: 'guest_' + Math.random().toString(36).substring(2, 10),
      name: 'Guest Explorer',
      role: 'guest',
      isGuest: true,
    };
    localStorage.setItem('user', JSON.stringify(fallback));
    setUser(fallback);
    return fallback;
  };

  // ── Background Session Engine ─────────────────────────────────────────────
  const initializeSession = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      // ── A: Fresh visitor — create or sync guest session ──────────────
      try {
        const { data } = await API.post('/auth/guest-init', {}, { timeout: 10000 });
        if (data?.success) {
          syncToken(data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        } else if (!user) {
          createLocalGuestFallback();
        }
      } catch (err) {
        console.warn('Guest session creation using local fallback:', err.message);
        if (!user) createLocalGuestFallback();
      }
    } else {
      // ── B/C: Returning visitor — validate & refresh ────────────────────
      syncToken(token);
      try {
        const { data } = await API.get('/auth/me');
        const freshUser = data.user || data;
        localStorage.setItem('user', JSON.stringify(freshUser));
        setUser(freshUser);
      } catch {
        syncToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        createLocalGuestFallback();
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