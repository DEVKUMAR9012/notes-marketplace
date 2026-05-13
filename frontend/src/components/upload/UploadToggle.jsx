import React from 'react';

export default function UploadToggle({ itemType, setItemType }) {
  return (
    <div className="flex bg-gray-950/50 p-1 border border-white/5 rounded-2xl mb-6">
      <button
        type="button"
        onClick={() => setItemType('note')}
        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
          itemType === 'note'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/20'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        📝 Upload Note
      </button>
      <button
        type="button"
        onClick={() => setItemType('book')}
        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
          itemType === 'book'
            ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        📚 Upload Book
      </button>
    </div>
  );
}
