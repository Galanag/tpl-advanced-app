import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminStore } from '../../store/adminStore';
import { useAuthStore } from '../../store/authStore';
import { ArrowUpRight, Check, X, Loader2, Banknote, Phone } from 'lucide-react';
import GlassCard from '../../components/GlassCard';
import SkeletonLoader from '../../components/SkeletonLoader';

const AdminWithdrawals = () => {
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { updateTotalDeposited, updateAccountStatus, updateVipLevel, incrementSuccessfulReferrals } = useAuthStore();

  useEffect(() => {
    fetchPendingWithdrawals();
  }, []);

  const fetchPendingWithdrawals = async () => {
    setLoading(true);
    try {
      console.log('[AdminWithdrawals] Fetching pending withdrawals');
      const { data, error: fetchError } = await supabase
        .from('withdrawals')
        .select(`
          *,
          profiles!withdrawals_user_id_fkey (
            id,
            full_name,
            phone,
            payment_method,
            payment_account_name,
            payment_account_number
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      console.log('[AdminWithdrawals] Fetched pending withdrawals:', data);
      setPendingWithdrawals(data || []);
    } catch (err) {
      console.error('[AdminWithdrawals] Error fetching pending withdrawals:', err);
      setError(err.message || 'Failed to fetch pending withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const approveWithdrawal = async (withdrawalId) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // CRITICAL: Force session refresh to prevent mobile schema cache errors
      await supabase.auth.refreshSession();
      
      console.log('[AdminWithdrawals] Approving withdrawal ID:', withdrawalId);
      
      // 1. Update withdrawal status to approved
      const { error: updateError } = await supabase
        .from('withdrawals')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', withdrawalId);

      if (updateError) {
        console.error('[AdminWithdrawals] Error updating withdrawal status:', updateError);
        throw updateError;
      }
      console.log('[AdminWithdrawals] Withdrawal status updated to approved');

      // 2. Refresh the list
      await fetchPendingWithdrawals();

      setSuccess('Withdrawal approved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('[AdminWithdrawals] Error approving withdrawal:', err);
      setError(err.message || 'Failed to approve withdrawal');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const rejectWithdrawal = async (withdrawalId) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // CRITICAL: Force session refresh to prevent mobile schema cache errors
      await supabase.auth.refreshSession();

      console.log('[AdminWithdrawals] Rejecting withdrawal ID:', withdrawalId);
      
      // 1. Get withdrawal details to refund the amount
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('withdrawals')
        .select(`
          *,
          profiles!withdrawals_user_id_fkey (
            id,
            balance
          )
        `)
        .eq('id', withdrawalId)
        .single();

      if (withdrawalError) throw withdrawalError;

      const withdrawal = withdrawalData;
      const profile = withdrawal.profiles;
      const amount = parseFloat(withdrawal.amount);

      if (!profile) throw new Error('Profile not found for withdrawal');

      // 2. Update withdrawal status to rejected
      const { error: statusUpdateError } = await supabase
        .from('withdrawals')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', withdrawalId);

      if (statusUpdateError) throw statusUpdateError;
      
      // 3. Refund the amount back to the user's balance
      const newBalance = (parseFloat(profile.balance || 0) + amount).toFixed(2);
      const { error: balanceUpdateError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', profile.id);

      if (balanceUpdateError) throw balanceUpdateError;

      // 4. Refresh the list
      await fetchPendingWithdrawals();

      setSuccess('Withdrawal rejected and amount refunded.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('[AdminWithdrawals] Error rejecting withdrawal:', err);
      setError(err.message || 'Failed to reject withdrawal');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (loading && pendingWithdrawals.length === 0) {
    return (
      <GlassCard className="text-center py-12">
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <SkeletonLoader key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="fade-in-up space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Pending Withdrawals ({pendingWithdrawals.length})</h2>
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

      {pendingWithdrawals.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Banknote size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No pending withdrawal requests.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {pendingWithdrawals.map((withdrawal) => (
            <GlassCard key={withdrawal.id} className="border border-white/20">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm font-medium">Withdrawal ID: {withdrawal.id.split('-')[0]}...</p>
                  <p className="text-white/70 text-xs mt-1">
                    User: <span className="text-white font-semibold">{withdrawal.profiles?.full_name || 'Unknown'}</span> ({withdrawal.profiles?.phone || 'N/A'})
                  </p>
                  <p className="text-white/70 text-xs mt-1">
                    Amount: <span className="text-amber-400 font-bold">{parseFloat(withdrawal.amount).toFixed(2)} ETB</span>
                  </p>
                  <p className="text-white/70 text-xs mt-1">
                    Method: {withdrawal.profiles?.payment_method || 'Telebirr'} • Account: {withdrawal.profiles?.payment_account_name || 'N/A'} ({withdrawal.profiles?.payment_account_number || 'N/A'})
                  </p>
                  <p className="text-white/70 text-xs mt-1">
                    Requested: {new Date(withdrawal.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                  <button
                    onClick={() => rejectWithdrawal(withdrawal.id)}
                    disabled={loading}
                    className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-all active:scale-95 flex items-center justify-center gap-1"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Reject
                  </button>
                  <button
                    onClick={() => approveWithdrawal(withdrawal.id)}
                    disabled={loading}
                    className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-1"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminWithdrawals;