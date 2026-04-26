import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API, { warmupServer } from '../utils/api';
import { FiMail, FiLock, FiEye, FiEyeOff, FiKey } from 'react-icons/fi';

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
        // Phone login
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+91/, '');
        if (cleanPhone.length < 10) {
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
      setPassword('');
      setStep('login');
      setTimeout(() => setSuccess(''), 3000);
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
    <div className="min-h-screen bg-[#07070f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Lights */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-800/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-800/12 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10">
          
          <AnimatePresence mode="wait">
            {step === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl font-bold text-white">NM</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
                  <p className="text-gray-400 mt-2">Sign in to continue</p>
                </div>

                {success && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl mb-6 text-sm text-center">
                    {success}
                  </div>
                )}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center">
                    {error}
                    {retrying && <div className="mt-2 text-xs text-gray-300">Retrying... (Attempt {retryAttempt}/3)</div>}
                  </div>
                )}

                {retrying && !error && (
                  <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-3 rounded-xl mb-6 text-sm text-center">
                    Connecting to server... (Attempt {retryAttempt}/3)
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Toggle */}
                  <div className="flex bg-gray-950/60 p-1 rounded-xl mb-4 border border-white/5">
                    <button type="button" onClick={() => { setAuthMethod('email'); setError(''); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${authMethod === 'email' ? 'bg-blue-600/80 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                      <FiMail size={14} /> Email
                    </button>
                    <button type="button" onClick={() => { setAuthMethod('phone'); setError(''); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${authMethod === 'phone' ? 'bg-blue-600/80 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                      <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> Phone
                    </button>
                  </div>

                  {authMethod === 'email' ? (
                    <>
                      <div className="relative">
                        <FiMail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                          placeholder="Email Address"
                          required
                        />
                      </div>

                      <div className="relative">
                        <FiLock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                          placeholder="Password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                          {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                        </button>
                      </div>

                      <div className="flex justify-end pt-1 pb-2">
                        <button
                          type="button"
                          onClick={() => { setError(''); setSuccess(''); setStep('forgot'); }}
                          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">+91</span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="10-digit mobile number"
                        maxLength="10"
                        required
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all disabled:opacity-50"
                  >
                    {loading ? (retrying ? `Signing in... ${retryAttempt}/3` : 'Signing in...') : 'Sign In'}
                  </button>
                </form>

                <p className="text-center text-gray-400 mt-6 text-sm">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-white font-bold hover:text-blue-400 transition-colors">
                    Sign up
                  </Link>
                </p>
              </motion.div>
            ) : step === 'forgot' ? (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <FiKey className="text-2xl text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                  <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                    Enter your email address and we'll send you a 6-digit code to reset your password.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center">
                    {error}
                    {retrying && <div className="mt-2 text-xs text-gray-300">Retrying... (Attempt {retryAttempt}/3)</div>}
                  </div>
                )}

                {retrying && !error && (
                  <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-3 rounded-xl mb-6 text-sm text-center">
                    Sending reset code... (Attempt {retryAttempt}/3)
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full bg-gradient-to-r from-orange-500 to-rose-600 text-white py-4 rounded-xl font-bold shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:shadow-[0_0_25px_rgba(244,63,94,0.5)] transition-all disabled:opacity-50 mt-2"
                  >
                    {loading ? (retrying ? `Sending... ${retryAttempt}/3` : 'Sending...') : 'Send Reset Code'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => { setError(''); setStep('login'); }}
                    className="w-full py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    ← Back to login
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
                  <h2 className="text-2xl font-bold text-white">Create New Password</h2>
                  <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                    We sent a code to <span className="text-white font-medium">{email}</span>
                  </p>
                </div>

                {success && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl mb-6 text-sm text-center">
                    {success}
                  </div>
                )}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center">
                    {error}
                    {retrying && <div className="mt-2 text-xs text-gray-300">Retrying... (Attempt {retryAttempt}/3)</div>}
                  </div>
                )}

                {retrying && !error && (
                  <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-3 rounded-xl mb-6 text-sm text-center">
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
                      className="w-full text-center tracking-[1em] font-mono text-xl py-3.5 bg-gray-950/50 border border-emerald-500/30 rounded-xl text-emerald-400 placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="------"
                      required
                    />
                  </div>

                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="New Password (min 6 chars)"
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

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6 || newPassword.length < 6}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all disabled:opacity-50 mt-2"
                  >
                    {loading ? (retrying ? `Resetting... ${retryAttempt}/3` : 'Resetting...') : 'Reset Password'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => { setError(''); setStep('login'); }}
                    className="w-full py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    ← Cancel
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