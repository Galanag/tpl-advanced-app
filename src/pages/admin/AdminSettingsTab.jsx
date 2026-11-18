import { useState, useEffect } from 'react';
import { Save, Loader2, DollarSign, Video, Users, Percent, Shield, Crown, Star } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import GlassCard from '../../components/GlassCard';

const FIELDS = [
  { key: 'registration_fee', label: 'Registration Fee (ETB)', icon: DollarSign, type: 'number' },
  { key: 'withdrawal_minimum', label: 'Minimum Withdrawal (ETB)', icon: DollarSign, type: 'number' },
  { key: 'video_reward_amount', label: 'Default Video Reward (ETB)', icon: DollarSign, type: 'number' },
];

const AdminSettingsTab = () => {
  const { settings, updateSetting } = useAdminStore();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

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
    } catch (err) {
      setError(err.message || 'Failed to update settings');
      setTimeout(() => setError(''), 4000);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      
      {/* --- Global Settings Form --- */}
      <div className="space-y-4">
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
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-1 text-red-400 text-sm mb-2">{error}</div>}
            <button type="submit" disabled={saving} className="btn-primary flex items-center justify-center gap-2">
              {saving ? (<><Loader2 size={16} className="animate-spin" />Saving…</>) : saved ? (<><Save size={16} /> Saved!</>) : (<><Save size={16} /> Save Settings</>)}
            </button>
          </form>
        </GlassCard>
        <p className="text-white/30 text-xs">
          These settings control the platform globally. Changes take effect immediately.
        </p>
      </div>

      {/* --- VIP Rules Display --- */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div>
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Crown size={18} className="text-amber-400" />
            VIP Rules (DB-Driven)
          </h2>
          <p className="text-white/40 text-xs mt-1 mb-4">
            VIP levels and daily video limits are automatically calculated by the database based on active referrals.
          </p>
        </div>

        {/* VIP Rules List */}
        <div className="space-y-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
            <span className="text-white font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Basic (0-4 Referrals)
            </span>
            <span className="text-amber-400 font-bold">5 Videos per day</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
            <span className="text-white font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Vip 1 (5-9 Referrals)
            </span>
            <span className="text-amber-400 font-bold">10 Videos per day</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
            <span className="text-white font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              Vip 2 (10-14 Referrals)
            </span>
            <span className="text-amber-400 font-bold">15 Videos per day</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
            <span className="text-white font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              Vip 3 (15+ Referrals)
            </span>
            <span className="text-amber-400 font-bold">20 Videos per day</span>
          </div>
        </div>
        
        <p className="text-amber-400/80 text-xs mt-4 italic bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
          * Note: Each additional VIP level requires 5 more active referrals and unlocks 5 additional videos per day.
        </p>
      </div>

    </div>
  );
};

export default AdminSettingsTab;