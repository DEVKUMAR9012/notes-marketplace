import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing user
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  // ✅ FIXED: Handle both old and new response formats
  const login = (responseData) => {
    console.log('Login response:', responseData);
    
    // Handle different response formats from backend
    let userData, token;
    
    if (responseData.user && responseData.token) {
      // New format: { user: {...}, token: "..." }
      userData = responseData.user;
      token = responseData.token;
    } else if (responseData._id && responseData.token) {
      // Old format: { _id: "...", name: "...", token: "..." }
      const { token: authToken, ...userInfo } = responseData;
      userData = userInfo;
      token = authToken;
    } else {
      console.error('Invalid login data format:', responseData);
      throw new Error('Invalid login data received');
    }
    
    // Store in localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    
    // Update state
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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