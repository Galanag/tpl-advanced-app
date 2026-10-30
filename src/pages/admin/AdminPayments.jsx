import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminStore } from '../../store/adminStore';
import { useAuthStore } from '../../store/authStore';
import { ArrowUpRight, Check, X, Loader2, Banknote } from 'lucide-react';
import GlassCard from '../../components/GlassCard';
import SkeletonLoader from '../../components/SkeletonLoader';

const AdminPayments = () => {
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { settings } = useAdminStore();
  const { updateTotalDeposited, updateAccountStatus, updateVipLevel, incrementSuccessfulReferrals } = useAuthStore();

  useEffect(() => {
    fetchPendingDeposits();
  }, []);

  const fetchPendingDeposits = async () => {
    setLoading(true);
    try {
      console.log('[AdminPayments] Fetching pending deposits');
      const { data, error: fetchError } = await supabase
        .from('deposits')
        .select(`
          *,
          profiles!deposits_user_id_fkey (
            id,
            full_name,
            phone,
            referral_code,
            referred_by,
            successful_referrals
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      console.log('[AdminPayments] Fetched pending deposits:', data);
      setPendingDeposits(data || []);
    } catch (err) {
      console.error('[AdminPayments] Error fetching pending deposits:', err);
      setError(err.message || 'Failed to fetch pending deposits');
    } finally {
      setLoading(false);
    }
  };

  const approveDeposit = async (depositId) => {
    setLoading(true);
    try {
      console.log('[AdminPayments] Approving deposit ID:', depositId);
      // 1. Update deposit status to approved
      const { error: updateError } = await supabase
        .from('deposits')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', depositId);

      if (updateError) {
        console.error('[AdminPayments] Error updating deposit status:', updateError);
        throw updateError;
      }
      console.log('[AdminPayments] Deposit status updated to approved');

      // 2. Get deposit details to process
      const { data: depositData, error: depositError } = await supabase
        .from('deposits')
        .select(`
          *,
          profiles!deposits_user_id_fkey (
            id,
            full_name,
            phone,
            referral_code,
            referred_by,
            successful_referrals,
            vip_level,
            daily_quota_limit,
            total_deposited,
            account_status
          )
        `)
        .eq('id', depositId)
        .single();

      if (depositError) {
        console.error('[AdminPayments] Error fetching deposit data:', depositError);
        throw depositError;
      }
      console.log('[AdminPayments] Deposit data fetched:', depositData);

      const deposit = depositData;
      const profile = deposit.profiles;

      if (!profile) {
        throw new Error('Profile not found for deposit');
      }
      console.log('[AdminPayments] Profile:', profile);

      // 3. Update user's total_deposited
      const newTotalDeposited = (parseFloat(profile.total_deposited || 0) + parseFloat(deposit.amount)).toFixed(2);
      console.log('[AdminPayments] Updating total_deposited to:', newTotalDeposited);
      const { error: totalDepositError } = await supabase
        .from('profiles')
        .update({ total_deposited: newTotalDeposited })
        .eq('id', profile.id);

      if (totalDepositError) {
        console.error('[AdminPayments] Error updating total_deposited:', totalDepositError);
        throw totalDepositError;
      }
      console.log('[AdminPayments] Total deposited updated');

      // 4. Update account status to active (if not already)
      if (profile.account_status !== 'active') {
        console.log('[AdminPayments] Updating account status to active');
        const { error: accountStatusError } = await supabase
          .from('profiles')
          .update({ account_status: 'active' })
          .eq('id', profile.id);

        if (accountStatusError) {
          console.error('[AdminPayments] Error updating account status:', accountStatusError);
          throw accountStatusError;
        }
        console.log('[AdminPayments] Account status updated to active');
      }

      // 5. Determine new VIP level and daily quota based on total deposited
      const totalDepositedFloat = parseFloat(newTotalDeposited);
      console.log('[AdminPayments] Total deposited float:', totalDepositedFloat);
      let newVipLevel = 'Basic';
      let newDailyQuota = parseInt(settings.basic_daily_limit || 5);

      // VIP thresholds from settings (we assume they exist)
      const vip1Threshold = parseFloat(settings.vip1_min_deposit || 500);
      const vip2Threshold = parseFloat(settings.vip2_min_deposit || 1500);
      const vip3Threshold = parseFloat(settings.vip3_min_deposit || 5000);

      console.log('[AdminPayments] VIP thresholds:', { vip1Threshold, vip2Threshold, vip3Threshold });
      console.log('[AdminPayments] VIP limits from settings:', {
        basic: { limit: settings.basic_daily_limit, reward: settings.basic_reward_amount },
        vip1: { limit: settings.vip1_daily_limit, reward: settings.vip1_reward_amount },
        vip2: { limit: settings.vip2_daily_limit, reward: settings.vip2_reward_amount },
        vip3: { limit: settings.vip3_daily_limit, reward: settings.vip3_reward_amount }
      });

      if (totalDepositedFloat >= vip3Threshold) {
        newVipLevel = 'VIP3';
        newDailyQuota = parseInt(settings.vip3_daily_limit || 20);
        console.log('[AdminPayments] User qualifies for VIP3');
      } else if (totalDepositedFloat >= vip2Threshold) {
        newVipLevel = 'VIP2';
        newDailyQuota = parseInt(settings.vip2_daily_limit || 15);
        console.log('[AdminPayments] User qualifies for VIP2');
      } else if (totalDepositedFloat >= vip1Threshold) {
        newVipLevel = 'VIP1';
        newDailyQuota = parseInt(settings.vip1_daily_limit || 10);
        console.log('[AdminPayments] User qualifies for VIP1');
      } else {
        newVipLevel = 'Basic';
        newDailyQuota = parseInt(settings.basic_daily_limit || 5);
        console.log('[AdminPayments] User remains Basic');
      }

      // 6. Update user's VIP level and daily quota
      console.log('[AdminPayments] Updating VIP level to:', newVipLevel, 'and daily quota to:', newDailyQuota);
      const { error: vipLevelError } = await supabase
        .from('profiles')
        .update({ vip_level: newVipLevel, daily_quota_limit: newDailyQuota })
        .eq('id', profile.id);

      if (vipLevelError) {
        console.error('[AdminPayments] Error updating VIP level and quota:', vipLevelError);
        throw vipLevelError;
      }
      console.log('[AdminPayments] VIP level and quota updated');

      // 7. If the user was referred, update the referral and referrer's successful_referrals
      if (profile.referred_by) {
        console.log('[AdminPayments] User was referred by:', profile.referred_by);
        // Update referral status to active
        const { error: referralStatusError } = await supabase
          .from('referrals')
          .update({ status: 'active' })
          .eq('referred_id', profile.id);

        if (referralStatusError) {
          console.error('[AdminPayments] Error updating referral status:', referralStatusError);
          throw referralStatusError;
        }
        console.log('[AdminPayments] Referral status updated to active');

        // Increment referrer's successful_referrals
        const { error: referrerError } = await supabase
          .from('profiles')
          .update({ successful_referrals: (parseFloat(profile.successful_referrals || 0) + 1) })
          .eq('id', profile.referred_by);

        if (referrerError) {
          console.error('[AdminPayments] Error updating referrer successful_referrals:', referrerError);
          throw referrerError;
        }
        console.log('[AdminPayments] Referrer successful_referrals incremented');

        // Optional: Update referrer's team size via RPC (if needed)
        // await supabase.rpc('increment_team_size', { uid: profile.referred_by });
      }

      // 8. Refresh the list
      console.log('[AdminPayments] Refreshing pending deposits list');
      await fetchPendingDeposits();

      setSuccess('Deposit approved successfully.');
      console.log('[AdminPayments] Deposit approved successfully');
    } catch (err) {
      console.error('[AdminPayments] Error approving deposit:', err);
      setError(err.message || 'Failed to approve deposit');
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

  if (pendingDeposits.length === 0) {
    return (
      <GlassCard className="text-center py-12">
        <Banknote size={40} className="text-white/20 mx-auto mb-3" />
        <p className="text-white/40">No pending deposit requests.</p>
      </GlassCard>
    );
  }

  return (
    <div className="fade-in-up space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Pending Deposits ({pendingDeposits.length})</h2>
        <div className="flex gap-2">
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1 text-emerald-400 text-sm">
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-1 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {pendingDeposits.map((deposit) => (
          <GlassCard key={deposit.id} className="border border-white/20">
            <div className="flex items-center justify-between p-4">
              <div className="flex-1 min-w-0">
                <p className="text-white/90 text-sm font-medium">Deposit ID: {deposit.id}</p>
                <p className="text-white/70 text-xs">
                  User: {deposit.profiles?.full_name || 'Unknown'} ({deposit.profiles?.phone || 'N/A'})
                </p>
                <p className="text-white/70 text-xs mt-1">
                  Amount: {parseFloat(deposit.amount).toFixed(2)} ETB • Method: {deposit.payment_method}
                </p>
                <p className="text-white/70 text-xs">
                  Transaction ID: {deposit.transaction_id}
                </p>
                <p className="text-white/70 text-xs">
                  Submitted: {new Date(deposit.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => approveDeposit(deposit.id)}
                  className="btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm active:scale-95"
                >
                  Approve
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default AdminPayments;