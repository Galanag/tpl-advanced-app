import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminStore } from '../../store/adminStore';
import { LayoutDashboard, Video, Users, Settings, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlassCard from '../../components/GlassCard';
import SkeletonLoader from '../../components/SkeletonLoader';

const AdminSettings = () => {
  const { settings, updateSetting } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({});

  // Define the settings we want to manage in the UI (Expanded to VIP 7)
  const settingsFields = [
    // --- Core Settings ---
    { key: 'registration_fee', label: 'Registration Fee (ETB)', type: 'number', min: 0, step: 1 },
    { key: 'withdrawal_minimum', label: 'Minimum Withdrawal Amount (ETB)', type: 'number', min: 0, step: 0.01 },
    { key: 'referrals_required_to_withdraw', label: 'Base Referrals Required to Withdraw', type: 'number', min: 0, step: 1 },
    
    // --- Legacy Settings (Kept for backward compatibility) ---
    { key: 'daily_video_limit', label: 'Daily Video Limit (for legacy)', type: 'number', min: 0, step: 1 },
    { key: 'video_reward_amount', label: 'Video Reward Amount (ETB) (for legacy)', type: 'number', min: 0, step: 0.01 },
    { key: 'referral_bonus_percentage', label: 'Referral Bonus Percentage (%)', type: 'number', min: 0, max: 100, step: 0.1 },
    
    // --- VIP Reward Settings ---
    { key: 'basic_daily_limit', label: 'Basic VIP Daily Limit (videos)', type: 'number', min: 0, step: 1 },
    { key: 'basic_reward_amount', label: 'Basic VIP Reward Amount (ETB)', type: 'number', min: 0, step: 0.01 },
    
    { key: 'vip1_reward_amount', label: 'VIP1 Reward Amount (ETB)', type: 'number', min: 0, step: 0.01 },
    { key: 'vip2_reward_amount', label: 'VIP2 Reward Amount (ETB)', type: 'number', min: 0, step: 0.01 },
    { key: 'vip3_reward_amount', label: 'VIP3 Reward Amount (ETB)', type: 'number', min: 0, step: 0.01 },
    { key: 'vip4_reward_amount', label: 'VIP4 Reward Amount (ETB)', type: 'number', min: 0, step: 0.01 },
    { key: 'vip5_reward_amount', label: 'VIP5 Reward Amount (ETB)', type: 'number', min: 0, step: 0.01 },
    { key: 'vip6_reward_amount', label: 'VIP6 Reward Amount (ETB)', type: 'number', min: 0, step: 0.01 },
    { key: 'vip7_reward_amount', label: 'VIP7 Reward Amount (ETB)', type: 'number', min: 0, step: 0.01 },

    // --- Payment Details ---
    { key: 'telebirr_name', label: 'Telebirr Account Name', type: 'text', min: 0, step: 1 },
    { key: 'telebirr_number', label: 'Telebirr Phone Number', type: 'tel', min: 0, step: 1 },
  ];

  useEffect(() => {
    // Initialize form with current settings
    const formData = {};
    settingsFields.forEach((field) => {
      formData[field.key] = settings[field.key] || '';
    });
    setForm(formData);
    setLoading(false);
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      // Update each setting that has changed
      const updates = [];
      for (const [key, value] of Object.entries(form)) {
        if (value !== '') {
          updates.push(updateSetting(key, value));
        }
      }
      await Promise.all(updates);
      setSuccess('Settings updated successfully.');
      // Do NOT call fetchSettings() here — updateSetting already updates the store state.
      // Re-fetching from the server can revert changes if the write failed silently.
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassCard className="text-center py-12">
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <SkeletonLoader key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Admin Header */}
      <header className="glass sticky top-0 z-50 px-4 py-3 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="p-2 rounded-full hover:bg-white/10 text-white/60 transition-colors active:scale-95">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <LayoutDashboard size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">Admin Panel</h1>
                <p className="text-[10px] text-white/40">HIDASE Investment Group</p>
              </div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold">
            Admin
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="fade-in-up space-y-6">
          <div>
            <h2 className="text-white font-semibold">Admin Settings</h2>
            <p className="text-white/50 text-sm mt-0.5">
              Configure the application parameters. Changes take effect immediately.
            </p>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 border text-sm bg-red-500/10 border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl px-4 py-3 border text-sm bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settingsFields.map((field) => (
                <div key={field.key}>
                  <label className="text-white/50 text-sm block mb-1.5">{field.label}</label>
                  <input
                    type={field.type}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    name={field.key}
                    value={form[field.key] || ''}
                    onChange={handleChange}
                    className="glass-input"
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  // Reset form to current settings
                  settingsFields.forEach((field) => {
                    setForm(prev => ({ ...prev, [field.key]: settings[field.key] || '' }));
                  });
                  setError('');
                  setSuccess('');
                }}
                className="btn-secondary flex-1"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    Updating…
                  </>
                ) : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* --- VIP RULES DISPLAY (UPDATED TO VIP 7) --- */}
        <div className="space-y-4 mt-8 pt-6 border-t border-white/10">
          <h3 className="text-white/50 text-sm font-semibold mb-4">Current VIP Rules (DB-driven)</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Basic */}
            <GlassCard className="p-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500/30 flex items-center justify-center mt-1">
                  <svg className="text-green-400 size-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l5 9-5 9-5-9 5-9z"/></svg>
                </div>
                <div>
                  <p className="font-medium">Basic: 0-4 Referrals</p>
                  <p className="text-amber-400 font-bold">5 videos/day</p>
                  <p className="text-white/60 text-xs">VIP level determined by active referral count</p>
                </div>
              </div>
            </GlassCard>

            {/* VIP 1 */}
            <GlassCard className="p-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500/30 flex items-center justify-center mt-1">
                  <svg className="text-amber-400 size-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l5 9-5 9-5-9 5-9z"/></svg>
                </div>
                <div>
                  <p className="font-medium">VIP 1: 5-9 Referrals</p>
                  <p className="text-amber-400 font-bold">10 videos/day</p>
                  <p className="text-white/60 text-xs">VIP level determined by active referral count</p>
                </div>
              </div>
            </GlassCard>

            {/* VIP 2 */}
            <GlassCard className="p-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500/30 flex items-center justify-center mt-1">
                  <svg className="text-emerald-400 size-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l5 9-5 9-5-9 5-9z"/></svg>
                </div>
                <div>
                  <p className="font-medium">VIP 2: 10-14 Referrals</p>
                  <p className="text-amber-400 font-bold">15 videos/day</p>
                  <p className="text-white/60 text-xs">VIP level determined by active referral count</p>
                </div>
              </div>
            </GlassCard>

            {/* VIP 3 */}
            <GlassCard className="p-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500/30 flex items-center justify-center mt-1">
                  <svg className="text-blue-400 size-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l5 9-5 9-5-9 5-9z"/></svg>
                </div>
                <div>
                  <p className="font-medium">VIP 3: 15-19 Referrals</p>
                  <p className="text-amber-400 font-bold">20 videos/day</p>
                  <p className="text-white/60 text-xs">VIP level determined by active referral count</p>
                </div>
              </div>
            </GlassCard>

            {/* VIP 4 */}
            <GlassCard className="p-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500/30 flex items-center justify-center mt-1">
                  <svg className="text-purple-400 size-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l5 9-5 9-5-9 5-9z"/></svg>
                </div>
                <div>
                  <p className="font-medium">VIP 4: 20-24 Referrals</p>
                  <p className="text-amber-400 font-bold">25 videos/day</p>
                  <p className="text-white/60 text-xs">VIP level determined by active referral count</p>
                </div>
              </div>
            </GlassCard>

            {/* VIP 5 */}
            <GlassCard className="p-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-pink-500/30 flex items-center justify-center mt-1">
                  <svg className="text-pink-400 size-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l5 9-5 9-5-9 5-9z"/></svg>
                </div>
                <div>
                  <p className="font-medium">VIP 5: 25-29 Referrals</p>
                  <p className="text-amber-400 font-bold">30 videos/day</p>
                  <p className="text-white/60 text-xs">VIP level determined by active referral count</p>
                </div>
              </div>
            </GlassCard>

            {/* VIP 6 */}
            <GlassCard className="p-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500/30 flex items-center justify-center mt-1">
                  <svg className="text-indigo-400 size-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l5 9-5 9-5-9 5-9z"/></svg>
                </div>
                <div>
                  <p className="font-medium">VIP 6: 30-34 Referrals</p>
                  <p className="text-amber-400 font-bold">35 videos/day</p>
                  <p className="text-white/60 text-xs">VIP level determined by active referral count</p>
                </div>
              </div>
            </GlassCard>

            {/* VIP 7 */}
            <GlassCard className="p-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/30 flex items-center justify-center mt-1">
                  <svg className="text-red-400 size-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l5 9-5 9-5-9 5-9z"/></svg>
                </div>
                <div>
                  <p className="font-medium">VIP 7: 35+ Referrals</p>
                  <p className="text-amber-400 font-bold">40 videos/day</p>
                  <p className="text-white/60 text-xs">VIP level determined by active referral count</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;