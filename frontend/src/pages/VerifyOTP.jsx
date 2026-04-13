import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FiKey, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef(null);

  // Get email from navigation state (secure, not stored in localStorage)
  useEffect(() => {
    const stateEmail = location.state?.email;
    if (stateEmail) {
      setEmail(stateEmail);
    } else {
      // Fallback: try sessionStorage (clears on tab close)
      const storedEmail = sessionStorage.getItem('pendingVerificationEmail');
      if (storedEmail) {
        setEmail(storedEmail);
      } else {
        // No email – redirect to register
        navigate('/register');
      }
    }
    // Auto-focus OTP input
    if (inputRef.current) inputRef.current.focus();
  }, [location, navigate]);

  // Save email to sessionStorage for page refresh resilience
  useEffect(() => {
    if (email) {
      sessionStorage.setItem('pendingVerificationEmail', email);
    }
  }, [email]);

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    if (error) setError('');
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await API.post('/auth/verify-email', {
        email,
        otp
      });
      // After successful verification, log the user in (as in Register component)
      login(data); // data should contain user info and token
      sessionStorage.removeItem('pendingVerificationEmail');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      await API.post('/auth/resend-otp', { email });
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

  const handleBackToSignup = () => {
    sessionStorage.removeItem('pendingVerificationEmail');
    navigate('/register');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <FiKey className="text-2xl text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white text-center mb-2">
            Verify Email
          </h2>
          <p className="text-gray-400 text-center text-sm mb-6">
            We sent a 6-digit code to<br />
            <span className="text-white font-medium">{email}</span>
          </p>

          {error && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-400 p-4 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                maxLength="6"
                value={otp}
                onChange={handleOtpChange}
                disabled={loading}
                className={`w-full text-center tracking-[0.5em] font-mono text-3xl py-4 bg-gray-950/50 border-2 rounded-xl text-emerald-400 placeholder-gray-600 focus:outline-none transition-colors disabled:opacity-50 ${error ? 'border-red-500' : 'border-emerald-500/30 focus:border-emerald-500'
                  }`}
                placeholder="000000"
                required
              />
              <p className="text-gray-500 text-xs mt-2 text-center">
                Enter the 6-digit code
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-emerald-500/50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify & Login'
              )}
            </button>
          </form>

          <div className="flex justify-between items-center mt-4">
            <button
              type="button"
              onClick={handleBackToSignup}
              className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
            >
              <FiArrowLeft size={16} />
              Back to signup
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || loading}
              className="text-gray-400 hover:text-white disabled:opacity-50 flex items-center gap-1 transition-colors"
            >
              <FiRefreshCw size={14} className={resendCooldown > 0 ? 'animate-spin' : ''} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-blue-400 text-xs text-center">
              💡 Didn't receive the code? Check your spam folder or{' '}
              <button onClick={handleResendOtp} disabled={resendCooldown > 0} className="underline hover:text-white">
                click here to resend
              </button>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;