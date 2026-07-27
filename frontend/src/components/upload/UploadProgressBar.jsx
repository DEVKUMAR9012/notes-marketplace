import React from 'react';
import { motion } from 'framer-motion';

import { FiX } from 'react-icons/fi';

export default function UploadProgressBar({ progress, isUploading, onCancel }) {
  if (!isUploading && progress === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
          {progress === 100 ? 'Processing...' : 'Uploading File'}
        </span>
        <span className="text-xs font-bold text-gray-700 flex items-center gap-3">
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
      <div className="w-full h-3 rounded-full overflow-hidden relative" style={{ background: 'rgba(0,0,0,0.08)', border: '1px solid var(--border)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0.2 }}
          className="h-full relative"
          style={{ background: 'linear-gradient(to right, var(--accent), #fb923c)' }}
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
