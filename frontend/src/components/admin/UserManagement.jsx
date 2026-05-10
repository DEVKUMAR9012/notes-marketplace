import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, FiSearch, FiFilter, FiMoreVertical, 
  FiCheckCircle, FiXCircle, FiSlash, FiClock,
  FiMail, FiShield, FiCalendar
} from 'react-icons/fi';
import API from '../../utils/api';

const StatusBadge = ({ status }) => {
  const styles = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blocked: 'bg-red-500/10 text-red-400 border-red-500/20',
    verified: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  const labels = {
    active: 'Active',
    pending: 'Pending Verification',
    blocked: 'Blocked',
    verified: 'Verified Seller',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${styles[status] || styles.active}`}>
      {labels[status] || status}
    </span>
  );
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await API.get('/admin/users');
        // Normalize: handle bare array OR wrapped object shapes ({ users: [], data: [], etc. })
        const raw = res.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.users)
          ? raw.users
          : Array.isArray(raw?.data)
          ? raw.data
          : [];
        setUsers(list);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        if (!navigator.onLine) {
           // We could set a specific state for network error if needed, 
           // but for now we'll just log and use the fallback.
        }
        // Fallback dummy data for demo if API fails
        setUsers([
          { _id: '1', name: 'John Doe', email: 'john@example.com', role: 'user', status: 'active', createdAt: new Date().toISOString() },
          { _id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'seller', status: 'verified', createdAt: new Date().toISOString() },
          { _id: '3', name: 'Robert Fox', email: 'robert@example.com', role: 'user', status: 'pending', createdAt: new Date().toISOString() },
          { _id: '4', name: 'Sarah Wilson', email: 'sarah@example.com', role: 'user', status: 'blocked', createdAt: new Date().toISOString() },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = (Array.isArray(users) ? users : []).filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || user.status === filter || user.role === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor and manage all platform participants.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input 
              type="text" 
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 w-64 transition-all"
            />
          </div>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
          >
            <option value="all">All Users</option>
            <option value="active">Active</option>
            <option value="verified">Verified</option>
            <option value="blocked">Blocked</option>
            <option value="seller">Sellers Only</option>
          </select>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 w-48 bg-white/5 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-16 bg-white/5 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-24 bg-white/5 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-white/5 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-8 bg-white/5 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <motion.tr 
                    key={user._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold border border-violet-500/20">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${user.role === 'seller' ? 'text-violet-400' : 'text-gray-400'}`}>
                        {user.role === 'seller' ? <FiShield size={12} /> : <FiUsers size={12} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <FiCalendar size={12} />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                        <FiMoreVertical size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <FiUsers size={48} />
                      <p className="text-sm font-medium">No users found matching your criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-between">
          <p className="text-xs text-gray-500">Showing {filteredUsers.length} of {users.length} users</p>
          <div className="flex items-center gap-2">
            <button disabled className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-gray-600 cursor-not-allowed">Previous</button>
            <button disabled className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-gray-600 cursor-not-allowed">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
