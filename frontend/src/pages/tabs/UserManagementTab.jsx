import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { List } from 'react-window';
import {
  FiUsers, FiSearch, FiEye, FiLock, FiUnlock, FiTrash2,
  FiCreditCard, FiKey, FiMail
} from 'react-icons/fi';
import API from '../../utils/api';
import { useAdminStore } from '../../store/adminStore';
import { Shimmer, SectionHeader, Avatar, Badge, Btn, Modal, Toast, ConfirmationModal, fmt, fmtDate, fmtDateTime, useDebounce } from './SharedAdminUI';

const UserManagementTab = () => {
  const {
    users, setUsers,
    usersTotalPages: totalPages, setUsersTotalPages,
    usersPage: page, setUsersPage,
    usersSearch: search, setUsersSearch,
    usersRoleFilter: roleFilter, setUsersRoleFilter,
    usersStatusFilter: statusFilter, setUsersStatusFilter
  } = useAdminStore();

  const [loading, setLoading] = useState(!users.length);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModal, setUserModal] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [purchasesModal, setPurchasesModal] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const debouncedSearch = useDebounce(search, 500);

  const showToast = useCallback((msg, type = 'success') => { 
    setToast({ msg, type }); 
    setTimeout(() => setToast(null), 3500); 
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50, search: debouncedSearch, role: roleFilter, status: statusFilter });
      const res = await API.get(`/admin/users?${params}`);
      setUsers(res.data.users || res.data);
      setUsersTotalPages(res.data.pages || 1);
    } catch { 
      showToast('Failed to load users', 'error'); 
    } finally { 
      setLoading(false); 
    }
  }, [page, debouncedSearch, roleFilter, statusFilter, setUsers, setUsersTotalPages, showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const blockUser = useCallback(async (id, blocked) => {
    try {
      await API.patch(`/admin/users/${id}/block`, { blocked: !blocked });
      setUsers(users.map(x => x._id === id ? { ...x, isBlocked: !blocked } : x));
      showToast(`User ${!blocked ? 'blocked' : 'unblocked'} successfully`);
    } catch { showToast('Action failed', 'error'); }
  }, [users, setUsers, showToast]);

  const deleteUser = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await API.delete(`/admin/users/${confirmDelete.id}`);
      setUsers(users.filter(x => x._id !== confirmDelete.id));
      showToast('User deleted');
      setConfirmDelete(null);
    } catch { showToast('Delete failed', 'error'); }
  }, [confirmDelete, users, setUsers, showToast]);

  const changeRole = useCallback(async (id, role) => {
    try {
      await API.patch(`/admin/users/${id}/role`, { role });
      setUsers(users.map(x => x._id === id ? { ...x, role } : x));
      showToast('Role updated');
    } catch { showToast('Role update failed', 'error'); }
  }, [users, setUsers, showToast]);

  const forcePasswordReset = useCallback(async (id) => {
    try {
      await API.post(`/admin/users/${id}/force-reset`);
      showToast('Password reset email sent');
      setResetModal(false);
    } catch { showToast('Failed', 'error'); }
  }, [showToast]);

  const viewPurchases = useCallback(async (user) => {
    setSelectedUser(user);
    try {
      const res = await API.get(`/admin/users/${user._id}/purchases`);
      setPurchases(res.data || []);
    } catch { setPurchases([]); }
    setPurchasesModal(true);
  }, []);

  const filtered = useMemo(() => {
    return users.filter(u =>
      (!search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())) &&
      (!roleFilter || u.role === roleFilter) &&
      (!statusFilter || (statusFilter === 'blocked' ? u.isBlocked : !u.isBlocked))
    );
  }, [users, search, roleFilter, statusFilter]);

  // Virtualized Row Component
  const UserRow = useCallback(({ index, style }) => {
    const user = filtered[index];
    if (!user) return null;
    return (
      <div style={style} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group flex items-center px-5 text-sm">
        <div className="w-1/4 min-w-[200px] flex items-center gap-3">
          <Avatar name={user.name} src={user.avatar} />
          <span className="text-white font-medium truncate">{user.name}</span>
        </div>
        <div className="w-1/4 min-w-[150px] text-gray-400 truncate">{user.email}</div>
        <div className="w-1/6 min-w-[100px]">
          <select value={user.role || 'user'} onChange={e => changeRole(user._id, e.target.value)}
            className="bg-transparent text-xs font-semibold text-violet-400 focus:outline-none cursor-pointer">
            <option value="user">User</option>
            <option value="seller">Seller</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="w-1/6 min-w-[100px] text-gray-500 text-xs">{fmtDate(user.createdAt)}</div>
        <div className="w-1/6 min-w-[100px]">
          <Badge label={user.isBlocked ? 'Blocked' : 'Active'} color={user.isBlocked ? 'red' : 'green'} />
        </div>
        <div className="w-1/6 min-w-[140px] flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => { setSelectedUser(user); setUserModal(true); }} title="View Details"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"><FiEye size={14} /></button>
          <button onClick={() => viewPurchases(user)} title="View Purchases"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"><FiCreditCard size={14} /></button>
          <button onClick={() => { setSelectedUser(user); setResetModal(true); }} title="Force Password Reset"
            className="p-1.5 rounded-lg hover:bg-amber-500/20 text-gray-400 hover:text-amber-400 transition"><FiKey size={14} /></button>
          <button onClick={() => blockUser(user._id, user.isBlocked)} title={user.isBlocked ? 'Unblock' : 'Block'}
            className={`p-1.5 rounded-lg transition ${user.isBlocked ? 'hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400' : 'hover:bg-orange-500/20 text-gray-400 hover:text-orange-400'}`}>
            {user.isBlocked ? <FiUnlock size={14} /> : <FiLock size={14} />}
          </button>
          <button onClick={() => setConfirmDelete({ id: user._id, name: user.email })} title="Delete User"
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition"><FiTrash2 size={14} /></button>
        </div>
      </div>
    );
  }, [filtered, changeRole, blockUser, viewPurchases]);

  return (
    <div className="space-y-6 pb-12 pt-4">
      <Toast toast={toast} />
      <SectionHeader icon={FiUsers} iconColor="bg-blue-500/20 text-blue-400" title="User Management"
        subtitle="View, block, delete users and manage their purchases & roles" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
          <input value={search} onChange={e => setUsersSearch(e.target.value)} placeholder="Search by name or email…"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition" />
        </div>
        <select value={roleFilter} onChange={e => setUsersRoleFilter(e.target.value)}
          className="bg-[#0e0e1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500/50 transition">
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="seller">Seller</option>
          <option value="admin">Admin</option>
        </select>
        <select value={statusFilter} onChange={e => setUsersStatusFilter(e.target.value)}
          className="bg-[#0e0e1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500/50 transition">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Virtualized Table */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden min-w-[800px] overflow-x-auto">
        <div className="flex border-b border-white/[0.07] text-xs text-gray-500 uppercase tracking-wider px-5 py-4 font-semibold">
          <div className="w-1/4 min-w-[200px]">User</div>
          <div className="w-1/4 min-w-[150px]">Email</div>
          <div className="w-1/6 min-w-[100px]">Role</div>
          <div className="w-1/6 min-w-[100px]">Joined</div>
          <div className="w-1/6 min-w-[100px]">Status</div>
          <div className="w-1/6 min-w-[140px]">Actions</div>
        </div>
        {loading ? (
          <div className="flex flex-col">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex border-b border-white/[0.04] px-5 py-4 items-center">
                <Shimmer className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <List
            height={450}
            rowCount={filtered.length}
            rowHeight={68}
            rowComponent={UserRow}
            rowProps={{}}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 bg-white/5 border border-white/10 rounded-3xl">
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Btn onClick={() => setUsersPage(Math.max(1, page - 1))} disabled={page === 1} size="xs">← Prev</Btn>
            <Btn onClick={() => setUsersPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} size="xs">Next →</Btn>
          </div>
        </div>
      )}

      <ConfirmationModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={deleteUser}
        title="Confirm User Deletion"
        message={`Are you sure you want to delete ${confirmDelete?.name}? This action is irreversible.`}
        confirmText={confirmDelete?.name}
      />

      <Modal open={userModal} onClose={() => setUserModal(false)} title="User Security & Session Details">
        {selectedUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={selectedUser.name} src={selectedUser.avatar} size={16} />
              <div>
                <p className="text-white text-lg font-bold">{selectedUser.name}</p>
                <p className="text-gray-400 text-sm">{selectedUser.email}</p>
              </div>
              <Badge label={selectedUser.role || 'user'} color="violet" />
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'User ID', value: selectedUser._id },
                { label: 'Joined', value: fmtDate(selectedUser.createdAt) },
                { label: 'Last Login', value: fmtDateTime(selectedUser.lastLogin) },
                { label: 'Phone', value: selectedUser.phone || '—' },
                { label: 'College', value: selectedUser.college || '—' },
                { label: 'Uploads', value: selectedUser.notesCount || '—' },
                { label: 'Wallet Balance', value: `₹${fmt(selectedUser.walletBalance)}` },
                { label: 'Status', value: selectedUser.isBlocked ? 'Blocked' : 'Active' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <p className="text-gray-500 text-xs mb-1">{label}</p>
                  <p className="text-white text-sm font-medium break-all">{value}</p>
                </div>
              ))}
            </div>

            {/* Session Tracking & Device Integrity */}
            <div className="bg-violet-950/10 border border-violet-500/20 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>🛡️</span> Session Tracking &amp; Device Integrity
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[10px] text-gray-500 block mb-0.5">IP Address</span>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {selectedUser.lastLoginMetadata?.ipAddress || 'Not captured yet'}
                  </span>
                </div>
                <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[10px] text-gray-500 block mb-0.5">Approx. Location</span>
                  <span className="text-xs font-medium text-emerald-400">
                    {selectedUser.lastLoginMetadata?.location || 'Unknown'}
                  </span>
                </div>
              </div>
              <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
                <span className="text-[10px] text-gray-500 block mb-0.5">Active Browser / Client Device</span>
                <span
                  className="text-xs font-medium text-gray-300 block truncate"
                  title={selectedUser.lastLoginMetadata?.userAgent}
                >
                  {selectedUser.lastLoginMetadata?.browser || selectedUser.lastLoginMetadata?.userAgent || 'Unknown System'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Btn variant="danger" icon={FiLock} onClick={() => { blockUser(selectedUser._id, selectedUser.isBlocked); setUserModal(false); }}>
                {selectedUser.isBlocked ? 'Unblock User' : 'Block User'}
              </Btn>
              <Btn variant="warning" icon={FiKey} onClick={() => { setUserModal(false); setResetModal(true); }}>Force Reset Password</Btn>
              <Btn variant="ghost" icon={FiCreditCard} onClick={() => { setUserModal(false); viewPurchases(selectedUser); }}>View Purchases</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Force Reset Modal */}
      <Modal open={resetModal} onClose={() => setResetModal(false)} title="Force Password Reset" maxW="max-w-md">
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-sm text-amber-300">
            This will send a password reset email to <strong>{selectedUser?.email}</strong>. The user's current password will remain until they reset it.
          </div>
          <div className="flex gap-3">
            <Btn variant="warning" icon={FiMail} onClick={() => forcePasswordReset(selectedUser?._id)}>Send Reset Email</Btn>
            <Btn variant="ghost" onClick={() => setResetModal(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>

      {/* Purchases Modal */}
      <Modal open={purchasesModal} onClose={() => setPurchasesModal(false)} title={`Purchases — ${selectedUser?.name}`}>
        <div className="space-y-3">
          {purchases.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No purchases found.</p>
          ) : purchases.map((p, i) => (
            <div key={p._id || i} className="flex items-center justify-between p-3.5 rounded-2xl bg-black/30 border border-white/5">
              <div>
                <p className="text-white text-sm font-medium">{p.noteTitle || p.title}</p>
                <p className="text-gray-500 text-xs">{fmtDate(p.purchasedAt || p.createdAt)}</p>
              </div>
              <span className="text-violet-400 font-bold text-sm">₹{p.price}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default UserManagementTab;
