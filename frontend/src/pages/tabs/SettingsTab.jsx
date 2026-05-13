import React, { useState, useEffect, useCallback } from 'react';
import { FiSettings, FiCheck } from 'react-icons/fi';
import API from '../../utils/api';
import { Shimmer, SectionHeader, Btn, Toast } from './SharedAdminUI';

const SettingsTab = () => {
  const [settings, setSettings] = useState({
    platformFee: 10,
    maintenanceMode: false,
    allowRegistrations: true,
    announcementBanner: '',
    minWithdrawalAmount: 100,
    maxFileSize: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => { 
    setToast({ msg, type }); 
    setTimeout(() => setToast(null), 3500); 
  }, []);

  useEffect(() => {
    API.get('/admin/settings')
      .then(r => { setSettings(s => ({ ...s, ...r.data })); })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await API.put('/admin/settings', settings);
      showToast('Settings saved successfully');
    } catch { showToast('Failed to save settings', 'error'); }
    finally { setSaving(false); }
  }, [settings, showToast]);

  const Toggle = ({ label, sub, field }) => (
    <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
      </div>
      <button onClick={() => setSettings(s => ({ ...s, [field]: !s[field] }))}
        className={`relative w-12 h-6 rounded-full transition-colors ${settings[field] ? 'bg-violet-600' : 'bg-white/10'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings[field] ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  const Input = ({ label, type = 'text', ...props }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-400">{label}</label>
      <input type={type} {...props}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition" />
    </div>
  );

  return (
    <div className="space-y-6 pb-12 pt-4 max-w-2xl">
      <Toast toast={toast} />
      <SectionHeader icon={FiSettings} iconColor="bg-cyan-500/20 text-cyan-400" title="Platform Settings"
        subtitle="Configure global platform behaviour and limits" />

      {loading ? <Shimmer className="h-96" /> : (
        <div className="space-y-5">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Platform Controls</h3>
            <Toggle label="Maintenance Mode" sub="Show maintenance page to all non-admin users" field="maintenanceMode" />
            <Toggle label="Allow New Registrations" sub="Disable to prevent new users from signing up" field="allowRegistrations" />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Revenue Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Platform Fee (%)" type="number" min="0" max="100" value={settings.platformFee}
                onChange={e => setSettings(s => ({ ...s, platformFee: Number(e.target.value) }))} />
              <Input label="Min Withdrawal (₹)" type="number" min="0" value={settings.minWithdrawalAmount}
                onChange={e => setSettings(s => ({ ...s, minWithdrawalAmount: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Upload Limits</h3>
            <Input label="Max File Size (MB)" type="number" min="1" max="100" value={settings.maxFileSize}
              onChange={e => setSettings(s => ({ ...s, maxFileSize: Number(e.target.value) }))} />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Announcement Banner</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Banner Message (leave empty to hide)</label>
              <input value={settings.announcementBanner}
                onChange={e => setSettings(s => ({ ...s, announcementBanner: e.target.value }))}
                placeholder="e.g. Platform maintenance scheduled for May 15…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition" />
            </div>
          </div>

          <Btn variant="primary" size="md" icon={FiCheck} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </Btn>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
