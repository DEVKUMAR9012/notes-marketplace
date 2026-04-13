import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { FiKey, FiArrowLeft } from 'react-icons/fi';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get email from localStorage (set during registration)
    const storedEmail = localStorage.getItem('registerEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // If no email, redirect to register
      navigate('/register');
    }
  }, [navigate]);

  const handleOtpChange = (e) => {
    // Only allow numbers, max 6 digits
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    setError('');
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await API.post('/api/auth/verify-email', {
        email,
        otp
      });

      if (response.data.success) {
        setSuccess('✅ Email verified successfully!');
        localStorage.removeItem('registerEmail');

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login', { state: { email } });
        }, 2000);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'OTP verification failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignup = () => {
    localStorage.removeItem('registerEmail');
    navigate('/register');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <FiKey className="text-2xl text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-white text-center mb-2">
            Verify Email
          </h2>
          <p className="text-gray-400 text-center text-sm mb-6">
            We sent a 6-digit code to<br />
            <span className="text-white font-medium">{email}</span>
          </p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-400 p-4 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl mb-4 text-sm">
              {success}
            </div>
          )}

          {/* OTP Form */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                maxLength="6"
                placeholder="------"
                value={otp}
                onChange={handleOtpChange}
                className="w-full text-center tracking-[0.5em] font-mono text-3xl py-4 bg-gray-950/50 border-2 border-emerald-500/30 rounded-xl text-emerald-400 placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
              <p className="text-gray-500 text-xs mt-2 text-center">
                Enter the 6-digit code
              </p>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-emerald-500/50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Verifying...
                </span>
              ) : (
                'Verify & Login'
              )}
            </button>
          </form>

          {/* Back to Signup */}
          <button
            type="button"
            onClick={handleBackToSignup}
            className="w-full mt-4 py-3 text-gray-400 hover:text-white flex items-center justify-center gap-2 transition-colors"
          >
            <FiArrowLeft size={16} />
            Back to signup
          </button>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-blue-400 text-xs text-center">
              💡 Didn't receive the code? Check your spam folder or try signing up again.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;