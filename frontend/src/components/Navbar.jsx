import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLogOut, FiHome, FiUpload, FiUser, FiMenu, FiX, FiShoppingCart, FiHeadphones, FiMessageSquare, FiShield, FiUserPlus } from 'react-icons/fi';
import { BsStars } from 'react-icons/bs';
import { useState } from 'react';
import AnimatedLogo from './AnimatedLogo';

const MotionLink = motion(Link);

export default function Navbar() {
  const { logout, user, isGuest } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      // await API.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const navItems = [
    { label: 'Home', icon: FiHome, path: '/' },
    ...(!isGuest ? [{ label: 'Upload', icon: FiUpload, path: '/upload' }] : []),
    { label: 'AI', icon: BsStars, path: '/ai' },
    { label: 'Chat', icon: FiMessageSquare, path: '/chat' },
    { label: 'Contact', icon: FiHeadphones, path: '/contact' },
    { label: 'Cart', icon: FiShoppingCart, path: '/cart' },
  ];
  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin', icon: FiShield, path: '/admin/dashboard' });
  }
  const isActive = (path) => location.pathname === path;

  return (
    <nav
      className="sticky top-0 w-full z-50 backdrop-blur-xl border-b"
      style={{ background: 'var(--nav-bg)', borderColor: 'var(--border)' }}
    >
      <div className="container mx-auto px-4 py-3.5">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link
            to="/"
            className="overflow-visible flex items-center transition-transform hover:scale-105 active:scale-95"
            style={{ padding: '4px' }}
          >
            <AnimatedLogo size={window.innerWidth < 768 ? 'small' : 'medium'} />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ label, icon: Icon, path }) => (
              <MotionLink
                key={path}
                to={path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all text-sm font-medium ${
                  isActive(path)
                    ? 'bg-coral-50 text-coral-500 border border-coral-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-black/5'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="relative">
                  {Icon && <Icon size={16} />}
                  {label === 'Cart' && cart?.length > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-4 h-4 text-[10px] text-white font-bold flex items-center justify-center rounded-full shadow-md"
                      style={{ background: 'var(--accent)' }}
                    >
                      {cart.length}
                    </motion.span>
                  )}
                </div>
                <span>{label}</span>
              </MotionLink>
            ))}

            {/* Profile / Claim Profile */}
            {!isGuest ? (
              <MotionLink
                to="/profile"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all text-sm font-medium ${
                  isActive('/profile')
                    ? 'bg-coral-50 text-coral-500 border border-coral-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-black/5'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiUser size={16} />
                <span>Profile</span>
              </MotionLink>
            ) : (
              <MotionLink
                to="/register"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all"
                style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)', background: 'var(--accent-light)' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiUserPlus size={16} />
                <span>✨ Claim Profile</span>
              </MotionLink>
            )}
          </div>

          {/* Right Side: status chip + action button */}
          <div className="hidden md:flex items-center gap-3">
            {isGuest ? (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                style={{ background: 'rgba(0,0,0,0.04)', borderColor: 'var(--border)' }}
              >
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                <span className="text-xs text-gray-500 font-medium">Visitor</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                style={{ background: 'rgba(0,0,0,0.04)', borderColor: 'var(--border)' }}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-600 font-medium truncate max-w-[150px]">
                  {user?.name || 'User'}
                </span>
              </div>
            )}

            {isGuest ? (
              <motion.button
                onClick={() => navigate('/register')}
                className="flex items-center gap-2 px-5 py-2 text-white rounded-full font-semibold text-sm btn-accent"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiUserPlus size={15} />
                Sign Up
              </motion.button>
            ) : (
              <motion.button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all text-red-500 hover:bg-red-50"
                style={{ borderColor: 'rgba(239,68,68,0.25)' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiLogOut size={16} />
                <span>Logout</span>
              </motion.button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-black/5 transition"
          >
            {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-3 space-y-1 overflow-hidden"
            >
              {navItems.map(({ label, icon: Icon, path }) => (
                <MotionLink
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                    isActive(path)
                      ? 'bg-coral-50 text-coral-500 border border-coral-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-black/5'
                  }`}
                >
                  <div className="relative">
                    {Icon && <Icon size={17} />}
                    {label === 'Cart' && cart?.length > 0 && (
                      <span
                        className="absolute -top-2 -right-2 w-4 h-4 text-[10px] text-white font-bold flex items-center justify-center rounded-full"
                        style={{ background: 'var(--accent)' }}
                      >
                        {cart.length}
                      </span>
                    )}
                  </div>
                  <span>{label}</span>
                </MotionLink>
              ))}

              {!isGuest ? (
                <MotionLink
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                    isActive('/profile') ? 'bg-coral-50 text-coral-500 border border-coral-200' : 'text-gray-600 hover:text-gray-900 hover:bg-black/5'
                  }`}
                >
                  <FiUser size={17} />
                  <span>Profile</span>
                </MotionLink>
              ) : (
                <MotionLink
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium"
                  style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)', background: 'var(--accent-light)' }}
                >
                  <FiUserPlus size={17} />
                  <span>✨ Claim Profile (Sign Up)</span>
                </MotionLink>
              )}

              <div className="border-t pt-2 mt-2" style={{ borderColor: 'var(--border)' }}>
                {!isGuest && (
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-xl mb-1"
                    style={{ background: 'rgba(0,0,0,0.04)' }}
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm text-gray-600">{user?.name || 'User'}</span>
                  </div>
                )}

                <motion.button
                  onClick={() => {
                    isGuest ? navigate('/register') : handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                    isGuest
                      ? 'border-coral-200 text-coral-500 bg-coral-50'
                      : 'text-red-500 hover:bg-red-50 border-red-200'
                  }`}
                >
                  {isGuest ? <FiUserPlus size={17} /> : <FiLogOut size={17} />}
                  <span>{isGuest ? 'Sign Up Free' : 'Logout'}</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
