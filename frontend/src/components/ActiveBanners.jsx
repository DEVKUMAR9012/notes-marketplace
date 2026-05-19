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
    if (!user) return;

    API.get('/banners/active')
      .then(res => {
        if (res.data?.success) {
          setBanners(res.data.data || []);
        }
      })
      .catch(err => {
        console.error('Failed to fetch active banners:', err);
      });
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
    <div className="w-full flex flex-col gap-1.5 px-4 md:px-8 pt-4 pb-2 bg-[#050508]">
      <AnimatePresence>
        {visibleBanners.map((banner) => (
          <motion.div
            key={banner._id}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full flex items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600/15 via-indigo-600/10 to-violet-600/15 border border-violet-500/20 shadow-[0_4px_20px_rgba(139,92,246,0.1)] relative overflow-hidden group"
          >
            {/* Visual gradient accent border background line */}
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-violet-500 to-indigo-600" />
            
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex-shrink-0 animate-pulse">
                <FiVolume2 size={15} />
              </div>
              <p className="text-xs md:text-sm font-semibold text-white leading-relaxed break-words pr-2">
                {banner.text}
              </p>
            </div>

            <button
              onClick={() => handleDismiss(banner._id)}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition flex-shrink-0"
              aria-label="Dismiss announcement"
            >
              <FiX size={15} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
