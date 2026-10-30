import { useState, useEffect } from 'react';
import { Save, Loader2, DollarSign, Video, Users, Percent } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import GlassCard from '../../components/GlassCard';

const FIELDS = [
  { key: 'registration_fee', label: 'Registration Fee (ETB)', icon: DollarSign, type: 'number' },
  { key: 'daily_video_limit', label: 'Daily Video Limit', icon: Video, type: 'number' },
  { key: 'video_reward_amount', label: 'Default Video Reward (ETB)', icon: DollarSign, type: 'number' },
  { key: 'referral_bonus_percentage', label: 'Referral Bonus (%)', icon: Percent, type: 'number' },
];

const AdminSettingsTab = () => {
  const { settings, updateSetting } = useAdminStore();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setForm({ ...settings }); }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      for (const f of FIELDS) {
        if (form[f.key] !== undefined && form[f.key] !== settings[f.key]) {
          await updateSetting(f.key, form[f.key]);
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-white font-semibold">Global Settings</h2>
      <GlassCard>
        <form onSubmit={handleSave} className="space-y-5">
          {FIELDS.map(({ key, label, icon: Icon, type }) => (
            <div key={key}>
              <label className="text-white/50 text-sm flex items-center gap-1.5 mb-1.5">
                <Icon size={14} className="text-amber-400" />
                {label}
              </label>
              <input
                type={type}
                min="0"
                value={form[key] ?? ''}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="glass-input"
              />
            </div>
          ))}
          <button type="submit" disabled={saving} className="btn-primary flex items-center justify-center gap-2">
            {saving ? (<><Loader2 size={16} className="animate-spin" />Saving…</>) : saved ? (<><Save size={16} /> Saved!</>) : (<><Save size={16} /> Save Settings</>)}
          </button>
        </form>
      </GlassCard>

      <p className="text-white/30 text-xs">
        These settings control the platform globally. Changes take effect immediately for all users.
      </p>
    </div>
  );
};

export default AdminSettingsTab;
