import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { FiUpload, FiFile } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function Upload() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    college: '',
    semester: '',
    price: 0,
    itemType: 'note'
  });
  const [file, setFile] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // ✅ Validate file before submitting
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setLoading(true);

    const uploadData = new FormData();
    uploadData.append('title', formData.title);
    uploadData.append('description', formData.description);
    uploadData.append('subject', formData.subject);
    uploadData.append('college', formData.college);
    uploadData.append('semester', formData.semester);
    uploadData.append('price', formData.price);
    uploadData.append('itemType', formData.itemType);
    uploadData.append('pdf', file); // ✅ file is guaranteed to exist here

    try {
      await API.post('/notes', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data', // ✅ Required for file uploads
        },
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      // ✅ Show actual backend error message instead of generic alert
      const message = err.response?.data?.message || 'Upload failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070f] text-white py-12 relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-800/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-fuchsia-800/12 rounded-full blur-[120px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8"
        >
          <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
            <FiUpload className={formData.itemType === 'book' ? 'text-pink-500' : 'text-violet-500'} /> 
            {formData.itemType === 'book' ? 'Upload Book' : 'Upload Note'}
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex bg-gray-950/50 p-1 border border-white/5 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, itemType: 'note' })}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                formData.itemType === 'note' 
                  ? 'bg-violet-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              📝 Upload Note
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, itemType: 'book' })}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                formData.itemType === 'book' 
                  ? 'bg-pink-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              📚 Upload Book
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="title"
              placeholder="Title"
              onChange={handleChange}
              className="w-full px-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500 text-white placeholder-gray-500 transition-colors"
              required
            />

            <textarea
              name="description"
              placeholder="Description (Optional)"
              rows="4"
              onChange={handleChange}
              className="w-full px-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500 text-white placeholder-gray-500 transition-colors"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="subject"
                placeholder={formData.itemType === 'book' ? "Genre / Subject" : "Subject"}
                onChange={handleChange}
                className="w-full px-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500 text-white placeholder-gray-500 transition-colors"
                required
              />
              <input
                type="number"
                name="price"
                placeholder="Price (₹) - Leave 0 for Free"
                min="0"
                onChange={handleChange}
                className="w-full px-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500 text-white placeholder-gray-500 transition-colors"
              />
            </div>

            {formData.itemType === 'note' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="college"
                  placeholder="College"
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500 text-white placeholder-gray-500 transition-colors"
                  required
                />
                <select
                  name="semester"
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-gray-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500 text-white placeholder-gray-500 transition-colors cursor-pointer"
                  required
                >
                  <option value="" className="bg-gray-900">Select Semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s} className="bg-gray-900">Semester {s}</option>
                  ))}
                </select>
              </motion.div>
            )}

            {/* File Upload */}
            <div className={`mt-2 border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              file ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}>
              <FiFile className={`text-5xl mx-auto mb-3 transition-colors ${file ? 'text-emerald-400' : 'text-gray-500'}`} />
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer inline-block px-4 py-1.5 rounded-lg font-semibold transition-colors ${
                  file ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {file ? '📎 Change File' : '📎 Click to Select File'}
              </label>
              {file && (
                <p className="text-sm text-emerald-400/80 mt-3 font-medium">
                  ✓ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              {!file && (
                <p className="text-xs text-gray-500 mt-3 hidden sm:block">
                  PDF · DOC · DOCX · PPT · PPTX · XLS · XLSX · JPG · PNG · TXT &nbsp;(Max 25 MB)
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 mt-2 rounded-xl font-bold text-white shadow-lg transition-all ${
                formData.itemType === 'book' 
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-pink-500/25'
                  : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-violet-500/25'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Uploading...
                </span>
              ) : (
                formData.itemType === 'book' ? 'Publish Book' : 'Publish Note'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}