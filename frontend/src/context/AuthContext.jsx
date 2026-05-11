import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API, { syncToken } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestInitializing, setGuestInitializing] = useState(false);

  // ── Silent Guest Initialization ──────────────────────────────────────────
  const initializeGuest = useCallback(async () => {
    if (localStorage.getItem('token')) return;
    setGuestInitializing(true);
    try {
      const { data } = await API.post('/auth/guest-init');
      syncToken(data.token);                                   // ⚡ Sync Axios immediately
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      console.log(`🎟️ Guest session ready: ${data.user.guestTokenNo}`);
    } catch (err) {
      console.error('Guest init failed — app works without session', err);
    } finally {
      setGuestInitializing(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
        setLoading(false);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setLoading(false);
        initializeGuest(); // Try to create fresh guest session
      }
    } else {
      setLoading(false);
      initializeGuest(); // No session at all — create guest
    }
  }, [initializeGuest]);

  // ✅ FIXED: Handle both old and new response formats
  const login = (responseData) => {
    console.log('Login response:', responseData);

    let userData, token;

    if (responseData.user && responseData.token) {
      userData = responseData.user;
      token = responseData.token;
    } else if (responseData._id && responseData.token) {
      const { token: authToken, ...userInfo } = responseData;
      userData = userInfo;
      token = authToken;
    } else {
      console.error('Invalid login data format:', responseData);
      throw new Error('Invalid login data received');
    }

    syncToken(token);                                          // ⚡ Sync Axios immediately
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    syncToken(null);                                           // ⚡ Clear Axios header immediately
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setTimeout(() => initializeGuest(), 300);
  };

  // Helper to update user state (used after guest conversion or profile update)
  const updateUser = (updatedData) => {
    const merged = { ...user, ...updatedData };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  const isGuest = user?.role === 'guest' || user?.isGuest === true;

  return (
    <AuthContext.Provider value={{ user, setUser, loading, guestInitializing, login, logout, updateUser, isGuest, initializeGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};