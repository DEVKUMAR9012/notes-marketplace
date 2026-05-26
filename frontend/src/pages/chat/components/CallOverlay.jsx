import React, { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiPhoneCall } from 'react-icons/fi';

const CallOverlay = memo(function CallOverlay({ activeCallPayload, setActiveCallPayload, ringtoneRef }) {
  if (!activeCallPayload) return null;

  const dismiss = () => {
    if (ringtoneRef?.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.src = '';
    }
    setActiveCallPayload(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -50 }}
        role="dialog"
        aria-modal="true"
        aria-label={activeCallPayload.incoming ? `Incoming call from ${activeCallPayload.callerName || 'Unknown caller'}` : 'Connecting call'}
        className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-[#1b1730] border-2 border-emerald-500/50 rounded-2xl p-5 shadow-2xl z-[200] w-11/12 max-w-md flex flex-col items-center gap-3"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
          <FiPhoneCall className="text-emerald-400 text-xl" />
        </div>
        <div className="text-center">
          <h4 className="text-white font-bold text-base">
            {activeCallPayload.incoming
              ? `Incoming Call from ${activeCallPayload.callerName || 'Unknown caller'}`
              : `Connecting with Peer...`}
          </h4>
          <p className="text-xs text-gray-400 mt-1">Establishing secure third-party integration line</p>
        </div>

        <div className="flex w-full gap-3 mt-2">
          <a
            href={activeCallPayload.roomUrl}
            target="_blank"
            rel="noreferrer"
            onClick={dismiss}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs text-center block transition"
          >
            Accept Room Line
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-xl text-xs transition"
            aria-label="Decline call"
          >
            Decline
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default CallOverlay;
