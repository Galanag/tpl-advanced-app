import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAdminStore = create((set, get) => ({
  settings: {},
  videos: [],
  users: [],
  loading: false,

  fetchSettings: async () => {
    const { data } = await supabase.from('admin_settings').select('*');
    const map = {};
    (data || []).forEach((s) => { map[s.key] = s.value; });
    set({ settings: map });
    return map;
  },

  initializeSettings: async () => {
    const defaults = [
      { key: 'registration_fee', value: '500' },
      { key: 'daily_video_limit', value: '10' },
      { key: 'video_reward_amount', value: '10' },
      { key: 'referral_bonus_percentage', value: '10' },
      // VIP Tiers
      { key: 'basic_daily_limit', value: '5' },
      { key: 'basic_reward_amount', value: '10' },
      { key: 'vip1_daily_limit', value: '10' },
      { key: 'vip1_reward_amount', value: '15' },
      { key: 'vip2_daily_limit', value: '15' },
      { key: 'vip2_reward_amount', value: '20' },
      { key: 'vip3_daily_limit', value: '20' },
      { key: 'vip3_reward_amount', value: '25' },
      // Withdrawal
      { key: 'withdrawal_minimum', value: '100' },
      { key: 'referrals_required_to_withdraw', value: '5' },
    ];
    for (const setting of defaults) {
      // Check if setting exists, if not, insert it
      const { data: existing } = await supabase.from('admin_settings').select('key').eq('key', setting.key).single();
      if (!existing) {
        await supabase.from('admin_settings').insert(setting);
      }
    }
    // After ensuring defaults, fetch again
    await get().fetchSettings();
  },

  updateSetting: async (key, value) => {
    await supabase.from('admin_settings').upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    set((state) => ({ settings: { ...state.settings, [key]: String(value) } }));
  },

  fetchVideos: async () => {
    set({ loading: true });
    const { data } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
    set({ videos: data || [], loading: false });
  },

  addVideo: async (video) => {
    const { data, error } = await supabase.from('videos').insert(video).select().single();
    if (error) throw error;
    set((state) => ({ videos: [data, ...state.videos] }));
    return data;
  },

  updateVideo: async (id, updates) => {
    const { data, error } = await supabase.from('videos').update(updates).eq('id', id).select().single();
    if (error) throw error;
    set((state) => ({ videos: state.videos.map((v) => (v.id === id ? data : v)) }));
    return data;
  },

  deleteVideo: async (id) => {
    await supabase.from('videos').delete().eq('id', id);
    set((state) => ({ videos: state.videos.filter((v) => v.id !== id) }));
  },

  fetchUsers: async (search = '') => {
    set({ loading: true });
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
    if (search) query = query.ilike('phone', `%${search}%`);
    const { data } = await query;
    set({ users: data || [], loading: false });
  },

  activateUser: async (userId) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profile) return;

    await supabase.from('profiles').update({ account_status: 'active' }).eq('id', userId);

    if (profile.referred_by) {
      await supabase.from('referrals').update({ status: 'active' }).eq('referred_id', userId);
      await supabase.rpc('increment_team_size', { uid: profile.referred_by });

      const { data: settings } = await supabase.from('admin_settings').select('value').eq('key', 'referral_bonus_percentage').single();
      const pct = parseFloat(settings?.value) || 10;
      const fee = parseFloat((await supabase.from('admin_settings').select('value').eq('key', 'registration_fee').single()).data?.value) || 500;
      const bonus = parseFloat((fee * pct / 100).toFixed(2));

      const { data: referrer } = await supabase.from('profiles').select('balance').eq('id', profile.referred_by).single();
      if (referrer) {
        await supabase.from('profiles').update({ balance: (parseFloat(referrer.balance) || 0) + bonus }).eq('id', profile.referred_by);
        await supabase.from('commissions').insert({
          user_id: profile.referred_by,
          amount: bonus,
          type: 'REFERRAL_BONUS',
          source_user_id: userId,
        });
      }
    }

    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, account_status: 'active' } : u)),
    }));
  },

  suspendUser: async (userId) => {
    await supabase.from('profiles').update({ account_status: 'suspended' }).eq('id', userId);
    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, account_status: 'suspended' } : u)),
    }));
  },
}));