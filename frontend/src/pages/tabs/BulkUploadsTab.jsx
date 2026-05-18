import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  FiUploadCloud, FiCheckCircle, FiX, FiLayers, FiSave,
  FiTrash2, FiActivity, FiDatabase, FiList,
  FiTable, FiPause, FiSearch
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import API from '../../utils/api';
import { SectionHeader, Btn, Toast, Modal } from './SharedAdminUI';
import { calculateFileHash } from '../../components/upload/ValidationHelpers';

const BATCH_SIZE = 20;

// Unique key per file (name + size + lastModified)
const fileKey = (f) => `${f.name}_${f.size}_${f.lastModified}`;

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
  const toastTimeout = useRef(null);
  const [presets, setPresets] = useState([]);

  // Load presets
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_bulk_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setPresets(parsed);
      }
    } catch (e) {
      console.warn('Corrupt presets — clearing:', e);
      localStorage.removeItem('admin_bulk_presets');
    }
  }, []);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => { if (toastTimeout.current) clearTimeout(toastTimeout.current); };
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const savePreset = useCallback(() => {
    if (!subject) return showToast('Subject required to save preset', 'error');
    // ✅ FIX #5: Replace existing preset with same subject instead of duplicating
    const next = [
      { id: Date.now(), subject, semester, college, itemType },
      ...presets.filter(p => p.subject !== subject),
    ].slice(0, 5);
    setPresets(next);
    localStorage.setItem('admin_bulk_presets', JSON.stringify(next));
    showToast('Preset saved!', 'success');
  }, [subject, semester, college, itemType, presets, showToast]);

  const onDrop = useCallback((acceptedFiles) => {
    const pdfs = acceptedFiles.filter(f => f.type === 'application/pdf');
    setFiles(prev => {
      const existingKeys = new Set(prev.map(fileKey));
      return [...prev, ...pdfs.filter(f => !existingKeys.has(fileKey(f)))];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    maxSize: 100 * 1024 * 1024,
  });

  const handleBulkUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setReport(null);
    setProgress(0);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const finalStats = {
      success: 0, failed: 0, duplicates: 0,
      successFiles: [], failedFiles: [], duplicateFiles: [],
    };

    try {
      const totalBatches = Math.ceil(files.length / BATCH_SIZE);

      for (let b = 0; b < totalBatches; b++) {
        // ── Abort check: top of every batch ──────────────────────────
        if (signal.aborted) break;

        setCurrentBatchInfo(`Processing batch ${b + 1} of ${totalBatches}...`);

        const batchFiles = files.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);

        // ── STEP 1: Hash this batch ───────────────────────────────────
        // ✅ FIX #3: Map hash → File[] (array) to handle same-content files
        const hashToFilesMap = new Map();
        const fileHashes = [];

        for (const file of batchFiles) {
          const hash = await calculateFileHash(file);
          fileHashes.push(hash);
          const existing = hashToFilesMap.get(hash) || [];
          hashToFilesMap.set(hash, [...existing, file]);
        }

        // ── STEP 2: Server duplicate check ───────────────────────────
        if (signal.aborted) break; // ✅ FIX #4: Check after async hash too

        const { data: dupData } = await API.post('/admin/check-duplicates', {
          hashes: [...new Set(fileHashes)], // send unique hashes only
        });
        const existingHashes = new Set(dupData.existingHashes);

        // ✅ FIX #4: Check again after the API call
        if (signal.aborted) break;

        // ── Build clean queue ─────────────────────────────────────────
        const cleanItems = [];
        hashToFilesMap.forEach((filesForHash, hash) => {
          if (existingHashes.has(hash)) {
            // All files with this hash are duplicates
            filesForHash.forEach(file => {
              finalStats.duplicates++;
              finalStats.duplicateFiles.push({ name: file.name, hash });
            });
          } else {
            // ✅ FIX #3: Upload only the FIRST file if multiple have same hash
            // (they're identical content — uploading one is enough)
            cleanItems.push({ file: filesForHash[0], hash });
            if (filesForHash.length > 1) {
              filesForHash.slice(1).forEach(f => {
                finalStats.duplicates++;
                finalStats.duplicateFiles.push({ name: f.name, hash, note: 'Same content as ' + filesForHash[0].name });
              });
            }
          }
        });

        setStats(prev => ({
          ...prev,
          total: files.length,
          current: (b + 1) * BATCH_SIZE,
          duplicates: finalStats.duplicates,
        }));

        // ── STEP 3: Upload clean files ────────────────────────────────
        if (cleanItems.length > 0 && !signal.aborted) {
          const formData = new FormData();
          const batchMeta = {};

          cleanItems.forEach(({ file, hash }) => {
            formData.append('pdfs', file, file.name);
            const normalizedName = file.name.trim().toLowerCase();
            const csvData = csvMetadata[normalizedName] || {};
            batchMeta[file.name] = { ...csvData, hash };
          });

          formData.append('subject', subject);
          formData.append('semester', semester);
          formData.append('college', college);
          formData.append('itemType', itemType);
          formData.append('metadata', JSON.stringify(batchMeta));

          try {
            const { data } = await API.post('/admin/bulk-upload', formData, {
              signal,
              timeout: 1000 * 60 * 15, // 15 min per batch
            });

            finalStats.success += data.stats.success;
            finalStats.failed += data.stats.failed;
            finalStats.successFiles.push(...data.stats.successFiles);
            finalStats.failedFiles.push(...data.stats.failedFiles);

          } catch (err) {
            if (err.name === 'AbortError' || signal.aborted) break;
            const msg = err?.response?.data?.message || err?.message || 'Network Error';
            console.error(`Batch ${b + 1} failed:`, msg);
            finalStats.failed += cleanItems.length;
            cleanItems.forEach(({ file }) =>
              finalStats.failedFiles.push({ name: file.name, error: msg })
            );
          }
        }

        // ── Progress ──────────────────────────────────────────────────
        setProgress(Math.round(((b + 1) / totalBatches) * 100));
        setStats(prev => ({
          ...prev,
          success: finalStats.success,
          failed: finalStats.failed,
        }));
      } // end batch loop

      // ✅ FIX #1 + #2: Show report / toast ONLY if not aborted
      if (!signal.aborted) {
        setProgress(100);
        setReport(finalStats);
        setShowReport(true);
        setFiles([]);
        showToast(
          `Done! ✅ ${finalStats.success} uploaded · ⚠️ ${finalStats.duplicates} skipped · ❌ ${finalStats.failed} failed`,
          finalStats.failed > 0 ? 'error' : 'success'
        );
      } else {
        showToast('Upload stopped by user.', 'warning');
      }

    } catch (error) {
      console.error('Bulk upload error:', error);
      showToast(error?.response?.data?.message || error.message || 'Engine failure', 'error');
    } finally {
      setUploading(false);
      // ✅ FIX #2: Do NOT set progress(100) here — already done above conditionally
    }
  };

  // ✅ FIX #6: Delete file by unique key, not by index
  const removeFile = useCallback((file) => {
    setFiles(prev => prev.filter(f => fileKey(f) !== fileKey(file)));
  }, []);

  return (
    <div className="space-y-6 pb-20 pt-4 max-w-7xl mx-auto px-4">
      <Toast toast={toast} />

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <SectionHeader
          icon={FiLayers}
          iconColor="bg-amber-500/20 text-amber-400"
          title="Elite Bulk Uploader"
          subtitle="Chunked pipeline · SHA-256 dedup · up to 500 PDFs"
        />
        <div className="flex items-center gap-2 flex-wrap">
          {presets.length > 0 && (
            <select
              onChange={e => {
                const p = presets.find(pr => pr.id === Number(e.target.value));
                if (p) { setSubject(p.subject); setSemester(p.semester); setCollege(p.college); setItemType(p.itemType); }
              }}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              <option value="">Apply Preset...</option>
              {presets.map(p => <option key={p.id} value={p.id}>{p.subject}</option>)}
            </select>
          )}
          <Btn variant="secondary" icon={FiSave} onClick={savePreset}>Save Preset</Btn>
          {report && <Btn variant="ghost" onClick={() => setShowReport(true)} icon={FiList}>Last Report</Btn>}
          <Btn variant="danger" icon={FiTrash2} onClick={() => setFiles([])} disabled={uploading}>Clear</Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

        {/* ── LEFT: Controller ── */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <FiDatabase className="text-amber-400" /> Controller
            </h3>

            <input
              type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-amber-500/50 transition-colors"
            />
            <input
              type="text" value={college} onChange={e => setCollege(e.target.value)}
              placeholder="College / Department (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-amber-500/50 transition-colors"
            />
            <div className="grid grid-cols-2 gap-4">
              <select
                value={semester} onChange={e => setSemester(e.target.value)}
                className="bg-[#0d0b1a] border border-white/10 rounded-2xl px-4 py-4 text-xs text-white"
              >
                <option value="">Semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
              <select
                value={itemType} onChange={e => setItemType(e.target.value)}
                className="bg-[#0d0b1a] border border-white/10 rounded-2xl px-4 py-4 text-xs text-white"
              >
                <option value="note">Notes</option>
                <option value="book">Books</option>
              </select>
            </div>

            <Btn
              variant="primary"
              className="w-full justify-center py-5 bg-gradient-to-r from-amber-600 to-orange-600 border-none shadow-2xl text-base font-bold"
              onClick={handleBulkUpload}
              disabled={uploading || files.length === 0}
            >
              {uploading ? 'Processing...' : `🚀 Upload ${files.length > 0 ? `${files.length} PDFs` : ''}`}
            </Btn>

            {uploading && (
              <button
                onClick={() => abortControllerRef.current?.abort()}
                className="w-full mt-2 py-2 text-xs text-red-400 font-bold hover:underline flex items-center justify-center gap-2"
              >
                <FiPause /> Stop Process
              </button>
            )}
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-6">
            <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
              <FiSearch /> Smart Detection
            </p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Files are hashed (SHA-256) batch-by-batch to save RAM. Duplicates detected server-side and skipped automatically.
            </p>
          </div>
        </div>

        {/* ── RIGHT: Drop zone + queue ── */}
        <div className="xl:col-span-8 space-y-6">

          {/* Progress panel */}
          <AnimatePresence>
            {uploading && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-950 border border-amber-500/30 rounded-[2.5rem] p-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <FiActivity className="text-amber-400 animate-pulse" />
                    <div>
                      <p className="text-sm font-bold text-white uppercase tracking-widest">{currentBatchInfo}</p>
                      <p className="text-[10px] text-gray-500">
                        {Math.min(stats.current, stats.total)} / {stats.total} processed
                      </p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-amber-400">{progress}%</p>
                </div>

                <div className="h-4 bg-white/5 rounded-full overflow-hidden mb-8 border border-white/10 p-1">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Success', val: stats.success, color: 'text-emerald-400' },
                    { label: 'Duplicates', val: stats.duplicates, color: 'text-amber-400' },
                    { label: 'Failed', val: stats.failed, color: 'text-red-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                      <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                      <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">{s.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-[2.5rem] p-20 flex flex-col items-center justify-center transition-all cursor-pointer
              ${isDragActive ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 bg-white/[0.02] hover:border-amber-500/30'}`}
          >
            <input {...getInputProps()} />
            <FiUploadCloud size={48} className="text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white">
              {isDragActive ? 'Drop PDFs here!' : 'Enterprise Bulk Engine'}
            </h3>
            <p className="text-sm text-gray-500 mt-2 font-medium">Up to 500 PDFs · 100MB each</p>
          </div>

          {/* File queue */}
          {files.length > 0 && !uploading && (
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Queue ({files.length} PDFs)
                </p>
                <label className="text-[10px] bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full text-gray-400 cursor-pointer flex items-center gap-2">
                  <FiTable /> {csvFileName || 'CSV Metadata'}
                  <input
                    type="file" accept=".csv" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      Papa.parse(file, {
                        header: true,
                        complete: ({ data }) => {
                          const map = {};
                          let warnings = 0;
                          data.forEach(row => {
                            const cleanName = (row.Filename || '').trim().toLowerCase();
                            if (cleanName && Object.keys(row).length > 1) {
                              map[cleanName] = row;
                            } else if (Object.keys(row).length > 1) {
                              warnings++;
                            }
                          });
                          setCsvMetadata(map);
                          setCsvFileName(file.name);
                          if (warnings > 0) showToast(`CSV loaded. ${warnings} invalid rows skipped.`, 'warning');
                          else showToast('CSV metadata mapped!', 'success');
                        },
                      });
                    }}
                  />
                </label>
              </div>

              <div className="space-y-2">
                {/* Render only first 50 to prevent UI freeze */}
                {files.slice(0, 50).map((f) => (
                  <div
                    key={fileKey(f)}
                    className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm text-gray-300 truncate">
                        {csvMetadata[f.name.trim().toLowerCase()]?.Title || f.name}
                      </span>
                      <span className="text-[10px] text-gray-600 shrink-0">
                        {(f.size / 1024 / 1024).toFixed(1)}MB
                      </span>
                    </div>
                    {/* ✅ FIX #6: Remove by unique key, not by index */}
                    <button
                      onClick={() => removeFile(f)}
                      className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}

                {files.length > 50 && (
                  <div className="p-4 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
                    <p className="text-xs text-amber-500 font-bold uppercase tracking-widest">
                      + {files.length - 50} more files in secure queue
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Report Modal ── */}
      <Modal open={showReport} onClose={() => setShowReport(false)} title="Batch Processing Audit" maxW="max-w-4xl">
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">{report?.success ?? 0}</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Successfully Created</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-amber-400">{report?.duplicates ?? 0}</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Duplicates (Skipped)</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-red-400">{report?.failed ?? 0}</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Failed Files</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {report?.failedFiles?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest">❌ Failures</p>
                {report.failedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs">
                    <span className="text-gray-300 truncate">{f.name}</span>
                    <span className="text-red-400 font-bold uppercase shrink-0 ml-2">{f.error}</span>
                  </div>
                ))}
              </div>
            )}

            {report?.duplicateFiles?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">⚠️ Duplicates (Skipped)</p>
                {report.duplicateFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs">
                    <span className="text-gray-300 truncate">{f.name}</span>
                    <span className="text-amber-400 font-bold shrink-0 ml-2">
                      {f.note || 'ALREADY EXISTS'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {report?.successFiles?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  ✅ Success Log {report.successFiles.length > 15 ? `(showing 15 of ${report.successFiles.length})` : ''}
                </p>
                {report.successFiles.slice(0, 15).map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs text-gray-300">
                    <span className="truncate">{f.name}</span>
                    <FiCheckCircle className="text-emerald-400 shrink-0 ml-2" />
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