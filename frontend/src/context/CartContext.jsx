import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../utils/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCart([]);
      setLoading(false);
      return;
    }
    try {
      const res = await API.get('/profile/me');
      setCart(res.data.user.cart || []);
    } catch (err) {
      console.error('Fetch cart error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [user]);

  const toggleCartItem = useCallback(async (noteId) => {
    try {
      const res = await API.post('/profile/cart/toggle', { noteId });
      // ✅ OPTIMIZATION: Nayi API call karne ke bajaye direct backend response se state update karo
      if (res.data.cart) {
        setCart(res.data.cart);
      } else {
        // Fallback agar backend sirf message bhej raha ho
        fetchCart(); 
      }
      return res.data.message;
    } catch (err) {
      console.error('Toggle cart error:', err);
      throw err;
    }
  }, [fetchCart]); // Using useCallback as suggested

  const isInCart = useCallback((noteId) => {
    return cart.some(item => item._id === noteId);
  }, [cart]);

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, loading, toggleCartItem, isInCart, fetchCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
