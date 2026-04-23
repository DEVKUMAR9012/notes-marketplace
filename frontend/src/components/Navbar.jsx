import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { motion } from 'framer-motion';
import { FiLogOut, FiHome, FiUpload, FiUser, FiMenu, FiX, FiShoppingCart, FiBook, FiHeadphones, FiMessageSquare } from 'react-icons/fi';
import { useState } from 'react';

export default function Navbar() {
  const { logout, user } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      // Optional: Call backend logout endpoint
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
    { label: 'Books', icon: FiBook, path: '/books' },
    { label: 'Upload', icon: FiUpload, path: '/upload' },
    { label: 'Profile', icon: FiUser, path: '/profile' },
    { label: 'Chat', icon: FiMessageSquare, path: '/chat' },
    { label: 'Contact', icon: FiHeadphones, path: '/contact' },
    { label: 'Cart', icon: FiShoppingCart, path: '/cart' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 w-full z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/10 sticky">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.button
            onClick={() => navigate('/')}
            className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            📚 Notes Marketplace
          </motion.button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map(({ label, icon: Icon, path }) => (
              <motion.button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isActive(path)
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="relative">
                  <Icon size={18} />
                  {label === 'Cart' && cart.length > 0 && (
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
              </motion.button>
            ))}
          </div>

          {/* User Info + Logout - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-400 font-medium truncate max-w-[150px]">
                {user?.name || 'User'}
              </span>
            </div>

            <motion.button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-500/30 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiLogOut size={18} />
              <span className="text-sm font-medium">Logout</span>
            </motion.button>
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
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden mt-4 space-y-2"
          >
            {navItems.map(({ label, icon: Icon, path }) => (
              <motion.button
                key={path}
                onClick={() => {
                  navigate(path);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive(path)
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="relative">
                  <Icon size={18} />
                  {label === 'Cart' && cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-[10px] text-white font-bold flex items-center justify-center rounded-full">
                      {cart.length}
                    </span>
                  )}
                </div>
                <span className="font-medium">{label}</span>
              </motion.button>
            ))}

            <div className="border-t border-white/10 pt-2 mt-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-400">{user?.name || 'User'}</span>
              </div>

              <motion.button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-500/30 transition-all"
              >
                <FiLogOut size={18} />
                <span className="font-medium">Logout</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}