import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import {
  FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiUserPlus,
  FiHome, FiKey, FiArrowLeft
} from 'react-icons/fi';

export default function Register() {
  const [step, setStep] = useState(1); // 1 = Details, 2 = Verify OTP
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    college: ''
  });
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0=weak,1=medium,2=strong

  const { login } = useAuth();
  const navigate = useNavigate();
  const otpInputRef = useRef(null);

  // Auto-focus OTP field when step 2 becomes active
  useEffect(() => {
    if (step === 2 && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  // Password strength calculator
  const calculateStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');

    if (name === 'password') {
      setPasswordStrength(calculateStrength(value));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await API.post('/auth/register', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        college: formData.college.trim()
      });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await API.post('/auth/verify-email', {
        email: formData.email.trim(),
        otp
      });
      login(data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      await API.post('/auth/resend-otp', { email: formData.email.trim() });
      setResendCooldown(30);
      const timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      setTimeout(() => clearInterval(timer), 30000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    if (error) setError('');
  };

  const goBackToStep1 = () => {
    setStep(1);
    setOtp('');       // reset OTP field
    setError('');
    setResendCooldown(0); // reset cooldown if any
  };

  // Helper to disable all inputs during loading
  const isFormDisabled = loading;

  return (
    <div className="min-h-screen bg-[#07070f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Lights */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-800/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-fuchsia-800/12 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10">

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <FiUserPlus className="text-2xl text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white">Create Account</h2>
                  <p className="text-gray-400 mt-2">Join Notes Marketplace</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center" role="status">
                    {error}
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="relative">
                    <FiUser className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={isFormDisabled}
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                      placeholder="Full Name"
                      required
                    />
                  </div>

                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={isFormDisabled}
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                      placeholder="Email Address"
                      required
                    />
                  </div>

                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={isFormDisabled}
                      className="w-full pl-10 pr-12 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                      placeholder="Password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>

                  {/* Optional: Password strength indicator */}
                  {formData.password.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength >= 1 ? 'bg-green-500' : 'bg-gray-700'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength >= 2 ? 'bg-green-500' : 'bg-gray-700'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength >= 3 ? 'bg-green-500' : 'bg-gray-700'}`} />
                    </div>
                  )}

                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={isFormDisabled}
                      className="w-full pl-10 pr-12 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                      placeholder="Confirm Password"
                      required
                    />
                  </div>

                  <div className="relative">
                    <FiHome className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      name="college"
                      value={formData.college}
                      onChange={handleChange}
                      disabled={isFormDisabled}
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50"
                      placeholder="College (Optional)"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-xl font-bold shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all disabled:opacity-50 mt-4"
                  >
                    {loading ? 'Processing...' : 'Continue'}
                  </button>
                </form>

                <p className="text-center text-gray-400 mt-6 text-sm">
                  Already have an account?{' '}
                  <Link to="/login" className="text-white font-bold hover:text-violet-400 transition-colors">
                    Sign in here
                  </Link>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <FiKey className="text-2xl text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white">Check Your Email</h2>
                  <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                    We sent a 6-digit verification code to<br />
                    <span className="text-white font-medium">{formData.email}</span>
                  </p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center" role="status">
                    {error}
                  </div>
                )}

                <form onSubmit={handleVerify} className="space-y-6">
                  <div className="relative">
                    <input
                      ref={otpInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={6}
                      value={otp}
                      onChange={handleOtpChange}
                      disabled={isFormDisabled}
                      className="w-full text-center tracking-[1em] font-mono text-2xl py-4 bg-gray-950/50 border border-emerald-500/30 rounded-xl text-emerald-400 placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                      placeholder="000000"
                      aria-label="Verification code"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </button>

                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={goBackToStep1}
                      className="flex items-center gap-1 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    >
                      <FiArrowLeft size={14} /> Back
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || loading}
                      className="text-sm text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                    >
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