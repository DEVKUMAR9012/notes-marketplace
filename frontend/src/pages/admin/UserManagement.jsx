import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiShield, FiSlash, FiCheckCircle, FiMoreVertical, FiUser, FiActivity } from 'react-icons/fi';
import API from '../../utils/api';

const AVATAR_COLORS = [
  'bg-violet-600/30 text-violet-300',
  'bg-indigo-600/30 text-indigo-300',
  'bg-cyan-600/30 text-cyan-300',
  'bg-emerald-600/30 text-emerald-300',
  'bg-amber-600/30 text-amber-300',
  'bg-rose-600/30 text-rose-300',
  'bg-pink-600/30 text-pink-300',
  'bg-sky-600/30 text-sky-300',
];

function avatarColor(name) {
  const safeName = name || '?'; 
  const code = safeName.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = useCallback(async (searchQuery = '', pageNum = 1) => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/users?page=${pageNum}&limit=10&search=${searchQuery}`);
      setUsers(res.data.users);
      setTotalPages(res.data.pagination.pages);
      setPage(res.data.pagination.page);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(search, 1);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, fetchUsers]);

  const toggleVerification = async (id) => {
    try {
      const res = await API.put(`/admin/users/${id}/verify`);
      if (res.data.success) {
        setUsers(users.map(u => u._id === id ? { ...u, isVerified: res.data.isVerified } : u));
      }
    } catch (err) {
      console.error('Failed to toggle verification', err);
      alert('Failed to update user');
    }
  };

  const toggleBlock = async (id) => {
    try {
      const res = await API.put(`/admin/users/${id}/block`);
      if (res.data.success) {
        setUsers(users.map(u => u._id === id ? { ...u, isBlocked: res.data.isBlocked } : u));
      }
    } catch (err) {
      console.error('Failed to toggle block status', err);
      alert(err.response?.data?.message || 'Failed to update user');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage sellers, verify accounts, and monitor platform activity.</p>
        </div>
        <div className="relative w-full md:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 text-xs uppercase tracking-wider text-gray-500 border-b border-white/10">
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Stats</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                      <p>Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No users found matching "{search}"
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <motion.tr 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    key={user._id} 
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${avatarColor(user.name)}`}>
                          {user.avatar || user.profileImage 
                            ? <img src={user.avatar || user.profileImage} className="w-full h-full object-cover rounded-full" alt="" />
                            : user.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-white font-medium flex items-center gap-1.5">
                            {user.name}
                            {user.isVerified && <FiCheckCircle className="text-blue-400" size={14} title="Verified Seller" />}
                          </p>
                          <p className="text-gray-500 text-xs">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${user.role === 'admin' ? 'bg-violet-500/20 text-violet-400' : 'bg-white/10 text-gray-400'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 text-xs text-gray-400">
                        <span>Notes: <strong className="text-white">{user.uploadedNotesCount || 0}</strong></span>
                        <span>Earned: <strong className="text-emerald-400">₹{user.totalEarnings || 0}</strong></span>
                      </div>
                    </td>
                    <td className="p-4">
                      {user.isBlocked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
                          <FiSlash size={12} /> Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                          <FiCheckCircle size={12} /> Active
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleVerification(user._id)}
                          className={`p-2 rounded-lg transition-colors ${user.isVerified ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                          title={user.isVerified ? "Remove Verification" : "Verify User"}
                        >
                          <FiShield size={16} />
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => toggleBlock(user._id)}
                            className={`p-2 rounded-lg transition-colors ${user.isBlocked ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-red-400'}`}
                            title={user.isBlocked ? "Unblock User" : "Block User"}
                          >
                            <FiSlash size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10 bg-black/20">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => fetchUsers(search, page - 1)}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 text-sm transition"
              >
                Previous
              </button>
              <button 
                disabled={page === totalPages}
                onClick={() => fetchUsers(search, page + 1)}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 text-sm transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
