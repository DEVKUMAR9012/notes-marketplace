import React from 'react';
import { motion } from 'framer-motion';

export default function FormFields({ formData, handleChange }) {
  return (
    <>
      <input
        type="text"
        name="title"
        placeholder="Title"
        value={formData.title}
        onChange={handleChange}
        className="w-full px-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 text-white placeholder-gray-500 transition-all"
        required
      />

      <textarea
        name="description"
        placeholder="Description (Optional)"
        rows="4"
        value={formData.description}
        onChange={handleChange}
        className="w-full px-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 text-white placeholder-gray-500 transition-all resize-none"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          name="subject"
          placeholder={formData.itemType === 'book' ? "Genre / Subject" : "Subject"}
          value={formData.subject}
          onChange={handleChange}
          className="w-full px-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 text-white placeholder-gray-500 transition-all"
          required
        />
        <input
          type="number"
          name="price"
          placeholder="Price (₹) - Leave 0 for Free"
          min="0"
          value={formData.price}
          onChange={handleChange}
          className="w-full px-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 text-white placeholder-gray-500 transition-all"
        />
      </div>

      {formData.itemType === 'note' && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 'auto' }} 
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <input
            type="text"
            name="college"
            placeholder="College"
            value={formData.college}
            onChange={handleChange}
            className="w-full px-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 text-white placeholder-gray-500 transition-all"
            required
          />
          <select
            name="semester"
            value={formData.semester}
            onChange={handleChange}
            className="w-full px-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 text-white placeholder-gray-500 transition-all cursor-pointer"
            required
          >
            <option value="" className="bg-gray-900">Select Semester</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s} className="bg-gray-900">Semester {s}</option>
            ))}
          </select>
        </motion.div>
      )}
    </>
  );
}
