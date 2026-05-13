import React, { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiSettings, FiX, FiCheck } from 'react-icons/fi';

const SettingsModal = memo(function SettingsModal({ show, onClose, chatSettings, updateChatSetting }) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 10 }}
          className="bg-[#1b1730] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 id="settings-title" className="text-white font-bold text-base flex items-center gap-2">
              <FiSettings className="text-violet-400" /> Messenger Environment Prefs
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1"
              aria-label="Close settings"
            >
              <FiX size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Toggle: Mute Audio */}
            <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
              <div>
                <label htmlFor="toggle-mute" className="text-white text-xs font-semibold block">Mute Notifications</label>
                <span className="text-[10px] text-gray-400 block mt-0.5">Suppress real-time incoming signaling loops</span>
              </div>
              <button
                id="toggle-mute"
                type="button"
                role="switch"
                aria-checked={chatSettings.muteAlerts}
                onClick={() => updateChatSetting('muteAlerts', !chatSettings.muteAlerts)}
                className={`relative w-10 h-5 rounded-full transition-colors ${chatSettings.muteAlerts ? 'bg-violet-600' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${chatSettings.muteAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Toggle: Read Receipt Privacy */}
            <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
              <div>
                <label htmlFor="toggle-receipt" className="text-white text-xs font-semibold block">Read Receipt Privacy</label>
                <span className="text-[10px] text-gray-400 block mt-0.5">Prevent broadcasting delivered/read socket frames</span>
              </div>
              <button
                id="toggle-receipt"
                type="button"
                role="switch"
                aria-checked={chatSettings.readReceiptPrivacy}
                onClick={() => updateChatSetting('readReceiptPrivacy', !chatSettings.readReceiptPrivacy)}
                className={`relative w-10 h-5 rounded-full transition-colors ${chatSettings.readReceiptPrivacy ? 'bg-emerald-600' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${chatSettings.readReceiptPrivacy ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Select: Backdrop Theme */}
            <div className="flex flex-col bg-black/20 p-3 rounded-xl border border-white/5 gap-2">
              <label htmlFor="backdrop-select" className="text-white text-xs font-semibold block">Backdrop Theme Contrast</label>
              <select
                id="backdrop-select"
                value={chatSettings.backdropAccent}
                onChange={e => updateChatSetting('backdropAccent', e.target.value)}
                className="w-full bg-[#0b0914] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-violet-500"
              >
                <option value="dark" className="bg-gray-900">Charcoal Ambient Dark</option>
                <option value="violet" className="bg-gray-900">Deep Violet Spectrum</option>
                <option value="graphite" className="bg-gray-900">Soft Contrast Graphite</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition"
          >
            <FiCheck /> Save Preferences
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default SettingsModal;
