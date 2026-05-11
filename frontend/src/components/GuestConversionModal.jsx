import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import {
  FiX, FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiKey,
  FiArrowRight, FiShield, FiGift,
} from 'react-icons/fi';


// Lightweight confetti burst
const ConfettiBurst = () => {
  const colors = ['#8b5cf6', '#a78bfa', '#22c55e', '#f59e0b', '#ec4899', '#38bdf8'];
  return (
    <div className="pointer-events-none fixed inset-0 z-[300] overflow-hidden">
      {[...Array(30)].map((_, i) => {
        const color = colors[i % colors.length];
        const x = `${Math.random() * 100}vw`;
        const delay = Math.random() * 0.6;
        const size = 6 + Math.random() * 8;
        return (
          <motion.div
            key={i}
            style={{ left: x, top: '-10px', width: size, height: size, backgroundColor: color, borderRadius: Math.random() > 0.5 ? '50%' : '2px' }}
            animate={{ y: '110vh', rotate: Math.random() * 720 - 360, opacity: [1, 1, 0] }}
            transition={{ duration: 2 + Math.random(), delay, ease: 'easeIn' }}
          />
        );
      })}
    </div>
  );
};

export default function GuestConversionModal({ isOpen, onClose, triggerReason = 'this action' }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'success'
  const [formData, setFormData] = useState({ name: '', email: '', password: '', college: '' });
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setFormData({ name: '', email: '', password: '', college: '' });
      setOtp('');
      setError('');
    }
  }, [isOpen]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  // Step 1: Submit registration form → convert guest
  const handleConvert = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true); setError('');
    try {
      await API.post('/auth/convert-guest', {
        guestId: user?._id,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        college: formData.college.trim(),
      });
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return setError('Enter the 6-digit code from your email');

    setLoading(true); setError('');
    try {
      const { data } = await API.post('/auth/verify-email', {
        email: formData.email.trim().toLowerCase(),
        otp,
      });
      login(data);
      setStep('success');
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        onClose();
        navigate('/profile');
      }, 2800);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen && !showConfetti) return null;

  return (
    <>
      {showConfetti && <ConfettiBurst />}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={(e) => e.target === e.currentTarget && onClose()}
          >
            <motion.div
              initial={{ scale: 0.85, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="w-full max-w-md bg-[#0c0c18] border border-violet-500/20 rounded-3xl shadow-2xl shadow-violet-900/30 overflow-hidden"
            >
              {/* Glow accent */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent" />

              <div className="p-7">
                {/* Close */}
                <button
                  onClick={onClose}
                  className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-white/10 text-gray-500 hover:text-white transition"
                >
                  <FiX size={16} />
                </button>

                {/* ─── SUCCESS ─── */}
                {step === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4 py-6 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-violet-600 to-emerald-500 flex items-center justify-center shadow-2xl shadow-violet-900/50">
                      <FiGift size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white">Welcome Aboard! 🎉</h2>
                    <p className="text-gray-400 text-sm">Your cart & activity are safe. Redirecting to your profile...</p>
                    <div className="w-full bg-white/5 rounded-full h-1.5 mt-2 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-violet-500 to-emerald-400"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2.8 }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* ─── OTP STEP ─── */}
                {step === 'otp' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="flex flex-col items-center gap-3 mb-6 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <FiKey size={24} className="text-emerald-400" />
                      </div>
                      <h2 className="text-xl font-bold text-white">Verify Your Email</h2>
                      <p className="text-gray-400 text-sm">
                        We sent a 6-digit code to <span className="text-white font-medium">{formData.email}</span>
                      </p>
                    </div>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-4 text-sm text-center">
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleVerify} className="space-y-4">
                      <input
                        type="text" inputMode="numeric" maxLength={6}
                        value={otp}
                        onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); if (error) setError(''); }}
                        className="w-full text-center font-mono text-3xl py-4 bg-white/5 border border-emerald-500/30 rounded-2xl text-emerald-400 placeholder-gray-700 focus:outline-none focus:border-emerald-500 tracking-widest transition"
                        placeholder="000000"
                        required
                      />
                      <button
                        type="submit" disabled={loading || otp.length !== 6}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? 'Verifying...' : <><FiShield size={16} /> Claim My Account</>}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* ─── FORM STEP ─── */}
                {step === 'form' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {/* Header */}
                    <div className="flex flex-col items-center gap-2 mb-6 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
                        <FiLock size={24} className="text-white" />
                      </div>
                      <h2 className="text-xl font-extrabold text-white">Secure Your Work!</h2>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        Create a secure account to continue <span className="text-violet-400 font-semibold">{triggerReason}</span>.
                        <br />Your cart &amp; activity will be linked permanently. 🔒
                      </p>
                    </div>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-4 text-sm text-center">
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleConvert} className="space-y-3">
                      <div className="relative">
                        <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                        <input
                          type="text" name="name" value={formData.name} onChange={handleChange}
                          placeholder="Full Name" required
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition"
                        />
                      </div>
                      <div className="relative">
                        <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                        <input
                          type="email" name="email" value={formData.email} onChange={handleChange}
                          placeholder="Email Address" required
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition"
                        />
                      </div>
                      <div className="relative">
                        <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                        <input
                          type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                          placeholder="Create Password (min 6 chars)" required
                          className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition">
                          {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="text" name="college" value={formData.college} onChange={handleChange}
                          placeholder="College (Optional)"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition"
                        />
                      </div>

                      <button
                        type="submit" disabled={loading}
                        className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-violet-900/40 hover:shadow-violet-900/60 hover:from-violet-500 hover:to-fuchsia-500 transition-all disabled:opacity-50 mt-1 flex items-center justify-center gap-2"
                      >
                        {loading ? 'Creating Account...' : <><FiArrowRight size={16} /> Create Account & Continue</>}
                      </button>
                    </form>

                    <p className="text-center text-xs text-gray-600 mt-4">
                      Already have an account?{' '}
                      <button onClick={() => { onClose(); navigate('/login'); }} className="text-violet-400 hover:text-violet-300 font-medium transition">
                        Sign in
                      </button>
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
