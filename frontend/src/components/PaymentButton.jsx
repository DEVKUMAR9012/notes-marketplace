import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiCheck, FiShoppingCart } from 'react-icons/fi';
import API from '../utils/api';

// Load Razorpay script
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const SuccessOverlay = ({ note, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
  >
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.7, opacity: 0 }}
      className="bg-gray-950 border border-emerald-500/40 rounded-3xl p-8 max-w-sm w-full text-center"
    >
      <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-5">
        <FiCheck className="text-4xl text-emerald-400" />
      </div>
      <h2 className="text-2xl font-black text-white mb-2">Payment Success! 🎉</h2>
      <p className="text-gray-400 text-sm mb-6">
        <span className="text-white font-medium">{note?.title}</span> has been unlocked for you!
      </p>
      <div className="flex flex-col gap-3">
        <a
          href={`http://localhost:5000${note?.pdfUrl}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-semibold transition"
        >
          <FiDownload /> Download Now
        </a>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-sm transition">
          Close
        </button>
      </div>
    </motion.div>
  </motion.div>
);

export default function PaymentButton({ note, noteIds, user, onSuccess, className = '' }) {
  const [loading, setLoading] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Free note
  if (!note || note.price === 0) {
    return (
      <motion.a
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        href={`http://localhost:5000${note?.pdfUrl}`}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 rounded-xl text-white text-sm font-semibold transition-all shadow-lg ${className}`}
      >
        <FiDownload /> Get Free
      </motion.a>
    );
  }

  const handlePay = async () => {
    if (!user) return alert('Please login to purchase notes');
    setLoading(true);

    try {
      const loaded = await loadRazorpay();
      if (!loaded) return alert('Razorpay failed to load. Check your internet connection.');

      const { data } = await API.post('/payments/create-order', { 
        noteId: noteIds ? undefined : note._id,
        noteIds: noteIds || undefined
      });

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'Notes Marketplace',
        description: data.title || data.note?.title || note.title,
        order_id: data.orderId,
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: { color: '#7c3aed' },
        modal: { ondismiss: () => setLoading(false) },
        handler: async (response) => {
          try {
            const verifyRes = await API.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              processedIds: data.processedIds
            });

            if (verifyRes.data.success) {
              setIsPurchased(true);
              setSuccessData({ ...note, pdfUrl: verifyRes.data.pdfUrl });
              onSuccess?.({ pdfUrl: verifyRes.data.pdfUrl });
            }
          } catch (err) {
            alert('Payment verification failed. Contact support with payment ID: ' + response.razorpay_payment_id);
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (res) => {
        alert('Payment failed: ' + res.error.description);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  if (isPurchased) {
    return (
      <motion.a
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        href={`http://localhost:5000${successData?.pdfUrl}`}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl text-white text-sm font-semibold ${className}`}
      >
        <FiCheck /> Download
      </motion.a>
    );
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handlePay}
        disabled={loading}
        className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl text-white text-sm font-semibold transition-all shadow-lg disabled:opacity-60 ${className}`}
      >
        {loading ? (
          <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing...</>
        ) : (
          <><FiShoppingCart /> Buy ₹{note.price}</>
        )}
      </motion.button>
      <AnimatePresence>
        {successData && <SuccessOverlay note={successData} onClose={() => setSuccessData(null)} />}
      </AnimatePresence>
    </>
  );
}