import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiDollarSign, FiImage, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export default function FormFields({
  formData,
  handleChange,
  previewImageFile,
  setPreviewImageFile,
  isSeller
}) {
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <>
      <input
        type="text"
        name="title"
        placeholder="Title (e.g. Data Structures Complete Handwritten Notes)"
        value={formData.title}
        onChange={handleChange}
        className="w-full px-4 py-3.5 rounded-xl focus:outline-none transition-all theme-input"
        required
      />

      <textarea
        name="description"
        placeholder="Description (Optional - describe topics covered, syllabus, or exam tips)"
        rows="3"
        value={formData.description}
        onChange={handleChange}
        className="w-full px-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 text-white placeholder-gray-500 transition-all resize-none"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          name="subject"
          placeholder={formData.itemType === 'book' ? "Genre / Subject" : "Subject (e.g. Operating Systems)"}
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
          className="space-y-4 animate-fadeIn"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                className="w-full px-4 py-3.5 rounded-xl text-gray-400 cursor-not-allowed select-none transition-all border"
                style={{ background: 'rgba(0,0,0,0.04)', borderColor: 'var(--border)' }}
                placeholder="College/Class (Auto-filled)"
                required={!!formData.category}
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
              <div className="w-full px-4 py-3.5 rounded-xl text-gray-400 select-none flex items-center font-medium border"
                   style={{ background: 'rgba(0,0,0,0.04)', borderColor: 'var(--border)' }}>
                School Level (No Semester)
              </div>
            )}
          </div>

          {/* Course & Branch Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              name="course"
              placeholder="Course (e.g. B.Tech, BCA, B.Sc)"
              value={formData.course || ''}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl focus:outline-none transition-all theme-input"
            />
            <input
              type="text"
              name="branch"
              placeholder="Branch (e.g. Computer Science, Mechanical)"
              value={formData.branch || ''}
              onChange={handleChange}
              className="w-full px-4 py-3.5 rounded-xl focus:outline-none transition-all theme-input"
            />
          </div>
        </motion.div>
      )}

      {/* Pricing & Monetization Section */}
      <div className="p-4 rounded-2xl border space-y-3"
           style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <FiDollarSign className="text-coral-500" /> Pricing (₹ INR)
          </label>
          <span className="text-xs text-gray-500">
            {Number(formData.price) > 0 ? `Paid Note (₹${formData.price})` : 'Free to All Students'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[0, 10, 20, 50].map(amt => (
            <button
              key={amt}
              type="button"
              onClick={() => handleChange({ target: { name: 'price', value: amt } })}
              className={`py-2 rounded-xl text-xs font-bold transition border ${
                Number(formData.price) === amt
                  ? 'bg-coral-500 text-white border-coral-500 shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
              }`}
            >
              {amt === 0 ? 'FREE' : `₹${amt}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Custom Price:</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold">₹</span>
            <input
              type="number"
              name="price"
              min="0"
              max="5000"
              value={formData.price}
              onChange={handleChange}
              placeholder="0"
              className="w-full pl-7 pr-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-coral-400 bg-white"
              style={{ borderColor: 'var(--border-strong)' }}
            />
          </div>
        </div>

        {/* Seller Verification Alert if Price > 0 */}
        {Number(formData.price) > 0 && (
          isSeller ? (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FiCheckCircle className="text-emerald-600 shrink-0" />
                <span>You will earn <strong>₹{Math.round(formData.price * 0.9)}</strong> (90%) per sale</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">10% Platform Fee</span>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FiAlertCircle className="text-amber-600 shrink-0" />
                <span>To receive payouts for paid notes, complete seller onboarding.</span>
              </span>
              <Link
                to="/seller/onboard"
                className="font-bold underline text-coral-600 hover:text-coral-700 shrink-0 ml-2"
              >
                Become Seller &rarr;
              </Link>
            </div>
          )
        )}
      </div>

      {/* Optional Preview Image Thumbnail */}
      <div className="p-4 rounded-2xl border"
           style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border)' }}>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <FiImage className="text-purple-500" /> Cover Thumbnail Image (Optional)
        </label>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-sm transition">
            <span>Browse Image</span>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
          {previewImageFile && (
            <span className="text-xs text-gray-600 truncate max-w-[200px]">
              {previewImageFile.name}
            </span>
          )}
          {imagePreviewUrl && (
            <img
              src={imagePreviewUrl}
              alt="Thumbnail preview"
              className="w-12 h-12 object-cover rounded-xl border shadow-sm ml-auto"
            />
          )}
        </div>
      </div>
    </>
  );
}

