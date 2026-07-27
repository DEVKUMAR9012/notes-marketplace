import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2, FiShoppingCart, FiCreditCard, FiLock } from 'react-icons/fi';
import API from '../utils/api';
import PaymentButton from '../components/PaymentButton';
import { useAuth } from '../context/AuthContext';
import { useGuestGuard } from '../hooks/useGuestGuard';

export default function Cart() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const { user } = useAuth();
  const { guard } = useGuestGuard('checking out');

  const fetchCart = async () => {
    try {
      const res = await API.get('/profile/me');
      setProfile(res.data.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleRemove = async (noteId) => {
    try {
      await API.post('/profile/cart/toggle', { noteId });
      setProfile(prev => ({
        ...prev,
        cart: prev.cart.filter(n => n._id !== noteId)
      }));
    } catch (err) {
      alert("Failed to remove item");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-coral-500/40 border-t-coral-500 rounded-full animate-spin" />
      </div>
    );
  }

  const cart = profile?.cart || [];
  const total = cart.reduce((sum, n) => sum + (n.price || 0), 0);

  return (
    <div className="min-h-screen text-gray-900 pt-20 sm:pt-24 pb-8 sm:pb-12 px-3 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-black mb-6 sm:mb-8 flex items-center gap-3 text-gray-900">
          <FiShoppingCart style={{ color: 'var(--accent)' }} /> Your Cart
        </h1>

        {cart.length === 0 ? (
          <div className="text-center py-20 theme-card rounded-3xl">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-bold text-gray-800">Your cart is empty</h2>
            <p className="text-gray-500 mt-2">Looks like you haven't added any notes yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Items List */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              <AnimatePresence>
                {cart.map(note => (
                  <motion.div
                    key={note._id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center flex-wrap sm:flex-nowrap p-3 sm:p-4 theme-card rounded-2xl gap-3 sm:gap-4 hover:shadow-raised transition"
                  >
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-coral-400 to-amber-400 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-black text-xs">PDF</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{note.title}</h3>
                      <p className="text-sm text-gray-500 truncate">{note.subject}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-coral-600">₹{note.price}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(note._id)}
                      className="p-2 flex-shrink-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition ml-2"
                    >
                      <FiTrash2 />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="theme-card rounded-3xl p-5 sm:p-6 lg:sticky lg:top-24 shadow-raised">
                <h3 className="text-lg sm:text-xl font-black mb-4 border-b border-black/10 pb-4 text-gray-900">Summary</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-xs sm:text-sm text-gray-500">
                    <span>Items ({cart.length})</span>
                    <span>₹{total}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm text-gray-500">
                    <span>Discount</span>
                    <span className="text-emerald-600">₹0</span>
                  </div>
                  <div className="flex justify-between font-black text-base sm:text-lg pt-4 border-t border-black/10 text-gray-900">
                    <span>Total</span>
                    <span className="text-coral-600">₹{total}</span>
                  </div>
                </div>

                {checkoutMode ? (
                  <PaymentButton
                    note={{ title: `Cart Checkout (${cart.length} items)`, price: total }}
                    noteIds={cart.map(c => c._id)}
                    user={user}
                    onSuccess={() => {
                      setCheckoutMode(false);
                      fetchCart();
                      alert("Checkout successful! View your purchased notes in Profile.");
                    }}
                    className="w-full py-2.5 sm:py-3 text-xs sm:text-sm font-bold justify-center min-h-[44px]"
                  />
                ) : (
                  <button
                    onClick={() => guard(() => setCheckoutMode(true))}
                    className="w-full btn-accent text-white font-bold py-2.5 sm:py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg text-sm sm:text-base min-h-[44px]"
                  >
                    <FiCreditCard /> Checkout Now
                  </button>
                )}

                <p className="text-[10px] sm:text-xs text-center text-gray-500 mt-4 flex items-center justify-center gap-1">
                  <FiLock /> Secure payment via Razorpay
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

