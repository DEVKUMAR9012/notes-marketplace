import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  FiUploadCloud, FiFile, FiCheckCircle, FiX, FiInfo, FiLayers, 
  FiAlertCircle, FiSettings, FiSave, FiFolder, FiGrid, FiList,
  FiTrash2, FiActivity, FiDatabase, FiFileText, FiPlusSquare,
  FiTable, FiCheck
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import API from '../../utils/api';
import { SectionHeader, Btn, Toast } from './SharedAdminUI';
import { calculateFileHash } from '../../components/upload/ValidationHelpers';

const BulkUploadsTab = () => {
  // ── States ──
  const [files, setFiles] = useState([]);
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('');
  const [college, setCollege] = useState('');
  const [itemType, setItemType] = useState('note');
  
  // ── CSV Metadata State ──
  const [csvMetadata, setCsvMetadata] = useState({});
  const [csvFileName, setCsvFileName] = useState('');

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, current: 0, failed: 0, duplicates: 0 });
  const [toast, setToast] = useState(null);

  // ── Presets State ──
  const [showPresets, setShowPresets] = useState(false);
  const [presets, setPresets] = useState([]);

  // Load presets safely in useEffect to avoid SSR/Initialization issues
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_bulk_presets');
      if (saved) setPresets(JSON.parse(saved));
    } catch (e) {
      console.warn('Failed to load presets:', e);
    }
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── CSV Import Logic ──
  const handleCSVImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapping = {};
        let count = 0;
        results.data.forEach(row => {
          const key = row.Filename || row.filename;
          if (key) {
            mapping[key] = {
              title: row.Title || row.title,
              subject: row.Subject || row.subject,
              semester: row.Semester || row.semester,
              college: row.College || row.college,
              itemType: row.ItemType || row.itemType || 'note'
            };
            count++;
          }
        });
        setCsvMetadata(mapping);
        setCsvFileName(file.name);
        showToast(`Imported metadata for ${count} files from CSV!`, 'success');
      },
      error: () => showToast("Failed to parse CSV", "error")
    });
  };

  // ── File Handling ──
  const onDrop = useCallback((acceptedFiles) => {
    const pdfs = acceptedFiles.filter(f => f.type === 'application/pdf');
    if (pdfs.length < acceptedFiles.length) {
      showToast(`${acceptedFiles.length - pdfs.length} non-PDF files skipped.`, 'error');
    }
    
    setFiles(prev => {
        const existingNames = new Set(prev.map(f => f.name));
        const newFiles = pdfs.filter(f => !existingNames.has(f.name));
        if (newFiles.length < pdfs.length) {
            showToast(`${pdfs.length - newFiles.length} duplicates already in queue.`, 'info');
        }
        return [...prev, ...newFiles];
    });
  }, [showToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    maxSize: 100 * 1024 * 1024 // 100MB
  });

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const clearQueue = () => {
    if (window.confirm("Clear all files from queue?")) {
        setFiles([]);
        setCsvMetadata({});
        setCsvFileName('');
    }
  };

  // ── Preset Actions ──
  const savePreset = () => {
    if (!subject) return showToast("Enter a subject to save preset", "error");
    const newPreset = { id: Date.now(), subject, semester, college, itemType };
    const updated = [newPreset, ...presets.slice(0, 4)];
    setPresets(updated);
    localStorage.setItem('admin_bulk_presets', JSON.stringify(updated));
    showToast("Preset saved!", "success");
  };

  const applyPreset = (p) => {
    setSubject(p.subject || '');
    setSemester(p.semester || '');
    setCollege(p.college || '');
    setItemType(p.itemType || 'note');
    setShowPresets(false);
    showToast(`Applied: ${p.subject}`, "success");
  };

  // ── Bulk Upload Logic ──
  const handleBulkUpload = async () => {
    if (files.length === 0) return showToast("Queue is empty", "error");
    if (!subject && Object.keys(csvMetadata).length === 0) return showToast("Subject or CSV required", "error");

    setUploading(true);
    setStats({ total: files.length, current: 0, failed: 0, duplicates: 0 });
    setProgress(2);

    try {
      const batchSize = 10;
      const fileMetadata = {};
      
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await Promise.all(batch.map(async (file) => {
            try {
                const hash = await calculateFileHash(file);
                const csvData = csvMetadata[file.name] || {};
                fileMetadata[file.name] = { ...csvData, hash };
            } catch (e) {
                console.error('Hash failed:', file.name, e);
            }
        }));
        setProgress(Math.round(((i + batch.length) / files.length) * 10));
      }

      const formData = new FormData();
      files.forEach(f => formData.append('pdfs', f));
      formData.append('subject', subject);
      formData.append('semester', semester);
      formData.append('college', college);
      formData.append('itemType', itemType);
      formData.append('metadata', JSON.stringify(fileMetadata));

      const { data } = await API.post('/admin/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const p = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(10 + Math.round(p * 0.9));
        }
      });

      showToast(data.message || 'Batch uploaded successfully!', 'success');
      setFiles([]);
      setSubject('');
      setSemester('');
      setCollege('');
      setCsvMetadata({});
      setCsvFileName('');
    } catch (err) {
      console.error('Bulk Upload Error:', err);
      const msg = err.response?.data?.message || "Upload failed. Check server logs.";
      showToast(msg, "error");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const totalSize = useMemo(() => 
    (files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(1), 
  [files]);

  return (
    <div className="space-y-6 pb-20 pt-4 max-w-7xl mx-auto px-4">
      <Toast toast={toast} />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <SectionHeader 
          icon={FiLayers} 
          iconColor="bg-amber-500/20 text-amber-400"
          title="Admin God Mode: Mass Upload" 
          subtitle="Enterprise batch processor with CSV metadata support."
        />
        <div className="flex items-center gap-2">
          <Btn variant="secondary" icon={FiSettings} onClick={() => setShowPresets(!showPresets)}>
            Presets {presets.length > 0 && `(${presets.length})`}
          </Btn>
          <Btn variant="danger" icon={FiTrash2} onClick={clearQueue} disabled={files.length === 0 || uploading}>
            Clear Queue
          </Btn>
        </div>
      </div>

      <AnimatePresence>
        {showPresets && presets.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-wrap gap-3">
            {presets.map(p => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/10 transition flex items-center gap-2">
                <FiFolder className="text-amber-500" /> {p.subject} (Sem {p.semester})
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
            
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <FiDatabase className="text-amber-400" /> Batch Config
              </h3>
              <button onClick={savePreset} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-amber-400 transition">
                <FiSave size={14} />
              </button>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Metadata Source</span>
                {csvFileName && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><FiCheck /> Linked</span>}
              </div>
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-dashed border-white/10 rounded-xl cursor-pointer hover:border-amber-500/50 transition group">
                <FiTable className="text-gray-400 group-hover:text-amber-400 transition" />
                <span className="text-xs text-gray-400 group-hover:text-white truncate">
                  {csvFileName || 'Upload Metadata CSV'}
                </span>
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
              </label>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 tracking-tighter">Common Subject</label>
                <div className="relative group">
                  <FiFileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-400 transition" />
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                    disabled={!!csvFileName}
                    placeholder={csvFileName ? "Handled by CSV" : "e.g. Structural Engineering"}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:border-amber-500/50 transition outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 tracking-tighter">Semester</label>
                  <select value={semester} onChange={e => setSemester(e.target.value)} disabled={!!csvFileName}
                    className="w-full bg-[#0d0b1a] border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-amber-500/50 outline-none appearance-none disabled:opacity-50"
                  >
                    <option value="">Select</option>
                    {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 tracking-tighter">Item Type</label>
                  <select value={itemType} onChange={e => setItemType(e.target.value)} disabled={!!csvFileName}
                    className="w-full bg-[#0d0b1a] border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-amber-500/50 outline-none appearance-none disabled:opacity-50"
                  >
                    <option value="note">Notes</option>
                    <option value="book">Books</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <div className="bg-black/30 rounded-2xl p-4 border border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500"><FiList /></div>
                  <div>
                    <p className="text-xs font-bold text-white leading-none">{files.length} Files</p>
                    <p className="text-[10px] text-gray-500 uppercase mt-1 tracking-wider">{totalSize} MB Total</p>
                  </div>
                </div>
                {uploading && <div className="text-xs font-black text-amber-400">{progress}%</div>}
              </div>

              <Btn variant="primary" className="w-full justify-center py-5 bg-gradient-to-r from-amber-600 to-orange-600 border-none shadow-2xl shadow-amber-900/30 text-base"
                onClick={handleBulkUpload} disabled={uploading || files.length === 0}>
                {uploading ? (progress < 10 ? 'Hashing Files...' : 'Deploying Batch...') : `🚀 Launch Batch Process`}
              </Btn>
            </div>
          </div>
        </div>

        <div className="xl:col-span-8 space-y-6">
          <AnimatePresence>
            {uploading && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FiActivity className="text-amber-400 animate-pulse" />
                    <span className="text-sm font-bold text-white tracking-wide">Bulk Upload Engine Active</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full uppercase font-bold tracking-widest">Processing</span>
                </div>
                <div className="h-4 bg-white/5 rounded-full overflow-hidden mb-6 border border-white/10 p-1">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400" />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Files', val: files.length, color: 'text-white' },
                    { label: 'Metadata', val: csvFileName ? 'CSV Linked' : 'Default', color: 'text-amber-400' },
                    { label: 'Progress', val: `${progress}%`, color: 'text-amber-400' },
                    { label: 'Hashing', val: progress < 10 ? 'ACTIVE' : 'DONE', color: progress < 10 ? 'text-blue-400' : 'text-emerald-400' }
                  ].map(s => (
                    <div key={s.label} className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                      <p className="text-[10px] text-gray-500 uppercase mb-1 tracking-tighter">{s.label}</p>
                      <p className={`text-xs font-black truncate ${s.color}`}>{s.val}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div {...getRootProps()} 
            className={`relative border-2 border-dashed rounded-[2.5rem] p-16 flex flex-col items-center justify-center transition-all duration-500 group cursor-pointer overflow-hidden ${isDragActive ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20'}`}>
            <input {...getInputProps()} />
            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition duration-500 relative z-10 border border-white/10">
              <FiUploadCloud size={38} />
            </div>
            <h3 className="mt-6 text-xl font-bold text-white relative z-10">Deploy batch PDFs</h3>
            <p className="text-sm text-gray-500 mt-2 relative z-10 font-medium">Drag and drop files to populate the queue</p>
          </div>

          {files.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col max-h-[600px]">
              <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <FiGrid className="text-amber-400" />
                  <span className="text-sm font-bold text-white uppercase tracking-widest">
                    Queue Details <span className="text-gray-500 ml-1">({files.length})</span>
                  </span>
                </div>
                {csvFileName && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-4 py-1.5 rounded-full border border-emerald-400/20">METADATA SYNCED</span>}
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                <AnimatePresence>
                  {files.map((file, idx) => {
                    const meta = csvMetadata[file.name];
                    return (
                      <motion.div key={`${file.name}-${idx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}
                        className="group flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-amber-500/20 hover:bg-amber-500/[0.02] transition-all">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 flex-shrink-0">
                            <FiFile size={22} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate group-hover:text-amber-400 transition">
                                {meta?.title || file.name}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-gray-600 font-bold tracking-wider">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                              <span className="text-[10px] text-gray-700">•</span>
                              <span className="text-[10px] text-gray-400 font-medium truncate">
                                {meta?.subject || subject || 'Default Subject'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => removeFile(idx)}
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100">
                          <FiTrash2 size={16} />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploadsTab;
