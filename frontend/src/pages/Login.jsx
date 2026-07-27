import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API, { warmupServer } from '../utils/api';
import { FiMail, FiLock, FiEye, FiEyeOff, FiKey, FiArrowLeft } from 'react-icons/fi';
import NativeSocialLogins from '../components/NativeSocialLogins';
import AnimatedLogo from '../components/AnimatedLogo';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Login() {
  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
  const [step, setStep] = useState('login'); // 'login', 'forgot', 'reset'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  // Bug 2 fix: guard setState calls after component unmount
  const mountedRef = useRef(true);
  const successTimeoutRef = useRef(null);
  useEffect(() => () => { 
    mountedRef.current = false; 
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current); 
  }, []);

  const { login } = useAuth();
  const navigate = useNavigate();

  // ✅ WARM UP SERVER ON PAGE LOAD
  useEffect(() => {
    warmupServer();
  }, []);

  // ✅ RETRY HELPER WITH EXPONENTIAL BACKOFF
  const retryWithBackoff = async (fn, maxAttempts = 3) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        setRetryAttempt(attempt + 1);
        if (attempt > 0) {
          setRetrying(true);
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        return await fn();
      } catch (err) {
        if (attempt === maxAttempts - 1) {
          throw err;
        }
        // Continue to next attempt
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRetryAttempt(0);
    
    try {
      if (authMethod === 'email') {
        const { data } = await retryWithBackoff(async () => {
          return await API.post('/auth/login', { email, password });
        }, 3);
        login(data);
        navigate('/');
      } else {
        // Bug 3 fix: strip non-digits and country prefix before length check
        const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '').replace(/^0/, '');
        if (cleanPhone.length !== 10) {
          throw new Error('Please enter a valid 10-digit mobile number');
        }
        const { data } = await retryWithBackoff(async () => {
          return await API.post('/auth/phone-login', { phone: cleanPhone });
        }, 3);
        login(data);
        navigate('/');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMsg);
    } finally {
      setLoading(false);
      setRetrying(false);
      setRetryAttempt(0);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email first');
      return;
    }

    setLoading(true);
    setError('');
    setRetryAttempt(0);
    
    try {
      await retryWithBackoff(async () => {
        await API.post('/auth/forgot-password', { email });
      }, 2);
      setSuccess('Reset code sent to your email!');
      setStep('reset');
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Action failed';
      setError(errorMsg);
    } finally {
      setLoading(false);
      setRetrying(false);
      setRetryAttempt(0);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setRetryAttempt(0);
    
    try {
      await retryWithBackoff(async () => {
        await API.post('/auth/reset-password', { email, otp, newPassword });
      }, 3);
      setSuccess('Password reset successfully! You can now login.');
      setOtp('');
      setNewPassword('');
      setPassword('');
      setStep('login');
      // Bug 2 fix: guard against setState-after-unmount
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => { if (mountedRef.current) setSuccess(''); }, 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Reset failed';
      setError(errorMsg);
    } finally {
      setLoading(false);
      setRetrying(false);
      setRetryAttempt(0);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Lights */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none" style={{ background: 'rgba(249,123,91,0.12)' }} />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(16,185,129,0.10)' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="theme-card rounded-3xl shadow-raised p-8">
          
          <AnimatePresence mode="wait">
            {step === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-5 overflow-visible">
                    <AnimatedLogo size="large" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
                  <p className="text-gray-500 mt-2">Sign in to continue</p>
                </div>

                {success && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl mb-6 text-sm text-center">
                    {success}
                  </div>
                )}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-6 text-sm text-center">
                    {error}
                    {retrying && <div className="mt-2 text-xs text-gray-500">Retrying... (Attempt {retryAttempt}/3)</div>}
                  </div>
                )}

                {retrying && !error && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-600 p-3 rounded-xl mb-6 text-sm text-center">
                    Connecting to server... (Attempt {retryAttempt}/3)
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Toggle */}
                  <div className="flex p-1 rounded-xl mb-4 border" style={{ background: 'rgba(0,0,0,0.04)', borderColor: 'var(--border)' }}>
                    <button type="button" onClick={() => { setAuthMethod('email'); setError(''); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${authMethod === 'email' ? 'text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
                      style={authMethod === 'email' ? { background: 'var(--accent)' } : {}}>
                      <FiMail size={14} /> Email
                    </button>
                    <button type="button" onClick={() => { setAuthMethod('phone'); setError(''); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${authMethod === 'phone' ? 'text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
                      style={authMethod === 'phone' ? { background: 'var(--accent)' } : {}}>
                      <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> Phone
                    </button>
                  </div>

                  {authMethod === 'email' ? (
                    <>
                      <div className="relative">
                      <FiMail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3.5 rounded-xl transition-colors theme-input"
                        placeholder="Email Address"
                        aria-label="Email Address"
                        required
                      />
                    </div>

                    <div className="relative">
                      <FiLock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3.5 rounded-xl transition-colors theme-input"
                        placeholder="Password"
                        aria-label="Password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>

                    <div className="flex justify-end pt-1 pb-2">
                      <button
                        type="button"
                        onClick={() => { setError(''); setSuccess(''); setStep('forgot'); }}
                        className="text-sm font-medium transition-colors" style={{ color: 'var(--accent)' }}
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">+91</span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl transition-colors font-medium tracking-wider theme-input"
                        placeholder="10-digit mobile number"
                        aria-label="Mobile Number"
                        maxLength="10"
                        required
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 btn-accent"
                  >
                    {loading ? (retrying ? `Signing in... ${retryAttempt}/3` : 'Signing in...') : 'Sign In'}
                  </button>
                </form>

                <p className="text-center text-gray-500 mt-6 text-sm">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-bold transition-colors" style={{ color: 'var(--accent)' }}>
                    Sign up
                  </Link>
                </p>

                {/* ── Google Sign-In ─────────────────────────────────── */}
                <div className="flex items-center gap-3 mt-6">
                  <div className="flex-1 h-px" style={{ background: 'var(--border-strong)' }} />
                  <span className="text-xs text-gray-400 font-medium tracking-widest uppercase">Or continue with</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border-strong)' }} />
                </div>
                <div className="mt-3">
                  <GoogleSignInButton label="Continue with Google" redirectTo="/" />
                </div>

                {/* Keep the invisible One-Tap overlay for auto-prompt */}
                <NativeSocialLogins />

              </motion.div>
            ) : step === 'forgot' ? (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-tr from-orange-400 to-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <FiKey className="text-2xl text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
                  <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                    Enter your email address and we'll send you a 6-digit code to reset your password.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-6 text-sm text-center">
                    {error}
                    {retrying && <div className="mt-2 text-xs text-gray-400">Retrying... (Attempt {retryAttempt}/3)</div>}
                  </div>
                )}

                {retrying && !error && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-600 p-3 rounded-xl mb-6 text-sm text-center">
                    Sending reset code... (Attempt {retryAttempt}/3)
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 rounded-xl transition-colors theme-input"
                      placeholder="Enter your email"
                      aria-label="Email for password reset"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 mt-2 btn-accent"
                  >
                    {loading ? (retrying ? `Sending... ${retryAttempt}/3` : 'Sending...') : 'Send Reset Code'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => { setError(''); setOtp(''); setNewPassword(''); setStep('login'); }}
                    className="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiArrowLeft /> Back to login
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <FiLock className="text-2xl text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Create New Password</h2>
                  <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                    We sent a code to <span className="text-gray-800 font-medium">{email}</span>
                  </p>
                </div>

                {success && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl mb-6 text-sm text-center">
                    {success}
                  </div>
                )}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-6 text-sm text-center">
                    {error}
                    {retrying && <div className="mt-2 text-xs text-gray-400">Retrying... (Attempt {retryAttempt}/3)</div>}
                  </div>
                )}

                {retrying && !error && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-600 p-3 rounded-xl mb-6 text-sm text-center">
                    Resetting password... (Attempt {retryAttempt}/3)
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      maxLength="6"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-widest font-mono text-xl py-3.5 rounded-xl border text-emerald-600 placeholder-gray-300 focus:outline-none transition-colors"
                      style={{ background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(16,185,129,0.4)' }}
                      placeholder="------"
                      aria-label="6-digit reset code"
                      required
                    />
                  </div>

                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3.5 rounded-xl transition-colors theme-input"
                      placeholder="New Password (min 6 chars)"
                      aria-label="New Password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6 || newPassword.length < 6}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 mt-2"
                  >
                    {loading ? (retrying ? `Resetting... ${retryAttempt}/3` : 'Resetting...') : 'Reset Password'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => { setError(''); setOtp(''); setNewPassword(''); setStep('login'); }}
                    className="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiArrowLeft /> Cancel
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </div>
  );
}