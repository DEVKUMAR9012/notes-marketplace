import React, { useState, useEffect, useCallback } from 'react';
import { FiVolume2, FiTrash2, FiPlus, FiPower, FiCheck, FiMail, FiUsers } from 'react-icons/fi';
import API from '../../utils/api';
import { Shimmer, SectionHeader, Btn, Toast, Badge, Input, Select } from './SharedAdminUI';

export default function BannersTab() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [text, setText] = useState('');
  const [targetGroup, setTargetGroup] = useState('all');
  const [emailsInput, setEmailsInput] = useState('');

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch Banners
  const fetchBanners = useCallback(async () => {
    try {
      const res = await API.get('/admin/banners');
      if (res.data?.success) {
        setBanners(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch banners', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Create Banner
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      return showToast('Banner message is required', 'error');
    }

    setCreating(true);
    try {
      const specificUsersEmails = targetGroup === 'specific'
        ? emailsInput.split(',').map(email => email.trim()).filter(Boolean)
        : [];

      const res = await API.post('/admin/banners', {
        text: text.trim(),
        targetGroup,
        specificUsersEmails
      });

      if (res.data?.success) {
        showToast('Banner notification published successfully');
        setText('');
        setEmailsInput('');
        setTargetGroup('all');
        fetchBanners();
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to create banner', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Toggle Banner Active
  const handleToggle = async (id) => {
    try {
      const res = await API.patch(`/admin/banners/${id}/toggle`);
      if (res.data?.success) {
        showToast('Banner active status updated');
        // Update local state optimistic UI
        setBanners(prev => prev.map(b => b._id === id ? { ...b, isActive: !b.isActive } : b));
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to toggle banner status', 'error');
    }
  };

  // Delete Banner
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;

    try {
      const res = await API.delete(`/admin/banners/${id}`);
      if (res.data?.success) {
        showToast('Banner deleted successfully');
        setBanners(prev => prev.filter(b => b._id !== id));
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete banner', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12 pt-4">
      <Toast toast={toast} />
      <SectionHeader 
        icon={FiVolume2} 
        iconColor="bg-violet-500/20 text-violet-400" 
        title="Broadcast Banners" 
        subtitle="Publish target-audience specific banner announcements displayed at the top of viewports" 
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Creator panel */}
        <div className="xl:col-span-1 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <FiPlus className="text-violet-400" /> Create Broadcast Banner
          </h3>
          
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Banner Announcement Text</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type the message you want users to see..."
                rows="4"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition resize-none"
              />
            </div>

            <Select 
              label="Target Audience Group" 
              value={targetGroup} 
              onChange={e => setTargetGroup(e.target.value)}
            >
              <option value="all">All Registered Users</option>
              <option value="new">New Users (Registered last 7 days)</option>
              <option value="old">Old Users (Registered > 7 days ago)</option>
              <option value="specific">Specific Targeted Users (By Email)</option>
            </Select>

            {targetGroup === 'specific' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                  <FiMail className="text-violet-400" /> Target User Emails (comma-separated)
                </label>
                <textarea
                  value={emailsInput}
                  onChange={e => setEmailsInput(e.target.value)}
                  placeholder="e.g. buyer@noteshere.site, seller@noteshere.site"
                  rows="3"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition resize-none"
                />
                <p className="text-[10px] text-gray-500">Only matching registered user emails will receive this banner.</p>
              </div>
            )}

            <Btn 
              variant="primary" 
              size="md" 
              icon={FiCheck} 
              disabled={creating} 
              className="w-full justify-center"
            >
              {creating ? 'Publishing...' : 'Publish Broadcast'}
            </Btn>
          </form>
        </div>

        {/* List panel */}
        <div className="xl:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <FiUsers className="text-violet-400" /> Active Banners & History
          </h3>

          {loading ? (
            <Shimmer className="h-64 w-full" />
          ) : banners.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-10 text-center">
              <FiVolume2 className="mx-auto text-gray-600 mb-3" size={32} />
              <p className="text-gray-400 text-sm font-medium">No banners registered yet</p>
              <p className="text-gray-600 text-xs mt-1">Create one using the sidebar form to broadcast immediately.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {banners.map(banner => {
                let badgeColor = 'violet';
                let label = 'All Users';
                if (banner.targetGroup === 'new') {
                  badgeColor = 'green';
                  label = 'New Users Only';
                } else if (banner.targetGroup === 'old') {
                  badgeColor = 'yellow';
                  label = 'Old Users Only';
                } else if (banner.targetGroup === 'specific') {
                  badgeColor = 'blue';
                  label = 'Specific Users';
                }

                return (
                  <div 
                    key={banner._id} 
                    className={`bg-white/5 border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      banner.isActive ? 'border-white/10' : 'border-white/5 opacity-50'
                    }`}
                  >
                    <div className="space-y-2 max-w-xl min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge label={label} color={badgeColor} />
                        {!banner.isActive && <Badge label="Inactive" color="gray" />}
                      </div>
                      <p className="text-sm text-white font-medium break-words leading-relaxed">{banner.text}</p>
                      
                      {banner.targetGroup === 'specific' && banner.specificUsers?.length > 0 && (
                        <div className="text-xs text-gray-500 flex flex-wrap gap-1.5 items-center">
                          <span className="font-semibold text-gray-400">Targeted:</span>
                          {banner.specificUsers.map((u, i) => (
                            <span key={u._id} className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5" title={u.email}>
                              {u.name || u.email}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Btn 
                        variant={banner.isActive ? 'warning' : 'success'} 
                        icon={FiPower} 
                        onClick={() => handleToggle(banner._id)}
                        title={banner.isActive ? 'Deactivate Banner' : 'Activate Banner'}
                      >
                        {banner.isActive ? 'Deactivate' : 'Activate'}
                      </Btn>
                      <Btn 
                        variant="danger" 
                        icon={FiTrash2} 
                        onClick={() => handleDelete(banner._id)}
                        title="Delete Announcement"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
