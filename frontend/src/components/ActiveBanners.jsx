import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { FiX, FiVolume2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActiveBanners() {
  const { user } = useAuth();
  const [banners, setBanners] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('dismissed_banners');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!user) return; // Skip API call until user is loaded

    // Debounce banner fetch to avoid multiple calls
    const timer = setTimeout(() => {
      API.get('/banners/active')
        .then(res => {
          if (res.data?.success) {
            setBanners(res.data.data || []);
          }
        })
        .catch(err => {
          console.error('Failed to fetch active banners:', err);
        });
    }, 300); // Wait 300ms to reduce concurrent requests

    return () => clearTimeout(timer);
  }, [user]);

  const handleDismiss = (id) => {
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    try {
      localStorage.setItem('dismissed_banners', JSON.stringify(next));
    } catch (err) {
      console.error(err);
    }
  };

  const visibleBanners = banners.filter(b => !dismissedIds.includes(b._id));

  if (visibleBanners.length === 0) return null;

  return (
    <div className="w-full flex flex-col bg-[#050508]">
      <AnimatePresence>
        {visibleBanners.map((banner) => (
          <motion.div
            key={banner._id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="w-full bg-gradient-to-r from-violet-950/20 via-indigo-950/10 to-violet-950/20 border-b border-white/[0.06] relative overflow-hidden"
          >
            {/* Elegant bottom highlight line */}
            <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-violet-500/40 via-indigo-500/40 to-violet-500/40" />
            
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex-shrink-0 animate-pulse">
                  <FiVolume2 size={14} />
                </div>
                <span className="text-xs md:text-sm font-semibold text-white leading-relaxed tracking-wide">
                  {banner.text}
                </span>
              </div>

              <button
                onClick={() => handleDismiss(banner._id)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition flex-shrink-0 flex items-center justify-center"
                aria-label="Dismiss announcement"
              >
                <FiX size={15} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
