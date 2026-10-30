import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, phoneToEmail } from '../lib/supabase';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: true,

      initAuth: async () => {
        set({ isLoading: true });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            set({ user: session.user, profile, isLoading: false });
          } else {
            set({ user: null, profile: null, isLoading: false });
          }
        } catch (error) {
          console.error('Init auth error:', error);
          set({ isLoading: false });
        }
      },

        signUp: async ({ fullName, phone, password, referralCode }) => {
          const email = phoneToEmail(phone);
          const optionsData = {
            full_name: fullName,
            phone: phone,
            referral_code: referralCode || null,
          };
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: optionsData,
            },
          });
        if (error) throw error;

        // The DB trigger (handle_new_user) creates the profile automatically
        // Fetch the profile immediately after signup with retries
        if (data.user) {
          let profile = null;
          const maxRetries = 3;
          const retryDelay = 1000; // 1 second
          for (let i = 0; i < maxRetries; i++) {
            const { data: fetched, error: fetchError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
            if (fetchError) {
              console.error('[SignUp] Error fetching profile:', fetchError);
            } else if (fetched) {
              profile = fetched;
              break;
            }
            // If not last retry, wait before next attempt
            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }

          // If no referral trigger fired but code was provided, link manually
          if (referralCode && profile) {
            const { data: inviter, error: inviterError } = await supabase.from('profiles').select('id').eq('referral_code', referralCode).single();
            if (inviterError) {
              console.error('[SignUp] Error fetching inviter:', inviterError);
            } else if (inviter && !profile.referred_by) {
              await supabase.from('profiles').update({ referred_by: inviter.id }).eq('id', profile.id);
              await supabase.from('referrals').insert({ referrer_id: inviter.id, referred_id: profile.id, status: 'pending_payment' });
              const { data: updated, error: updateError } = await supabase.from('profiles').select('*').eq('id', profile.id).single();
              if (updateError) {
                console.error('[SignUp] Error updating profile with referral:', updateError);
              } else if (updated) {
                profile = updated;
              }
            }
          }

          if (!profile) {
            console.error('Profile not created. Check the database trigger in Supabase.');
          }

          set({ user: data.user, profile: profile || null, isLoading: false });
          return { user: data.user, profile: profile || null };
        }

        set({ isLoading: false });
        return { user: data.user, profile: null };
      },

      signIn: async ({ phone, password }) => {
        const email = phoneToEmail(phone);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        set({ user: data.user, profile, isLoading: false });
        return { user: data.user, profile };
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, isLoading: false });
      },

      refreshProfile: async () => {
        const { user } = get();
        if (!user) return;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        set({ profile });
      },

      // New methods for updating profile fields
      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return;
        const { data: profile, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();
        if (error) throw error;
        set({ profile });
        return profile;
      },

      updateVipLevel: async (vipLevel, dailyQuotaLimit) => {
        const updates = { vip_level: vipLevel, daily_quota_limit: dailyQuotaLimit };
        return await get().updateProfile(updates);
      },

      updateTotalDeposited: async (amount) => {
        const { user } = get();
        if (!user) return;
        const currentTotal = parseFloat(get().profile?.total_deposited || 0);
        const newTotal = currentTotal + amount;
        const { data: profile, error } = await supabase
          .from('profiles')
          .update({ total_deposited: newTotal })
          .eq('id', user.id)
          .select()
          .single();
        if (error) throw error;
        set({ profile });
        return profile;
      },

      updateAccountStatus: async (status) => {
        const { data: profile, error } = await supabase
          .from('profiles')
          .update({ account_status: status })
          .eq('id', get().user?.id)
          .select()
          .single();
        if (error) throw error;
        set({ profile });
        return profile;
      },

      incrementSuccessfulReferrals: async () => {
        const { user } = get();
        if (!user) return;
        const current = parseInt(get().profile?.successful_referrals || 0);
        const { data: profile, error } = await supabase
          .from('profiles')
          .update({ successful_referrals: current + 1 })
          .eq('id', user.id)
          .select()
          .single();
        if (error) throw error;
        set({ profile });
        return profile;
      },

      incrementDailyVideosWatched: async () => {
        const { user } = get();
        if (!user) return;
        const current = parseInt(get().profile?.daily_videos_watched || 0);
        const { data: profile, error } = await supabase
          .from('profiles')
          .update({ daily_videos_watched: current + 1 })
          .eq('id', user.id)
          .select()
          .single();
        if (error) throw error;
        set({ profile });
        return profile;
      },

      resetDailyVideosWatched: async () => {
        const { user } = get();
        if (!user) return;
        const { data: profile, error } = await supabase
          .from('profiles')
          .update({ daily_videos_watched: 0, last_quota_reset: new Date().toISOString() })
          .eq('id', user.id)
          .select()
          .single();
        if (error) throw error;
        set({ profile });
        return profile;
      },
    }),
    { name: 'hidase-auth', partialize: () => ({}) }
  )
);