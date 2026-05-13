import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiFileText, FiSearch, FiEye, FiExternalLink, FiCheck, FiXCircle, FiTrash2 } from 'react-icons/fi';
import API from '../../utils/api';
import { Shimmer, SectionHeader, Badge, Btn, Modal, Toast, ConfirmationModal, fmtDate, useDebounce } from './SharedAdminUI';

const ContentModerationTab = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const debouncedSearch = useDebounce(search, 500);

  const showToast = useCallback((msg, type = 'success') => { 
    setToast({ msg, type }); 
    setTimeout(() => setToast(null), 3500); 
  }, []);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/notes?status=${filter}&search=${debouncedSearch}`);
      setNotes(res.data.notes || res.data || []);
    } catch { showToast('Failed to load notes', 'error'); }
    finally { setLoading(false); }
  }, [filter, debouncedSearch, showToast]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const moderate = useCallback(async (id, action) => {
    try {
      await API.patch(`/admin/notes/${id}/moderate`, { action });
      setNotes(n => n.filter(x => x._id !== id));
      showToast(`Note ${action}ed`);
    } catch { showToast('Action failed', 'error'); }
  }, [showToast]);

  const deleteNote = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await API.delete(`/admin/notes/${confirmDelete.id}`);
      setNotes(n => n.filter(x => x._id !== confirmDelete.id));
      showToast('Note deleted permanently');
      setConfirmDelete(null);
    } catch { showToast('Delete failed', 'error'); }
  }, [confirmDelete, showToast]);

  return (
    <div className="space-y-6 pb-12 pt-4">
      <Toast toast={toast} />
      <SectionHeader icon={FiFileText} iconColor="bg-orange-500/20 text-orange-400" title="Content Moderation"
        subtitle="Review, approve, reject, and remove uploaded notes" />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected', 'all'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition capitalize ${filter === s ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition" />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? [...Array(4)].map((_, i) => <Shimmer key={i} className="h-20" />) :
          notes.length === 0 ? <div className="text-center py-20 text-gray-600">No notes found.</div> :
            notes.map((note, i) => (
              <motion.div key={note._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.07] transition group">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <FiFileText size={20} className="text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{note.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    By {note.uploadedBy?.name || 'Unknown'} · {fmtDate(note.createdAt)} · {note.subject || ''} · ₹{note.price || 0}
                  </p>
                </div>
                <Badge label={note.status || 'pending'}
                  color={note.status === 'approved' ? 'green' : note.status === 'rejected' ? 'red' : 'yellow'} />
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setPreview(note)} title="Preview"
                    className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition"><FiEye size={15} /></button>
                  {note.fileUrl && (
                    <a href={note.fileUrl} target="_blank" rel="noreferrer"
                      className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition"><FiExternalLink size={15} /></a>
                  )}
                  <button onClick={() => moderate(note._id, 'approve')}
                    className="p-2 rounded-xl hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition" title="Approve"><FiCheck size={15} /></button>
                  <button onClick={() => moderate(note._id, 'reject')}
                    className="p-2 rounded-xl hover:bg-orange-500/20 text-gray-400 hover:text-orange-400 transition" title="Reject"><FiXCircle size={15} /></button>
                  <button onClick={() => setConfirmDelete({ id: note._id, name: note.title })}
                    className="p-2 rounded-xl hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition" title="Delete"><FiTrash2 size={15} /></button>
                </div>
              </motion.div>
            ))
        }
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Note Preview">
        {preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[['Title', preview.title], ['Subject', preview.subject], ['Price', `₹${preview.price}`], ['Pages', preview.pageCount || '—'],
              ['Uploaded By', preview.uploadedBy?.name], ['Email', preview.uploadedBy?.email],
              ['Date', fmtDate(preview.createdAt)], ['Status', preview.status]].map(([k, v]) => (
                <div key={k} className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <p className="text-gray-500 text-xs">{k}</p>
                  <p className="text-white text-sm font-medium mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            {preview.description && (
              <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                <p className="text-gray-500 text-xs mb-2">Description</p>
                <p className="text-gray-300 text-sm">{preview.description}</p>
              </div>
            )}
            <div className="flex gap-3">
              <Btn variant="success" icon={FiCheck} onClick={() => { moderate(preview._id, 'approve'); setPreview(null); }}>Approve</Btn>
              <Btn variant="warning" icon={FiXCircle} onClick={() => { moderate(preview._id, 'reject'); setPreview(null); }}>Reject</Btn>
              <Btn variant="danger" icon={FiTrash2} onClick={() => { setConfirmDelete({ id: preview._id, name: preview.title }); setPreview(null); }}>Delete</Btn>
              {preview.fileUrl && <a href={preview.fileUrl} target="_blank" rel="noreferrer"><Btn icon={FiExternalLink}>Open File</Btn></a>}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={deleteNote}
        title="Confirm Note Deletion"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmText={confirmDelete?.name}
      />
    </div>
  );
};

export default ContentModerationTab;
