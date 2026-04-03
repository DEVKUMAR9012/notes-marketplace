import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2, FiShoppingCart, FiCreditCard, FiLock } from 'react-icons/fi';
import API from '../utils/api';
import PaymentButton from '../components/PaymentButton';
import { useAuth } from '../context/AuthContext';

export default function Cart() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const { user } = useAuth();
  
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
      const res = await API.post('/profile/cart/toggle', { noteId });
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
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  const cart = profile?.cart || [];
  const total = cart.reduce((sum, n) => sum + (n.price || 0), 0);

  return (
    <div className="min-h-screen bg-[#07070f] text-white pt-24 pb-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-8 flex items-center gap-3">
          <FiShoppingCart className="text-violet-500" /> Your Cart
        </h1>

        {cart.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-bold text-gray-300">Your cart is empty</h2>
            <p className="text-gray-500 mt-2">Looks like you haven't added any notes yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items List */}
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence>
                {cart.map(note => (
                  <motion.div
                    key={note._id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center p-4 bg-white/5 border border-white/10 rounded-2xl gap-4 hover:bg-white/10 transition"
                  >
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-black text-xs">PDF</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{note.title}</h3>
                      <p className="text-sm text-gray-400 truncate">{note.subject}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-amber-400">₹{note.price}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(note._id)}
                      className="p-2 flex-shrink-0 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition ml-2"
                    >
                      <FiTrash2 />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Summary details */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-violet-900/30 to-fuchsia-900/30 border border-white/10 rounded-3xl p-6 sticky top-24">
                <h3 className="text-xl font-black mb-4 border-b border-white/10 pb-4">Summary</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Items ({cart.length})</span>
                    <span>₹{total}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Discount</span>
                    <span className="text-emerald-400">₹0</span>
                  </div>
                  <div className="flex justify-between font-black text-lg pt-4 border-t border-white/10">
                    <span>Total</span>
                    <span className="text-amber-400">₹{total}</span>
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
                    className="w-full py-3 text-sm font-bold justify-center"
                  />
                ) : (
                  <button
                    onClick={() => setCheckoutMode(true)}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-violet-500/20"
                  >
                    <FiCreditCard /> Checkout Now
                  </button>
                )}
                
                <p className="text-xs text-center text-gray-500 mt-4 flex items-center justify-center gap-1">
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
