import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheckCircle,
  FiAward,
  FiDollarSign,
  FiShield,
  FiArrowRight,
  FiArrowLeft,
  FiLock,
  FiTrendingUp,
  FiUserCheck
} from 'react-icons/fi';
import { BsStars } from 'react-icons/bs';

export default function SellerOnboard() {
  const { user, updateUser, isGuest } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    collegeName: user?.collegeName || user?.college || '',
    course: user?.sellerProfile?.course || '',
    branch: user?.sellerProfile?.branch || '',
    year: user?.sellerProfile?.year || '2nd Year',
    bio: user?.bio || '',
    upiId: user?.sellerProfile?.upiId || '',
    agreeTerms: true
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        collegeName: prev.collegeName || user.collegeName || user.college || '',
        bio: prev.bio || user.bio || '',
        course: prev.course || user.sellerProfile?.course || '',
        branch: prev.branch || user.sellerProfile?.branch || '',
        year: prev.year || user.sellerProfile?.year || '2nd Year',
        upiId: prev.upiId || user.sellerProfile?.upiId || ''
      }));
    }
  }, [user]);

  // If already active seller, prompt to go to dashboard
  const isAlreadySeller = user?.role === 'seller' && user?.sellerStatus === 'active';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.name.trim()) return toast.error('Please enter your full name');
      if (!formData.collegeName.trim()) return toast.error('Please enter your college/university');
      if (!formData.course.trim()) return toast.error('Please enter your course (e.g. B.Tech, BCA, B.Sc)');
      if (!formData.branch.trim()) return toast.error('Please enter your branch/stream (e.g. CSE, ECE, Mechanical)');
      setStep(2);
    } else if (step === 2) {
      if (!formData.bio.trim()) return toast.error('Please write a short bio for your buyers');
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.upiId.trim()) {
      return toast.error('Please enter your UPI ID to receive payouts');
    }

    const upiRegex = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(formData.upiId.trim())) {
      return toast.error('Please enter a valid UPI ID (e.g. yourname@oksbi or phone@paytm)');
    }

    if (!formData.agreeTerms) {
      return toast.error('Please agree to the seller marketplace terms');
    }

    setLoading(true);
    try {
      const { data } = await API.post('/seller/onboard', {
        name: formData.name,
        collegeName: formData.collegeName,
        course: formData.course,
        branch: formData.branch,
        year: formData.year,
        bio: formData.bio,
        upiId: formData.upiId
      });

      if (data?.success) {
        toast.success(data.message || 'You are now a verified seller!');
        if (data.user) {
          updateUser(data.user);
        }
        navigate('/seller/dashboard');
      } else {
        toast.error(data?.message || 'Onboarding failed');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to complete seller onboarding');
    } finally {
      setLoading(false);
    }
  };

  if (isGuest) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full p-8 rounded-3xl backdrop-blur-xl border text-center shadow-xl"
             style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4"
               style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <FiLock />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
          <p className="text-gray-600 mb-6 text-sm">
            You must log in with a registered student account before you can become a seller and monetize your study notes.
          </p>
          <Link
            to="/login"
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all shadow-md hover:shadow-lg"
            style={{ background: 'var(--accent)' }}
          >
            Log In to Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Top Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-3 border shadow-sm"
               style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--accent-border)' }}>
            <BsStars /> Verified Student Creator Program
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Become a Verified Note Seller
          </h1>
          <p className="mt-2 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your class notes, previous year solutions, or handwritten summaries. Keep <span className="font-bold text-emerald-600">90% of every sale</span> with instant UPI withdrawals.
          </p>

          {isAlreadySeller && (
            <div className="mt-4 p-4 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-800 text-sm flex items-center justify-between max-w-xl mx-auto">
              <div className="flex items-center gap-2">
                <FiUserCheck className="text-lg text-emerald-600" />
                <span>You are already an active seller! You can update your details below or visit your dashboard.</span>
              </div>
              <Link
                to="/seller/dashboard"
                className="font-semibold underline ml-3 shrink-0 hover:text-emerald-950"
              >
                Dashboard &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Benefits Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5"
               style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: '#ecfdf5', color: '#059669' }}>
              <FiDollarSign size={20} />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">90% Seller Payout</div>
              <div className="text-xs text-gray-500">Highest commission for students</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5"
               style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: '#eff6ff', color: '#2563eb' }}>
              <FiTrendingUp size={20} />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">Instant UPI Payouts</div>
              <div className="text-xs text-gray-500">Withdraw earnings straight to UPI</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5"
               style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              <FiShield size={20} />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">100% Privacy Protected</div>
              <div className="text-xs text-gray-500">Your UPI & phone never shared</div>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl border shadow-xl backdrop-blur-xl overflow-hidden"
             style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
          
          {/* Stepper Header */}
          <div className="border-b px-6 py-4 flex items-center justify-between"
               style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.02)' }}>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className={`flex items-center gap-2 text-xs sm:text-sm font-semibold ${step >= 1 ? 'text-coral-500' : 'text-gray-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-coral-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  1
                </span>
                <span>Academic Profile</span>
              </div>
              <div className="w-6 sm:w-10 h-0.5 bg-gray-200" />
              <div className={`flex items-center gap-2 text-xs sm:text-sm font-semibold ${step >= 2 ? 'text-coral-500' : 'text-gray-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-coral-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  2
                </span>
                <span>Bio & Quality</span>
              </div>
              <div className="w-6 sm:w-10 h-0.5 bg-gray-200" />
              <div className={`flex items-center gap-2 text-xs sm:text-sm font-semibold ${step >= 3 ? 'text-coral-500' : 'text-gray-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-coral-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  3
                </span>
                <span>Payout UPI</span>
              </div>
            </div>
            <span className="text-xs text-gray-400 font-medium hidden sm:inline">
              Step {step} of 3
            </span>
          </div>

          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: Academic Profile */}
              {step === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleNext}
                  className="space-y-5"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Step 1: Academic Information</h3>
                    <p className="text-xs text-gray-500">This helps buyers from your university and department discover your notes easily.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Alex Sharma"
                        className="w-full px-4 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-coral-400"
                        style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'var(--border-strong)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        College / University *
                      </label>
                      <input
                        type="text"
                        name="collegeName"
                        required
                        value={formData.collegeName}
                        onChange={handleChange}
                        placeholder="e.g. DEI Dayalbagh, IIT, DU, AKTU"
                        className="w-full px-4 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-coral-400"
                        style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'var(--border-strong)' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Course *
                      </label>
                      <input
                        type="text"
                        name="course"
                        required
                        value={formData.course}
                        onChange={handleChange}
                        placeholder="e.g. B.Tech, BCA, B.Sc"
                        className="w-full px-4 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-coral-400"
                        style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'var(--border-strong)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Branch / Dept *
                      </label>
                      <input
                        type="text"
                        name="branch"
                        required
                        value={formData.branch}
                        onChange={handleChange}
                        placeholder="e.g. Computer Science, Mechanical"
                        className="w-full px-4 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-coral-400"
                        style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'var(--border-strong)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Year / Semester
                      </label>
                      <select
                        name="year"
                        value={formData.year}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-coral-400"
                        style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'var(--border-strong)' }}
                      >
                        <option value="1st Year">1st Year (Sem 1-2)</option>
                        <option value="2nd Year">2nd Year (Sem 3-4)</option>
                        <option value="3rd Year">3rd Year (Sem 5-6)</option>
                        <option value="4th Year">4th Year (Sem 7-8)</option>
                        <option value="Postgraduate">Postgraduate / Masters</option>
                        <option value="Alumni">Graduate / Alumni</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-md hover:shadow-lg"
                      style={{ background: 'var(--accent)' }}
                    >
                      <span>Continue to Step 2</span>
                      <FiArrowRight />
                    </button>
                  </div>
                </motion.form>
              )}

              {/* STEP 2: Bio & Quality Guarantee */}
              {step === 2 && (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleNext}
                  className="space-y-5"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Step 2: Seller Bio & Reputation</h3>
                    <p className="text-xs text-gray-500">Explain what subjects you excel at and why other students should trust your materials.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Seller Bio *
                    </label>
                    <textarea
                      name="bio"
                      required
                      rows={4}
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="e.g. 3rd year CSE student at DEI. High-scoring student with clean handwritten notes for Data Structures, OS, and Engineering Math. All formulas and previous year exam questions highlighted!"
                      className="w-full px-4 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-coral-400"
                      style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'var(--border-strong)' }}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[11px] text-gray-400">Aim for 50-150 characters</span>
                      <span className="text-[11px] text-gray-500">{formData.bio.length} characters</span>
                    </div>
                  </div>

                  {/* Public preview card */}
                  <div className="p-4 rounded-2xl border"
                       style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border)' }}>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FiAward className="text-coral-500" /> Buyer Preview Card
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
                           style={{ background: 'var(--accent)' }}>
                        {formData.name.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm truncate">{formData.name || 'Your Name'}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Verified Seller
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formData.course || 'Course'} &bull; {formData.branch || 'Branch'} &bull; {formData.collegeName || 'College'}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 italic line-clamp-2">
                          "{formData.bio || 'Your bio will appear here to students...'}"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-gray-700 border hover:bg-black/5 transition"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <FiArrowLeft />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-md hover:shadow-lg"
                      style={{ background: 'var(--accent)' }}
                    >
                      <span>Continue to Payout Details</span>
                      <FiArrowRight />
                    </button>
                  </div>
                </motion.form>
              )}

              {/* STEP 3: Payout UPI & Terms */}
              {step === 3 && (
                <motion.form
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Step 3: Payout Information</h3>
                    <p className="text-xs text-gray-500">Where should we transfer your earnings? Payouts are made directly to your UPI ID upon withdrawal request.</p>
                  </div>

                  <div className="p-4 rounded-2xl border bg-amber-50 border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                    <FiShield className="text-amber-600 text-base shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Strict Privacy Protection:</span> Your UPI ID is stored securely and used only by the payout processor. It will <strong>never</strong> be visible to buyers, listed publicly, or shared with third parties.
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Your UPI ID (VPA) *
                    </label>
                    <input
                      type="text"
                      name="upiId"
                      required
                      value={formData.upiId}
                      onChange={handleChange}
                      placeholder="e.g. 9876543210@paytm or yourname@oksbi"
                      className="w-full px-4 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-coral-400 font-mono"
                      style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'var(--border-strong)' }}
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Accepted: Google Pay, PhonePe, Paytm, BHIM, Cred, or Any Bank UPI ID.
                    </span>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        name="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                        className="mt-1 w-4 h-4 text-coral-500 rounded border-gray-300 focus:ring-coral-400"
                      />
                      <span className="text-xs text-gray-600 leading-relaxed">
                        I agree to the <strong>Notes Marketplace Seller Terms</strong>. I confirm that any notes or materials I sell are my own authentic academic work or non-copyrighted study resources, and that 10% platform maintenance fee is deducted on sales.
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-gray-700 border hover:bg-black/5 transition"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <FiArrowLeft />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                      style={{ background: 'var(--accent)' }}
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Activating Seller Account...</span>
                        </>
                      ) : (
                        <>
                          <FiCheckCircle size={18} />
                          <span>Complete & Activate Seller Account</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.form>
              )}

            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
