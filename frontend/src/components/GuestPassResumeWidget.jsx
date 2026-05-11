/**
 * GuestPassResumeWidget
 *
 * A sleek collapsible panel on the Login page that lets users
 * type their NM-XXXX-XXXX token and instantly restore their
 * cart + activity on any device — no password needed.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API, { syncToken } from '../utils/api'; // ✅ Clean single import
import { FiChevronDown, FiLoader } from 'react-icons/fi';

// Auto-formats typing: inserts dashes at the right spots
// Raw input "NM94872341" → "NM-9487-2341"
function formatGuestPassInput(raw) {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let result = '';
  if (clean.startsWith('NM')) {
    result = 'NM';
    const digits = clean.slice(2).replace(/\D/g, '');
    if (digits.length > 0) result += '-' + digits.slice(0, 4);
    if (digits.length > 4) result += '-' + digits.slice(4, 8);
  } else {
    result = clean.slice(0, 2);
  }
  return result;
}

export default function GuestPassResumeWidget() {
  const [expanded, setExpanded] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setError('');
    setPassInput(formatGuestPassInput(e.target.value));
  };

  const isComplete = /^NM-\d{4}-\d{4}$/.test(passInput);

  const handleResume = async (e) => {
    e.preventDefault();
    if (!isComplete) return setError('Enter your full Guest Pass (e.g., NM-4829-7231)');

    setLoading(true);
    setError('');
    try {
      const { data } = await API.post('/auth/resume-guest', { guestTokenNo: passInput });
      syncToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      login(data);
      setRestored(true);
      setTimeout(() => navigate('/'), 1400);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not find that Guest Pass');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-xs text-gray-600 font-medium tracking-widest uppercase">Or</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>

      {/* Toggle Button */}
      <motion.button
        type="button"
        onClick={() => { setExpanded(!expanded); setError(''); }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-violet-600/10 border border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-600/15 transition-all"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg leading-none">🎟️</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-violet-300">Have a Guest Pass?</p>
            <p className="text-[11px] text-gray-500 leading-none mt-0.5">Resume your session on this device</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <FiChevronDown size={16} className="text-violet-400" />
        </motion.div>
      </motion.button>

      {/* Expandable Input Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="guest-resume-panel"         // ✅ MANDATORY — prevents Framer Motion crash
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              {restored ? (
                // ── Success State ─────────────────────────────────────────
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-2 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl"
                >
                  <span className="text-3xl">✅</span>
                  <p className="text-emerald-400 font-bold text-sm">Session Restored!</p>
                  <p className="text-gray-500 text-xs">Taking you home...</p>
                </motion.div>
              ) : (
                // ── Input Form ────────────────────────────────────────────
                <form onSubmit={handleResume} className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      id="guest-pass-input"
                      value={passInput}
                      onChange={handleChange}
                      placeholder="NM-XXXX-XXXX"
                      maxLength={12}
                      autoComplete="off"
                      spellCheck={false}
                      className={`w-full text-center font-mono text-lg font-bold py-3.5 px-4 bg-white/5 border rounded-2xl placeholder-gray-700 focus:outline-none transition-all tracking-widest ${
                        isComplete
                          ? 'border-violet-500/60 text-violet-300 focus:ring-2 focus:ring-violet-500/20'
                          : 'border-white/10 text-white focus:border-violet-500/40'
                      }`}
                    />
                    {/* Live 8-dot progress indicator */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                        const digits = passInput.replace(/[^0-9]/g, '');
                        return (
                          <div
                            key={i}
                            className={`w-1 h-1 rounded-full transition-colors ${
                              i < digits.length ? 'bg-violet-400' : 'bg-white/15'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !isComplete}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-3 rounded-2xl font-bold text-sm shadow-lg shadow-violet-900/30 hover:shadow-violet-900/50 hover:from-violet-500 hover:to-fuchsia-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <FiLoader size={14} className="animate-spin" />
                        Restoring Session...
                      </>
                    ) : (
                      <>🔁 Restore My Session</>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-gray-600 leading-relaxed">
                    Your Guest Pass was shown in the Navbar when you first visited.
                    <br />It's formatted like <span className="text-violet-500 font-mono">NM-XXXX-XXXX</span>.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
