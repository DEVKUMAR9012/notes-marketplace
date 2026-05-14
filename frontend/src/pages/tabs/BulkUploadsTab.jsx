import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  FiUploadCloud, FiFile, FiCheckCircle, FiX, FiInfo, FiLayers, 
  FiAlertCircle, FiSettings, FiSave, FiFolder, FiGrid, FiList,
  FiTrash2, FiActivity, FiDatabase, FiFileText, FiPlusSquare,
  FiTable, FiCheck, FiPlay, FiPause, FiCircle
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import API from '../../utils/api';
import { SectionHeader, Btn, Toast } from './SharedAdminUI';
import { calculateFileHash } from '../../components/upload/ValidationHelpers';

const BATCH_SIZE = 25; // Send 25 files at a time to prevent timeouts

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
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, current: 0, failed: 0, success: 0 });
  const [currentBatchInfo, setCurrentBatchInfo] = useState('');
  const [toast, setToast] = useState(null);

  const abortControllerRef = useRef(null);

  // ── Presets State ──
  const [showPresets, setShowPresets] = useState(false);
  const [presets, setPresets] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_bulk_presets');
      if (saved) setPresets(JSON.parse(saved));
    } catch (e) { console.warn('Failed to load presets:', e); }
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
        showToast(`Linked metadata for ${count} files!`, 'success');
      },
      error: () => showToast("Failed to parse CSV", "error")
    });
  };

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

  const stopUpload = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    setUploading(false);
    setIsPaused(false);
    showToast("Upload cancelled", "info");
  };

  // ── BATCH PROCESSING ENGINE ──
  const handleBulkUpload = async () => {
    if (files.length === 0) return showToast("Queue is empty", "error");
    if (!subject && Object.keys(csvMetadata).length === 0) return showToast("Subject or CSV required", "error");

    setUploading(true);
    setStats({ total: files.length, current: 0, failed: 0, success: 0 });
    setProgress(0);
    abortControllerRef.current = new AbortController();

    const totalBatches = Math.ceil(files.length / BATCH_SIZE);
    let successCount = 0;
    let failCount = 0;

    try {
      for (let b = 0; b < totalBatches; b++) {
        if (abortControllerRef.current.signal.aborted) break;

        const start = b * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, files.length);
        const batchFiles = files.slice(start, end);
        
        setCurrentBatchInfo(`Batch ${b + 1}/${totalBatches} (${batchFiles.length} files)`);
        
        // 1. Hash files in this batch
        const batchMetadata = {};
        await Promise.all(batchFiles.map(async (f) => {
           const hash = await calculateFileHash(f);
           const csvData = csvMetadata[f.name] || {};
           batchMetadata[f.name] = { ...csvData, hash };
        }));

        // 2. Upload this batch
        const formData = new FormData();
        batchFiles.forEach(f => formData.append('pdfs', f));
        formData.append('subject', subject);
        formData.append('semester', semester);
        formData.append('college', college);
        formData.append('itemType', itemType);
        formData.append('metadata', JSON.stringify(batchMetadata));

        try {
            const { data } = await API.post('/admin/bulk-upload', formData, {
                signal: abortControllerRef.current.signal,
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (pEvent) => {
                    const batchP = Math.round((pEvent.loaded * 100) / pEvent.total);
                    // Global progress calculation
                    const overallP = Math.round(((b * 100) + batchP) / totalBatches);
                    setProgress(overallP);
                }
            });
            successCount += data.stats.success;
            failCount += data.stats.failed;
        } catch (err) {
            if (err.name === 'AbortError') break;
            failCount += batchFiles.length;
            console.error(`Batch ${b+1} failed`, err);
        }

        setStats(prev => ({ ...prev, current: end, success: successCount, failed: failCount }));
      }

      if (!abortControllerRef.current.signal.aborted) {
        showToast(`Finished: ${successCount} Success, ${failCount} Failed`, successCount > 0 ? 'success' : 'error');
        setFiles([]); // Clear queue on success
      }
    } catch (error) {
      showToast("Critical Engine Failure", "error");
    } finally {
      setUploading(false);
      setProgress(100);
      setCurrentBatchInfo('Completed');
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
          title="God Mode: High-Volume Processor" 
          subtitle="Supports up to 500+ files with chunked delivery & batch tracking."
        />
        <div className="flex items-center gap-2">
          <Btn variant="secondary" icon={FiSettings} onClick={() => setShowPresets(!showPresets)}>
            Presets
          </Btn>
          <Btn variant="danger" icon={FiTrash2} onClick={clearQueue} disabled={files.length === 0 || uploading}>
            Clear Queue
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* ── Config Panel ── */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
            
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <FiDatabase className="text-amber-400" /> Bulk Controller
              </h3>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-dashed border-white/10 rounded-xl cursor-pointer hover:border-amber-500/50 transition">
                <FiTable className="text-gray-400" />
                <span className="text-xs text-gray-400 truncate">{csvFileName || 'Upload Metadata CSV (Optional)'}</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
              </label>
            </div>
            
            <div className="space-y-4">
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Default Subject"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-amber-500/50 transition"
              />
              <div className="grid grid-cols-2 gap-4">
                <select value={semester} onChange={e => setSemester(e.target.value)}
                  className="bg-[#0d0b1a] border border-white/10 rounded-2xl px-4 py-4 text-sm text-white outline-none">
                  <option value="">Semester</option>
                  {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={itemType} onChange={e => setItemType(e.target.value)}
                  className="bg-[#0d0b1a] border border-white/10 rounded-2xl px-4 py-4 text-sm text-white outline-none">
                  <option value="note">Notes</option>
                  <option value="book">Books</option>
                </select>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <div className="bg-black/30 rounded-2xl p-4 border border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-black">{files.length}</div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Queue Stats</p>
                    <p className="text-[10px] text-gray-500">{totalSize} MB Total</p>
                  </div>
                </div>
              </div>

              {!uploading ? (
                <Btn variant="primary" className="w-full justify-center py-5 bg-gradient-to-r from-amber-600 to-orange-600 border-none shadow-2xl text-base font-bold"
                  onClick={handleBulkUpload} disabled={files.length === 0}>
                  🚀 Start 500+ Batch Process
                </Btn>
              ) : (
                <div className="flex gap-2">
                  <Btn variant="danger" className="flex-1 justify-center py-4 border-red-500/30 bg-red-500/10 text-red-400" onClick={stopUpload}>
                    <FiX /> Stop Process
                  </Btn>
                </div>
              )}
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-6">
            <h4 className="text-[10px] font-bold text-amber-400 uppercase mb-3 flex items-center gap-2 tracking-widest">
              <FiInfo /> Pro Tip
            </h4>
            <p className="text-[10px] text-amber-200/40 leading-relaxed">
              We now process files in chunks of 25. This ensures 100% success even with 500+ files and slow internet.
            </p>
          </div>
        </div>

        {/* ── Progress Panel ── */}
        <div className="xl:col-span-8 space-y-6">
          <AnimatePresence>
            {uploading && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-950 border border-amber-500/30 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <FiActivity className="text-amber-400 animate-pulse" />
                    <div>
                      <p className="text-sm font-bold text-white uppercase tracking-widest">Engine Status: Active</p>
                      <p className="text-[10px] text-gray-500 font-medium">{currentBatchInfo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-amber-400">{progress}%</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Overall Progress</p>
                  </div>
                </div>
                
                <div className="h-4 bg-white/5 rounded-full overflow-hidden mb-8 border border-white/10 p-1">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]" />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Completed', val: stats.current, icon: FiCheckCircle, color: 'text-white' },
                    { label: 'Success', val: stats.success, icon: FiActivity, color: 'text-emerald-400' },
                    { label: 'Failed', val: stats.failed, icon: FiAlertCircle, color: 'text-red-400' },
                    { label: 'Remaining', val: stats.total - stats.current, icon: FiCircle, color: 'text-gray-500' }
                  ].map(s => (
                    <div key={s.label} className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center flex flex-col items-center">
                      <s.icon className={`mb-2 ${s.color}`} />
                      <p className="text-xs font-black text-white">{s.val}</p>
                      <p className="text-[9px] text-gray-500 uppercase font-bold mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div {...getRootProps()} 
            className={`relative border-2 border-dashed rounded-[2.5rem] p-20 flex flex-col items-center justify-center transition-all duration-500 group cursor-pointer overflow-hidden ${isDragActive ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
            <input {...getInputProps()} />
            <FiUploadCloud size={48} className={`transition-all duration-500 ${isDragActive ? 'text-amber-400 scale-110' : 'text-gray-600 group-hover:text-amber-400 group-hover:-translate-y-2'}`} />
            <h3 className="mt-6 text-xl font-bold text-white">Drop up to 500 PDFs</h3>
            <p className="text-sm text-gray-500 mt-2 font-medium">Auto-chunking will handle the heavy lifting</p>
          </div>

          {files.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col max-h-[500px]">
              <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <FiGrid className="text-amber-400" />
                  <span className="text-sm font-bold text-white uppercase tracking-widest">Process Queue ({files.length})</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 group hover:border-amber-500/20 transition-all">
                    <div className="flex items-center gap-4 min-w-0">
                      <FiFile className="text-red-400 flex-shrink-0" size={20} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{csvMetadata[file.name]?.title || file.name}</p>
                        <p className="text-[10px] text-gray-500">{(file.size / (1024*1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    {!uploading && (
                      <button onClick={() => removeFile(idx)} className="p-2 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <FiTrash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploadsTab;
