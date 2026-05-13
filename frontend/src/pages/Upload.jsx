import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../utils/api';
import { FiUpload } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

// Extracted Components
import UploadToggle from '../components/upload/UploadToggle';
import FormFields from '../components/upload/FormFields';
import FileDropzone from '../components/upload/FileDropzone';
import UploadProgressBar from '../components/upload/UploadProgressBar';
import { validateFile, calculateFileHash } from '../components/upload/ValidationHelpers';
import { Toast } from './tabs/SharedAdminUI';

export default function Upload() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGuest } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState(null);

  const abortControllerRef = useRef(null);

  // ── Redirect guest users to register — preserve current path for return ──
  useEffect(() => {
    if (isGuest) navigate('/register', { state: { from: location.pathname }, replace: true });
  }, [isGuest, navigate, location.pathname]);

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

  // ── Draft AutoSave ──
  useEffect(() => {
    const draft = localStorage.getItem('uploadDraft');
    if (draft) {
      try {
        setFormData(JSON.parse(draft));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('uploadDraft', JSON.stringify(formData));
  }, [formData]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setUploadProgress(0);
      showToast('Upload cancelled', 'error');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemTypeChange = (type) => {
    setFormData({ ...formData, itemType: type });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // ✅ Client-side Heavy Validation before upload
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    const fileHash = await calculateFileHash(file);

    const uploadData = new FormData();
    uploadData.append('title', formData.title);
    uploadData.append('description', formData.description);
    uploadData.append('subject', formData.subject);
    if (formData.itemType === 'note') {
      uploadData.append('college', formData.college);
      uploadData.append('semester', formData.semester);
    }
    uploadData.append('price', formData.price);
    uploadData.append('itemType', formData.itemType);
    uploadData.append('fileHash', fileHash);
    uploadData.append('pdf', file);

    abortControllerRef.current = new AbortController();

    try {
      await API.post('/notes', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: abortControllerRef.current.signal,
        // ✅ Real-Time Upload Progress Bar Tracking
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });
      localStorage.removeItem('uploadDraft');
      showToast('Upload completed successfully!', 'success');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        return; // Handled by cancelUpload
      }
      console.error(err);
      const message = err.response?.data?.message || 'Upload failed. Please try again.';
      setError(message);
      showToast('Upload failed', 'error');
      setUploadProgress(0);
    } finally {
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#07070f] text-white py-12 relative overflow-hidden">
      <Toast toast={toast} />
      {/* Ambient Effects */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-800/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-fuchsia-800/12 rounded-full blur-[120px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0c0c16]/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8"
        >
          <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${formData.itemType === 'book' ? 'bg-pink-500/20 text-pink-500' : 'bg-violet-500/20 text-violet-500'}`}>
              <FiUpload size={24} />
            </div>
            {formData.itemType === 'book' ? 'Publish a Book' : 'Upload a Note'}
          </h1>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm font-medium flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <p className="mt-0.5">{error}</p>
            </div>
          )}

          {/* Extracted Toggle Component */}
          <UploadToggle itemType={formData.itemType} setItemType={handleItemTypeChange} />

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Extracted Form Fields */}
            <FormFields formData={formData} handleChange={handleChange} />

            {/* Extracted Modern Drag & Drop Zone */}
            <FileDropzone file={file} setFile={setFile} setError={setError} />

            {/* Real-time Upload Progress Bar */}
            <UploadProgressBar progress={uploadProgress} isUploading={loading} onCancel={cancelUpload} />

            <button
              type="submit"
              disabled={loading || !file}
              className={`w-full py-4 mt-6 rounded-2xl font-bold text-white shadow-xl transition-all ${
                formData.itemType === 'book' 
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-pink-500/20'
                  : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-violet-500/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Uploading safely to cloud...' : formData.itemType === 'book' ? 'Publish Book' : 'Publish Note'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}