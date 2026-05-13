import React from 'react';
import { motion } from 'framer-motion';

import { FiX } from 'react-icons/fi';

export default function UploadProgressBar({ progress, isUploading, onCancel }) {
  if (!isUploading && progress === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">
          {progress === 100 ? 'Processing...' : 'Uploading File'}
        </span>
        <span className="text-xs font-bold text-white flex items-center gap-3">
          {progress}%
          {isUploading && progress < 100 && (
            <button 
              type="button" 
              onClick={onCancel}
              className="text-gray-400 hover:text-red-400 transition-colors p-1"
              aria-label="Cancel Upload"
            >
              <FiX size={14} />
            </button>
          )}
        </span>
      </div>
      <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-white/5 relative">
        {/* Animated striped background for active uploading feel */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0.2 }}
          className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 relative"
        >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[shimmer_1s_linear_infinite]" />
        </motion.div>
      </div>
      <p className="text-[10px] text-gray-500 mt-2 text-center">
        {progress === 100 
          ? "Finishing up... Please don't close this window."
          : "Please keep this tab open until the upload completes."}
      </p>
    </div>
  );
}
