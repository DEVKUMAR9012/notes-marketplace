import React from 'react';

export default function UploadToggle({ itemType, setItemType }) {
  return (
    <div className="flex p-1 rounded-2xl mb-6 border" style={{ background: 'rgba(0,0,0,0.04)', borderColor: 'var(--border)' }}>
      <button
        type="button"
        onClick={() => setItemType('note')}
        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
          itemType === 'note'
            ? 'text-white shadow-coral'
            : 'text-gray-500 hover:text-gray-800 hover:bg-black/5'
        }`}
        style={itemType === 'note' ? { background: 'var(--accent)' } : {}}
      >
        📝 Upload Note
      </button>
      <button
        type="button"
        onClick={() => setItemType('book')}
        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
          itemType === 'book'
            ? 'bg-pink-500 text-white shadow-lg shadow-pink-200'
            : 'text-gray-500 hover:text-gray-800 hover:bg-black/5'
        }`}
      >
        📚 Upload Book
      </button>
    </div>
  );
}
