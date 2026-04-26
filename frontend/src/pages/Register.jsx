import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API, { warmupServer } from '../utils/api';
import {
  FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiUserPlus,
  FiHome, FiKey, FiArrowLeft, FiPhone, FiSmartphone
} from 'react-icons/fi';

export default function Register() {
  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
  const [step, setStep] = useState(1);

  // Email form
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', college: '' });
  const [otp, setOtp] = useState('');

  // Phone form (simple - no OTP)
  const [phoneData, setPhoneData] = useState({ name: '', phone: '', college: '' });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();
  const otpInputRef = useRef(null);

  useEffect(() => { warmupServer(); }, []);

  useEffect(() => {
    if (step === 2 && otpInputRef.current) otpInputRef.current.focus();
  }, [step]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) timer = setInterval(() => setResendCooldown(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const calcStrength = (pwd) => {
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) s++;
    return s;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'email' ? value.trim() : value }));
    if (error) setError('');
    if (name === 'password') setPasswordStrength(calcStrength(value));
  };

  const handlePhoneDataChange = (e) => {
    const { name, value } = e.target;
    // Only allow digits for phone field
    const val = name === 'phone' ? value.replace(/[^0-9+\- ]/g, '') : value;
    setPhoneData(prev => ({ ...prev, [name]: val }));
    if (error) setError('');
  };

  const retryWithBackoff = async (fn, maxAttempts = 3) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        setRetryAttempt(attempt + 1);
        if (attempt > 0) {
          setRetrying(true);
          await new Promise(r => setTimeout(r, Math.min(2000 * Math.pow(2, attempt - 1), 10000)));
        }
        return await fn();
      } catch (err) {
        if (attempt === maxAttempts - 1) throw err;
      }
    }
  };

  // ── EMAIL FLOW ──────────────────────────────────────────
  const handleEmailRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
    if (formData.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true); setError(''); setRetryAttempt(0);
    try {
      await retryWithBackoff(() => API.post('/auth/register', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        college: formData.college.trim()
      }));
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally { setLoading(false); setRetrying(false); setRetryAttempt(0); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return setError('Please enter a 6-digit code');
    setLoading(true); setError(''); setRetryAttempt(0);
    try {
      const { data } = await retryWithBackoff(() => API.post('/auth/verify-email', { email: formData.email.trim(), otp }));
      login(data); navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Verification failed');
    } finally { setLoading(false); setRetrying(false); setRetryAttempt(0); }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true); setError('');
    try {
      await retryWithBackoff(() => API.post('/auth/resend-otp', { email: formData.email.trim() }), 2);
      setResendCooldown(30);
    } catch (err) { setError(err.response?.data?.message || 'Failed to resend code'); }
    finally { setLoading(false); setRetrying(false); }
  };

  // ── PHONE FLOW (no OTP, direct login) ───────────────────
  const handlePhoneRegister = async (e) => {
    e.preventDefault();
    if (!phoneData.name.trim()) return setError('Please enter your name');
    const cleanPhone = phoneData.phone.replace(/\s/g, '');
    if (cleanPhone.length < 10) return setError('Please enter a valid phone number');
    setLoading(true); setError(''); setRetryAttempt(0);
    try {
      const { data } = await retryWithBackoff(() => API.post('/auth/phone-register', {
        name: phoneData.name.trim(),
        phone: cleanPhone,
        college: phoneData.college.trim()
      }));
      login(data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally { setLoading(false); setRetrying(false); setRetryAttempt(0); }
  };

  const goBack = () => { setStep(1); setOtp(''); setError(''); setResendCooldown(0); };
  const switchMethod = (m) => { setAuthMethod(m); setError(''); setStep(1); };

  return (
    <div className="min-h-screen bg-[#07070f] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-800/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-fuchsia-800/12 rounded-full blur-[120px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-md w-full relative z-10">
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <FiUserPlus className="text-2xl text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">Create Account</h2>
            <p className="text-gray-400 mt-1 text-sm">Join Notes Marketplace</p>
          </div>

          {/* Toggle — only show on step 1 */}
          {step === 1 && (
            <div className="flex bg-gray-950/60 p-1 rounded-xl mb-6 border border-white/5">
              <button type="button" onClick={() => switchMethod('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${authMethod === 'email' ? 'bg-violet-600/80 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                <FiMail size={14} /> Email
              </button>
              <button type="button" onClick={() => switchMethod('phone')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${authMethod === 'phone' ? 'bg-violet-600/80 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                <FiPhone size={14} /> Phone
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-4 text-sm text-center">
              {error}
              {retrying && <div className="mt-1 text-xs text-gray-400">Retrying... ({retryAttempt}/3)</div>}
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ═══ PHONE FLOW ═══ */}
            {authMethod === 'phone' && (
              <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-5 text-center">
                  <FiSmartphone className="inline mr-2 text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-medium">No OTP needed — enter your name & phone and get in! ✅</span>
                </div>

                <form onSubmit={handlePhoneRegister} className="space-y-4">
                  <div className="relative">
                    <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" name="name" value={phoneData.name} onChange={handlePhoneDataChange}
                      disabled={loading} required
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                      placeholder="Full Name" />
                  </div>

                  <div className="relative">
                    <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="tel" name="phone" value={phoneData.phone} onChange={handlePhoneDataChange}
                      disabled={loading} required maxLength={13}
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                      placeholder="+91 9876543210" />
                  </div>

                  <div className="relative">
                    <FiHome className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" name="college" value={phoneData.college} onChange={handlePhoneDataChange}
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                      placeholder="College (Optional)" />
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-xl font-bold shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2">
                    {loading ? 'Please wait...' : <><FiPhone size={16}/> Enter Website</>}
                  </button>
                </form>

                <p className="text-center text-gray-400 mt-5 text-sm">
                  Already have an account? <Link to="/login" className="text-white font-bold hover:text-violet-400 transition-colors">Sign in</Link>
                </p>
              </motion.div>
            )}

            {/* ═══ EMAIL FLOW - Step 1 ═══ */}
            {authMethod === 'email' && step === 1 && (
              <motion.div key="email-step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <form onSubmit={handleEmailRegister} className="space-y-4">
                  <div className="relative">
                    <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" name="name" value={formData.name} onChange={handleChange} disabled={loading}
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                      placeholder="Full Name" required />
                  </div>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={loading}
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                      placeholder="Email Address" required />
                  </div>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} disabled={loading}
                      className="w-full pl-10 pr-12 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                      placeholder="Password" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                  {formData.password.length > 0 && (
                    <div className="flex gap-1">
                      <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength >= 1 ? 'bg-green-500' : 'bg-gray-700'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength >= 2 ? 'bg-green-500' : 'bg-gray-700'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength >= 3 ? 'bg-green-500' : 'bg-gray-700'}`} />
                    </div>
                  )}
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type={showPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} disabled={loading}
                      className="w-full pl-10 pr-12 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                      placeholder="Confirm Password" required />
                  </div>
                  <div className="relative">
                    <FiHome className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" name="college" value={formData.college} onChange={handleChange} disabled={loading}
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                      placeholder="College (Optional)" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-xl font-bold shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all disabled:opacity-50 mt-2">
                    {loading ? (retrying ? `Retrying... ${retryAttempt}/3` : 'Processing...') : 'Continue →'}
                  </button>
                </form>
                <p className="text-center text-gray-400 mt-5 text-sm">
                  Already have an account? <Link to="/login" className="text-white font-bold hover:text-violet-400 transition-colors">Sign in</Link>
                </p>
              </motion.div>
            )}

            {/* ═══ EMAIL FLOW - Step 2 (OTP) ═══ */}
            {authMethod === 'email' && step === 2 && (
              <motion.div key="email-step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <FiKey className="text-2xl text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Check Your Email</h3>
                  <p className="text-gray-400 mt-2 text-sm">
                    We sent a 6-digit code to<br />
                    <span className="text-white font-medium">{formData.email}</span>
                  </p>
                </div>
                <form onSubmit={handleVerify} className="space-y-6">
                  <input ref={otpInputRef} type="text" inputMode="numeric" maxLength={6} value={otp}
                    onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); if (error) setError(''); }}
                    disabled={loading}
                    className="w-full text-center font-mono text-2xl py-4 bg-gray-950/50 border border-emerald-500/30 rounded-xl text-emerald-400 placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 tracking-widest"
                    placeholder="000000" required />
                  <button type="submit" disabled={loading || otp.length !== 6}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all disabled:opacity-50">
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </button>
                  <div className="flex justify-between items-center">
                    <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
                      <FiArrowLeft size={14} /> Back
                    </button>
                    <button type="button" onClick={handleResendOtp} disabled={resendCooldown > 0 || loading} className="text-sm text-gray-400 hover:text-white disabled:opacity-50 transition-colors">
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
