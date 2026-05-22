import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLogOut, FiHome, FiUpload, FiUser, FiMenu, FiX, FiShoppingCart, FiBook, FiHeadphones, FiMessageSquare, FiShield, FiUserPlus } from 'react-icons/fi';
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

  // Build nav items — isAI flag renders the glowing pill inline
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
    <nav className="sticky top-0 w-full z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link
            to="/"
            className="overflow-visible flex items-center transition-transform hover:scale-105 active:scale-95"
            style={{ padding: '4px' }}
          >
            <AnimatedLogo size={window.innerWidth < 768 ? 'small' : 'medium'} />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-5">
            {navItems.map(({ label, icon: Icon, path }) => (
              // Regular nav link
              <MotionLink
                key={path}
                to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isActive(path)
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="relative">
                  {Icon && <Icon size={18} />}
                  {label === 'Cart' && cart?.length > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-[10px] text-white font-bold flex items-center justify-center rounded-full shadow-lg shadow-red-500/40"
                    >
                      {cart.length}
                    </motion.span>
                  )}
                </div>
                <span className="text-sm font-medium">{label}</span>
              </MotionLink>
            ))}

            {/* Profile / Claim Profile */}
            {!isGuest ? (
              <MotionLink
                to="/profile"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isActive('/profile')
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiUser size={18} />
                <span className="text-sm font-medium">Profile</span>
              </MotionLink>
            ) : (
              <MotionLink
                to="/register"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 border border-violet-500/40 text-violet-300 hover:from-violet-600/50 hover:to-fuchsia-600/50 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiUserPlus size={18} />
                <span className="text-sm font-medium">✨ Claim Profile</span>
              </MotionLink>
            )}
          </div>

          {/* Right Side: silent status chip + action button */}
          <div className="hidden md:flex items-center gap-3">
            {/* Status chip */}
            {isGuest ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-xs text-gray-500 font-medium">Visitor</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-gray-400 font-medium truncate max-w-[150px]">
                  {user?.name || 'User'}
                </span>
              </div>
            )}

            {/* Action button */}
            {isGuest ? (
              <motion.button
                onClick={() => navigate('/register')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg font-semibold text-sm shadow-lg shadow-violet-900/30 hover:shadow-violet-900/50 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiUserPlus size={16} />
                Sign Up
              </motion.button>
            ) : (
              <motion.button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-500/30 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiLogOut size={18} />
                <span className="text-sm font-medium">Logout</span>
              </motion.button>
            )}
          </div>


          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition"
          >
            {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
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
              className="md:hidden mt-4 space-y-2 overflow-hidden"
            >
              {navItems.map(({ label, icon: Icon, path }) => (
                <MotionLink
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive(path)
                      ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="relative">
                    {Icon && <Icon size={18} />}
                    {label === 'Cart' && cart?.length > 0 && (
                      <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-[10px] text-white font-bold flex items-center justify-center rounded-full">
                        {cart.length}
                      </span>
                    )}
                  </div>
                  <span className="font-medium">{label}</span>
                </MotionLink>
              ))}

              {/* Profile / Claim mobile */}
              {!isGuest ? (
                <MotionLink
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive('/profile') ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50' : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FiUser size={18} />
                  <span className="font-medium">Profile</span>
                </MotionLink>
              ) : (
                <MotionLink
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300"
                >
                  <FiUserPlus size={18} />
                  <span className="font-medium">✨ Claim Profile (Sign Up)</span>
                </MotionLink>
              )}

              <div className="border-t border-white/10 pt-2 mt-2">
                {!isGuest && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-400">{user?.name || 'User'}</span>
                  </div>
                )}

                <motion.button
                  onClick={() => {
                    isGuest ? navigate('/register') : handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                    isGuest
                      ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 border-violet-500/30 text-violet-300'
                      : 'text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30'
                  }`}
                >
                  {isGuest ? <FiUserPlus size={18} /> : <FiLogOut size={18} />}
                  <span className="font-medium">{isGuest ? 'Sign Up Free' : 'Logout'}</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

