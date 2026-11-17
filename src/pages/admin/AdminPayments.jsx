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

      // 3. Update account status to active (if not already)
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

      // 4. Increment the referrer's successful_referrals by 1
      //    The database trigger will automatically handle the VIP upgrade
      //    based on the new referral count.
      if (profile.referred_by) {
        console.log('[AdminPayments] User was referred by:', profile.referred_by);
        const { error: referrerError } = await supabase.rpc('increment_successful_referrals', { uid: profile.referred_by });

        if (referrerError) {
          console.error('[AdminPayments] Error updating referrer successful_referrals:', referrerError);
          throw referrerError;
        }
        console.log('[AdminPayments] Referrer successful_referrals incremented - VIP upgrade handled by trigger');
      }

      // 5. Refresh the list
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

  
  const handleDecline = async (depositId) => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('deposits')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', depositId);
      if (updateError) throw updateError;
      setLoading(false);
      fetchPendingDeposits();
      setSuccess('Deposit declined successfully.');
    } catch (err) {
      console.error('[AdminPayments] Error declining deposit:', err);
      setError('Failed to decline deposit');
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
              {deposit.target_vip && (
                <p className="text-amber-400 text-xs mt-1">
                  Target VIP: {deposit.target_vip}
                  {deposit.payment_reference && (
                    ` • Paid: ${parseFloat(deposit.amount).toFixed(2)} ETB (upgrade cost)`
                  )}
                </p>
              )}
              {deposit.payment_name && (
                <p className="text-white/70 text-xs mt-1">
                  Account: {deposit.payment_name}
                </p>
              )}
              {deposit.payment_reference && (
                <p className="text-white/70 text-xs mt-1">
                  Payment Reference: {deposit.payment_reference}
                </p>
              )}
              <p className="text-white/70 text-xs">
                Transaction ID: {deposit.transaction_id}
              </p>
              {deposit.proof_image_url && (
                <div className="mt-2">
                  <button
                    onClick={() => window.open(deposit.proof_image_url, '_blank')}
                    className="text-amber-400 text-xs underline cursor-pointer"
                  >
                    View Proof
                  </button>
                  <p className="text-amber-400 text-xs mt-1">
                    Proof image: {deposit.proof_image_url?.substring(0, 30)}${deposit.proof_image_url?.length > 30 ? '...' : ''}
                  </p>
                </div>
              )}
              <p className="text-white/70 text-xs">
                Submitted: {new Date(deposit.created_at).toLocaleString()}
              </p>
              </div>
              <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2">
                  <button
                    onClick={() => approveDeposit(deposit.id)}
                    className="btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm active:scale-95"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDecline(deposit.id)}
                    className="btn-secondary flex items-center justify-center gap-2 px-4 py-2 text-sm active:scale-95"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default AdminPayments;