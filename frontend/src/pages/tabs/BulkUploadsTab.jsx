import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  FiUploadCloud, FiFile, FiCheckCircle, FiX, FiInfo, FiLayers, 
  FiAlertCircle, FiSettings, FiSave, FiFolder, FiGrid, FiList,
  FiTrash2, FiActivity, FiDatabase, FiFileText, FiPlusSquare,
  FiTable, FiCheck, FiPlay, FiPause, FiCircle, FiChevronDown, FiChevronUp,
  FiSearch
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import API from '../../utils/api';
import { SectionHeader, Btn, Toast, Modal } from './SharedAdminUI';
import { calculateFileHash } from '../../components/upload/ValidationHelpers';

const BATCH_SIZE = 5; 

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
  const [report, setReport] = useState(null); 
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
    if (files.length === 0) return;
    setUploading(true);
    setReport(null);
    setProgress(0);
    abortControllerRef.current = new AbortController();

    const finalStats = { success: 0, failed: 0, duplicates: 0, successFiles: [], failedFiles: [], duplicateFiles: [] };
    
    try {
      // 1. PHASE 1: Hashing & Duplicate Pre-Check
      setCurrentBatchInfo("Phase 1: Calculating Fingerprints (SHA-256)...");
      const fileHashes = [];
      const fileMap = new Map();

      for(let i=0; i<files.length; i++) {
        const hash = await calculateFileHash(files[i]);
        fileHashes.push(hash);
        fileMap.set(hash, files[i]);
        setProgress(Math.round(((i + 1) / files.length) * 10)); // First 10% for hashing
      }

      setCurrentBatchInfo("Phase 2: Syncing with Database...");
      const { data: dupData } = await API.post('/admin/check-duplicates', { hashes: fileHashes });
      const existingHashes = new Set(dupData.existingHashes);

      // Actually, let's rebuild the queue based on the check
      const cleanQueue = [];
      fileMap.forEach((file, hash) => {
          if (existingHashes.has(hash)) {
              finalStats.duplicates++;
              finalStats.duplicateFiles.push({ name: file.name, hash });
          } else {
              cleanQueue.push({ file, hash });
          }
      });

      setStats({ total: files.length, current: finalStats.duplicates, failed: 0, success: 0, duplicates: finalStats.duplicates });

      if (cleanQueue.length === 0) {
          showToast("All files are already in the database!", "info");
          setReport(finalStats);
          setShowReport(true);
          setUploading(false);
          return;
      }

      // 2. PHASE 2: Uploading Clean Queue in Batches
      const totalBatches = Math.ceil(cleanQueue.length / BATCH_SIZE);
      
      for (let b = 0; b < totalBatches; b++) {
        if (abortControllerRef.current.signal.aborted) break;

        const start = b * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, cleanQueue.length);
        const batchItems = cleanQueue.slice(start, end);
        
        setCurrentBatchInfo(`Phase 3: Uploading Batch ${b + 1}/${totalBatches}...`);
        
        const batchMetadata = {};
        const formData = new FormData();
        
        batchItems.forEach(item => {
            formData.append('pdfs', item.file);
            const csvData = csvMetadata[item.file.name] || {};
            batchMetadata[item.file.name] = { ...csvData, hash: item.hash };
        });

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
                    // Progress from 10% to 100%
                    const overallP = 10 + Math.round((((b * 100) + batchP) / totalBatches) * 0.9);
                    setProgress(overallP);
                }
            });
            finalStats.success += data.stats.success;
            finalStats.failed += data.stats.failed;
            finalStats.successFiles.push(...data.stats.successFiles);
            finalStats.failedFiles.push(...data.stats.failedFiles);
        } catch (err) {
            if (err.name === 'AbortError') break;
            finalStats.failed += batchItems.length;
            batchItems.forEach(item => finalStats.failedFiles.push({ name: item.file.name, error: "Network Error" }));
        }

        setStats(prev => ({ 
            ...prev, 
            current: finalStats.duplicates + finalStats.success + finalStats.failed,
            success: finalStats.success, 
            failed: finalStats.failed 
        }));
      }

      if (!abortControllerRef.current.signal.aborted) {
          setReport(finalStats);
          setShowReport(true);
          setFiles([]);
          showToast("Process complete", "success");
      }
    } catch (error) {
      console.error("Bulk Upload Error:", error);
      showToast(error?.response?.data?.message || error.message || "Engine Failure", "error");
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  return (
    <div className="space-y-6 pb-20 pt-4 max-w-7xl mx-auto px-4">
      <Toast toast={toast} />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <SectionHeader icon={FiLayers} iconColor="bg-amber-500/20 text-amber-400" title="Elite Bulk Uploader" subtitle="Advanced SHA-256 duplicate prevention & batch delivery." />
        <div className="flex items-center gap-2">
          {presets.length > 0 && (
              <select onChange={e => {
                  const p = presets.find(pr => pr.id === Number(e.target.value));
                  if(p) { setSubject(p.subject); setSemester(p.semester); setCollege(p.college); setItemType(p.itemType); }
              }} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none">
                  <option value="">Apply Preset...</option>
                  {presets.map(p => <option key={p.id} value={p.id}>{p.subject}</option>)}
              </select>
          )}
          <Btn variant="secondary" icon={FiSave} onClick={() => {
              if(!subject) return showToast("Subject required to save preset", "error");
              const p = [{id: Date.now(), subject, semester, college, itemType}, ...presets].slice(0,5);
              setPresets(p); localStorage.setItem('admin_bulk_presets', JSON.stringify(p)); showToast("Preset Saved!", "success");
          }}>Save Preset</Btn>
          {report && <Btn variant="ghost" onClick={() => setShowReport(true)} icon={FiList}>Last Report</Btn>}
          <Btn variant="danger" icon={FiTrash2} onClick={() => setFiles([])} disabled={uploading}>Clear</Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2"><FiDatabase className="text-amber-400" /> Controller</h3>
            
            <div className="space-y-4">
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-amber-500/50" />
              <input type="text" value={college} onChange={e => setCollege(e.target.value)} placeholder="College (Optional)" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-amber-500/50" />
              <div className="grid grid-cols-2 gap-4">
                  <select value={semester} onChange={e => setSemester(e.target.value)} className="bg-[#0d0b1a] border border-white/10 rounded-2xl px-4 py-4 text-xs text-white">
                      <option value="">Sem</option>
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={itemType} onChange={e => setItemType(e.target.value)} className="bg-[#0d0b1a] border border-white/10 rounded-2xl px-4 py-4 text-xs text-white">
                      <option value="note">Notes</option>
                      <option value="book">Books</option>
                  </select>
              </div>
            </div>

            <div className="pt-4">
              <Btn variant="primary" className="w-full justify-center py-5 bg-gradient-to-r from-amber-600 to-orange-600 border-none shadow-2xl text-base font-bold"
                onClick={handleBulkUpload} disabled={uploading || files.length === 0}>
                {uploading ? 'Processing...' : '🚀 Launch Bulk Engine'}
              </Btn>
              {uploading && (
                <button onClick={() => abortControllerRef.current.abort()} className="w-full mt-3 py-2 text-xs text-red-400 font-bold hover:underline flex items-center justify-center gap-2">
                   <FiPause /> Stop Process
                </button>
              )}
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-6">
              <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <FiSearch /> Smart Detection
              </p>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                  System automatically scans file contents (SHA-256) to prevent re-uploading existing documents.
              </p>
          </div>
        </div>

        <div className="xl:col-span-8 space-y-6">
          <AnimatePresence>
            {uploading && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-950 border border-amber-500/30 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <FiActivity className={`text-amber-400 ${progress < 100 ? 'animate-pulse' : ''}`} />
                    <div>
                      <p className="text-sm font-bold text-white uppercase tracking-widest">{currentBatchInfo}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Batch Engine active</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-amber-400">{progress}%</p>
                  </div>
                </div>
                <div className="h-4 bg-white/5 rounded-full overflow-hidden mb-8 border border-white/10 p-1">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Success', val: stats.success, color: 'text-emerald-400' },
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

          <div {...getRootProps()} className={`border-2 border-dashed rounded-[2.5rem] p-20 flex flex-col items-center justify-center transition-all ${isDragActive ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
            <input {...getInputProps()} />
            <FiUploadCloud size={48} className="text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white">Enterprise Bulk Engine</h3>
            <p className="text-sm text-gray-500 mt-2 font-medium">Up to 500 PDFs at once</p>
          </div>

          {files.length > 0 && !uploading && (
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Queue ({files.length})</p>
                <div className="flex gap-2">
                    <label className="text-[10px] bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full text-gray-400 cursor-pointer flex items-center gap-2">
                        <FiTable /> {csvFileName || 'CSV Metadata'}
                        <input type="file" accept=".csv" className="hidden" onChange={e => {
                            const file = e.target.files?.[0];
                            if(file) {
                                Papa.parse(file, { header: true, complete: (res) => {
                                    const map = {};
                                    res.data.forEach(r => { if(r.Filename) map[r.Filename] = r; });
                                    setCsvMetadata(map);
                                    setCsvFileName(file.name);
                                }});
                            }
                        }} />
                    </label>
                </div>
              </div>
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 group">
                    <span className="text-sm text-gray-300 truncate">{csvMetadata[f.name]?.Title || f.name}</span>
                    <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <FiX />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={showReport} onClose={() => setShowReport(false)} title="Batch Processing Audit" maxW="max-w-4xl">
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

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {report?.failedFiles?.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Failures</p>
                        {report.failedFiles.map((f, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs">
                                <span className="text-gray-300">{f.name}</span>
                                <span className="text-red-400 font-bold uppercase">{f.error}</span>
                            </div>
                        ))}
                    </div>
                )}
                {report?.duplicateFiles?.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Detected Duplicates (Skipped Upload)</p>
                        {report.duplicateFiles.map((f, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs">
                                <span className="text-gray-300">{f.name}</span>
                                <span className="text-amber-400 font-bold">ALREADY EXISTS</span>
                            </div>
                        ))}
                    </div>
                )}
                {report?.successFiles?.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Success Log</p>
                        {report.successFiles.slice(0, 15).map((f, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs text-gray-300">
                                <span>{f.name}</span>
                                <FiCheckCircle className="text-emerald-400" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default BulkUploadsTab;
