import { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCart = async () => {
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
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const toggleCartItem = async (noteId) => {
    try {
      const res = await API.post('/profile/cart/toggle', { noteId });
      // The toggle endpoint returns the new cart array/message
      // Re-fetch or manually update to ensure consistency
      fetchCart(); 
      return res.data.message;
    } catch (err) {
      console.error('Toggle cart error:', err);
      throw err;
    }
  };

  const isInCart = (noteId) => {
    return cart.some(item => item._id === noteId);
  };

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
