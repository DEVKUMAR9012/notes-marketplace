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
        className="w-full px-4 py-3.5 rounded-xl focus:outline-none transition-all theme-input"
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
          className="w-full px-4 py-3.5 rounded-xl focus:outline-none transition-all theme-input"
          required
        />
        <select
          name="category"
          value={formData.category || ''}
          onChange={handleChange}
          className="w-full px-4 py-3.5 rounded-xl focus:outline-none transition-all theme-input cursor-pointer font-medium"
          required
        >
          <option value="" className="bg-gray-900">Select Category</option>
          <option value="dei" className="bg-gray-900">DEI Dayalbagh</option>
          <option value="du" className="bg-gray-900">Delhi University (DU)</option>
          <option value="jnu" className="bg-gray-900">JNU New Delhi</option>
          <option value="btech" className="bg-gray-900">B.Tech / Engg</option>
          <option value="9th" className="bg-gray-900">9th Class</option>
          <option value="10th" className="bg-gray-900">10th Class</option>
          <option value="11th" className="bg-gray-900">11th Class</option>
          <option value="12th" className="bg-gray-900">12th Class</option>
          <option value="other" className="bg-gray-900">Other / Custom College</option>
        </select>
      </div>

      {formData.itemType === 'note' && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 'auto' }} 
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn"
        >
          {formData.category === 'other' ? (
            <input
              type="text"
              name="college"
              placeholder="Enter College Name"
              value={formData.college}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl focus:outline-none transition-all theme-input"
              required
            />
          ) : (
            <input
              type="text"
              name="college"
              value={formData.college}
              readOnly
              className="w-full px-4 py-3.5 rounded-xl text-gray-400 cursor-not-allowed select-none transition-all border" style={{ background: 'rgba(0,0,0,0.04)', borderColor: 'var(--border)' }}
              placeholder="College/Class (Auto-filled)"
              required={!!formData.category} // Only required if category is selected
            />
          )}

          {!['9th', '10th', '11th', '12th'].includes(formData.category) ? (
            <select
              name="semester"
              value={formData.semester}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl focus:outline-none transition-all theme-input cursor-pointer"
              required
            >
              <option value="" className="bg-gray-900">Select Semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s} className="bg-gray-900">Semester {s}</option>
              ))}
            </select>
          ) : (
            <div className="w-full px-4 py-3.5 rounded-xl text-gray-400 select-none flex items-center font-medium border" style={{ background: 'rgba(0,0,0,0.04)', borderColor: 'var(--border)' }}>
              School Level (No Semester)
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}
