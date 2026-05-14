import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  FiUploadCloud, FiFile, FiCheckCircle, FiX, FiInfo, FiLayers, 
  FiAlertCircle, FiSettings, FiSave, FiFolder, FiGrid, FiList,
  FiTrash2, FiActivity, FiDatabase, FiFileText, FiPlusSquare,
  FiTable, FiCheck, FiPlay, FiPause, FiCircle, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import API from '../../utils/api';
import { SectionHeader, Btn, Toast, Modal } from './SharedAdminUI';
import { calculateFileHash } from '../../components/upload/ValidationHelpers';

const BATCH_SIZE = 25; 

const BulkUploadsTab = () => {
  const [files, setFiles] = useState([]);
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('');
  const [college, setCollege] = useState('');
  const [itemType, setItemType] = useState('note');
  
  const [csvMetadata, setCsvMetadata] = useState({});
  const [csvFileName, setCsvFileName] = useState('');

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, current: 0, failed: 0, success: 0, duplicates: 0 });
  const [report, setReport] = useState(null); // Detailed report from server
  const [showReport, setShowReport] = useState(false);
  
  const [currentBatchInfo, setCurrentBatchInfo] = useState('');
  const [toast, setToast] = useState(null);

  const abortControllerRef = useRef(null);
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

  const handleCSVImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapping = {};
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
          }
        });
        setCsvMetadata(mapping);
        setCsvFileName(file.name);
        showToast("CSV metadata loaded!", "success");
      },
      error: () => showToast("CSV Error", "error")
    });
  };

  const onDrop = useCallback((acceptedFiles) => {
    const pdfs = acceptedFiles.filter(f => f.type === 'application/pdf');
    setFiles(prev => {
        const existingNames = new Set(prev.map(f => f.name));
        return [...prev, ...pdfs.filter(f => !existingNames.has(f.name))];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    maxSize: 100 * 1024 * 1024 
  });

  const handleBulkUpload = async () => {
    setUploading(true);
    setReport(null);
    setStats({ total: files.length, current: 0, failed: 0, success: 0, duplicates: 0 });
    setProgress(0);
    abortControllerRef.current = new AbortController();

    const totalBatches = Math.ceil(files.length / BATCH_SIZE);
    let finalStats = { success: 0, failed: 0, duplicates: 0, successFiles: [], failedFiles: [], duplicateFiles: [] };

    try {
      for (let b = 0; b < totalBatches; b++) {
        if (abortControllerRef.current.signal.aborted) break;

        const start = b * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, files.length);
        const batchFiles = files.slice(start, end);
        setCurrentBatchInfo(`Processing Batch ${b + 1}/${totalBatches}...`);
        
        const batchMetadata = {};
        await Promise.all(batchFiles.map(async (f) => {
           const hash = await calculateFileHash(f);
           const csvData = csvMetadata[f.name] || {};
           batchMetadata[f.name] = { ...csvData, hash };
        }));

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
                onUploadProgress: (pEvent) => {
                    const batchP = Math.round((pEvent.loaded * 100) / pEvent.total);
                    setProgress(Math.round(((b * 100) + batchP) / totalBatches));
                }
            });
            // Accumulate detailed stats
            finalStats.success += data.stats.success;
            finalStats.failed += data.stats.failed;
            finalStats.duplicates += data.stats.duplicates;
            finalStats.successFiles.push(...data.stats.successFiles);
            finalStats.failedFiles.push(...data.stats.failedFiles);
            finalStats.duplicateFiles.push(...data.stats.duplicateFiles);
        } catch (err) {
            if (err.name === 'AbortError') break;
            finalStats.failed += batchFiles.length;
            batchFiles.forEach(f => finalStats.failedFiles.push({ name: f.name, error: "Network or Server Timeout" }));
        }

        setStats(prev => ({ 
            ...prev, 
            current: end, 
            success: finalStats.success, 
            failed: finalStats.failed, 
            duplicates: finalStats.duplicates 
        }));
      }

      setReport(finalStats);
      setShowReport(true);
      if (!abortControllerRef.current.signal.aborted) {
        showToast("Upload completed with detailed report", "info");
        setFiles([]);
      }
    } catch (error) {
      showToast("Upload Engine Error", "error");
    } finally {
      setUploading(false);
      setProgress(100);
      setCurrentBatchInfo('Processing Complete');
    }
  };

  return (
    <div className="space-y-6 pb-20 pt-4 max-w-7xl mx-auto px-4">
      <Toast toast={toast} />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <SectionHeader 
          icon={FiLayers} 
          iconColor="bg-amber-500/20 text-amber-400"
          title="Admin God Mode" 
          subtitle="High-performance batch engine with audit reporting."
        />
        <div className="flex items-center gap-2">
          {report && <Btn variant="ghost" onClick={() => setShowReport(true)} icon={FiList}>View Last Report</Btn>}
          <Btn variant="danger" icon={FiTrash2} onClick={() => setFiles([])} disabled={uploading}>Clear Queue</Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left: Controls */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2"><FiDatabase className="text-amber-400" /> Controller</h3>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-dashed border-white/10 rounded-xl cursor-pointer hover:border-amber-500/50 transition">
                <FiTable className="text-gray-400" />
                <span className="text-xs text-gray-400 truncate">{csvFileName || 'Attach Metadata CSV'}</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
              </label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Common Subject" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-amber-500/50" />
            </div>

            <div className="pt-4">
              <Btn variant="primary" className="w-full justify-center py-5 bg-gradient-to-r from-amber-600 to-orange-600 border-none shadow-2xl text-base font-bold"
                onClick={handleBulkUpload} disabled={uploading || files.length === 0}>
                {uploading ? 'Processing Engine Active...' : '🚀 Start Bulk Batch'}
              </Btn>
              {uploading && (
                <button onClick={() => abortControllerRef.current.abort()} className="w-full mt-3 py-2 text-xs text-red-400 font-bold hover:underline">
                  Emergency Stop
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Progress & Queue */}
        <div className="xl:col-span-8 space-y-6">
          <AnimatePresence>
            {uploading && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-950 border border-amber-500/30 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <FiActivity className="text-amber-400 animate-pulse" />
                    <div>
                      <p className="text-sm font-bold text-white uppercase">{currentBatchInfo}</p>
                      <p className="text-[10px] text-gray-500">{progress}% Total Progress</p>
                    </div>
                  </div>
                </div>
                <div className="h-4 bg-white/5 rounded-full overflow-hidden mb-8 border border-white/10 p-1">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Successful', val: stats.success, color: 'text-emerald-400' },
                    { label: 'Duplicates', val: stats.duplicates, color: 'text-amber-400' },
                    { label: 'Failed', val: stats.failed, color: 'text-red-400' }
                  ].map(s => (
                    <div key={s.label} className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                      <p className="text-xl font-black text-white">{s.val}</p>
                      <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">{s.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div {...getRootProps()} className={`border-2 border-dashed rounded-[2.5rem] p-16 flex flex-col items-center justify-center transition-all ${isDragActive ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
            <input {...getInputProps()} />
            <FiUploadCloud size={48} className="text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white">Batch Upload Engine</h3>
            <p className="text-sm text-gray-500 mt-2 font-medium">Drag and drop PDFs here</p>
          </div>

          {files.length > 0 && !uploading && (
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Queued Files ({files.length})</p>
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <span className="text-sm text-gray-300 truncate">{f.name}</span>
                    <FiFile className="text-gray-600" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* REPORT MODAL */}
      <Modal open={showReport} onClose={() => setShowReport(false)} title="Audit Report: Batch Upload" maxW="max-w-4xl">
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-emerald-400">{report?.success}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Successfully Created</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-amber-400">{report?.duplicates}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Duplicates (Skipped)</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-red-400">{report?.failed}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Failed Files</p>
                </div>
            </div>

            <div className="space-y-4">
                {report?.failedFiles?.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Failed Files Log</p>
                        <div className="space-y-1">
                            {report.failedFiles.map((f, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                                    <span className="text-xs text-gray-300">{f.name}</span>
                                    <span className="text-[10px] text-red-400 font-bold uppercase">{f.error}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {report?.duplicateFiles?.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Duplicate Files (Already Exist)</p>
                        <div className="space-y-1">
                            {report.duplicateFiles.map((f, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                    <span className="text-xs text-gray-300">{f.name}</span>
                                    <span className="text-[10px] text-amber-400 font-bold">DUPLICATE HASH</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {report?.successFiles?.length > 0 && (
                     <div className="space-y-2">
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Success Log (Top 10)</p>
                        <div className="space-y-1">
                            {report.successFiles.slice(0, 10).map((f, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                    <span className="text-xs text-gray-300">{f.name}</span>
                                    <FiCheckCircle className="text-emerald-400" size={14} />
                                </div>
                            ))}
                            {report.successFiles.length > 10 && <p className="text-center text-[10px] text-gray-500">...and {report.successFiles.length - 10} more files</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default BulkUploadsTab;
