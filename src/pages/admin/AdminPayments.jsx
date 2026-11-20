import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminStore } from '../../store/adminStore';
import { useAuthStore } from '../../store/authStore';
import { ArrowUpRight, Check, X, Loader2, Banknote, ExternalLink, AlertTriangle } from 'lucide-react';
import GlassCard from '../../components/GlassCard';
import SkeletonLoader from '../../components/SkeletonLoader';

const AdminPayments = () => {
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  
  const { settings } = useAdminStore();
  const { updateTotalDeposited, updateAccountStatus, updateVipLevel, incrementSuccessfulReferrals } = useAuthStore();

  useEffect(() => {
    fetchPendingDeposits();
  }, []);

  const fetchPendingDeposits = async () => {
    setLoading(true);
    await supabase.auth.refreshSession();
    try {
      const { data, error: fetchError } = await supabase
        .from('deposits')
        .select(`
          *,
          profiles!deposits_user_id_fkey (
            id, full_name, phone, referral_code, referred_by, successful_referrals
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
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
    await supabase.auth.refreshSession();
    try {
      // 1. Update deposit status to approved
      const { error: updateError } = await supabase
        .from('deposits')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', depositId);

      if (updateError) throw updateError;

      // 2. Get deposit details to process
      const { data: depositData, error: depositError } = await supabase
        .from('deposits')
        .select(`
          *,
          profiles!deposits_user_id_fkey (
            id, full_name, phone, referral_code, referred_by, successful_referrals, vip_level, daily_quota_limit, total_deposited, account_status
          )
        `)
        .eq('id', depositId)
        .single();

      if (depositError) throw depositError;

      const deposit = depositData;
      const profile = deposit.profiles;

      if (!profile) throw new Error('Profile not found for deposit');

      // 3. Update account status to active
      if (profile.account_status !== 'active') {
        const { error: accountStatusError } = await supabase
          .from('profiles')
          .update({ account_status: 'active' })
          .eq('id', profile.id);

        if (accountStatusError) throw accountStatusError;
      }

      // 4. Increment referrer's successful_referrals
      if (profile.referred_by) {
        const { error: referrerError } = await supabase.rpc('increment_successful_referrals', { uid: profile.referred_by });
        if (referrerError) throw referrerError;
      }

      // 5. INSERT NOTIFICATION
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Deposit Approved',
        message: `Your deposit of ${parseFloat(deposit.amount).toFixed(2)} ETB has been approved.`
      });

      await fetchPendingDeposits();
      setSuccess('Deposit approved successfully.');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('[AdminPayments] Error approving deposit:', err);
      setError(err.message || 'Failed to approve deposit');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
      setSelectedDeposit(null);
    }
  };

  const handleDecline = async (depositId) => {
    setLoading(true);
    await supabase.auth.refreshSession();
    try {
      const { error: updateError } = await supabase
        .from('deposits')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', depositId);
        
      if (updateError) throw updateError;
      
      // INSERT NOTIFICATION
      const { data: depositData } = await supabase.from('deposits').select('user_id, amount').eq('id', depositId).single();
      if (depositData) {
        await supabase.from('notifications').insert({
          user_id: depositData.user_id,
          title: 'Deposit Declined',
          message: `Your deposit of ${parseFloat(depositData.amount).toFixed(2)} ETB was declined.`
        });
      }

      await fetchPendingDeposits();
      setSuccess('Deposit declined successfully.');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('[AdminPayments] Error declining deposit:', err);
      setError('Failed to decline deposit');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
      setSelectedDeposit(null);
    }
  };

  if (loading && pendingDeposits.length === 0) {
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

      {pendingDeposits.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Banknote size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No pending deposit requests.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {pendingDeposits.map((deposit) => (
            <GlassCard key={deposit.id} className={`border ${deposit.is_flagged ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'} p-4`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                
                {/* Deposit Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white/90 text-sm font-medium">Deposit ID: {deposit.id.split('-')[0]}...</p>
                    {deposit.is_flagged && (
                      <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 flex items-center gap-1">
                        <AlertTriangle size={10} /> Duplicate Detected
                      </span>
                    )}
                  </div>
                  <p className="text-white/70 text-xs mt-1">
                    User: <span className="text-white font-semibold">{deposit.profiles?.full_name || 'Unknown'}</span> ({deposit.profiles?.phone || 'N/A'})
                  </p>
                  <p className="text-white/70 text-xs mt-1">
                    Amount: <span className="text-amber-400 font-bold">{parseFloat(deposit.amount).toFixed(2)} ETB</span> • Method: {deposit.payment_method}
                  </p>
                  <p className="text-white/70 text-xs mt-1">
                    Reference: {deposit.payment_reference || 'None'}
                  </p>
                  <p className="text-white/70 text-xs mt-1">
                    Submitted: {new Date(deposit.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={() => setSelectedDeposit(deposit)}
                    className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-all active:scale-95"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => handleDecline(deposit.id)}
                    disabled={loading}
                    className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-all active:scale-95"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => approveDeposit(deposit.id)}
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

      {/* DETAILS MODAL */}
      {selectedDeposit && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <GlassCard className="w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto fade-in-up">
            {/* Close Button */}
            <button 
              onClick={() => setSelectedDeposit(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-white/50 transition-colors active:scale-95"
            >
              <X size={18} />
            </button>

            <h3 className="text-white font-bold text-xl mb-4">Deposit Details</h3>

            {/* FRAUD WARNING IN MODAL */}
            {selectedDeposit.is_flagged && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-red-400 text-sm font-bold">Fraud Warning</p>
                  <p className="text-red-400/80 text-xs">This payment reference or image hash has been used in a previous deposit. Please verify carefully.</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* User Info */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-white/40 text-xs uppercase tracking-wide mb-1">User Information</p>
                <p className="text-white font-semibold">{selectedDeposit.profiles?.full_name || 'Unknown'}</p>
                <p className="text-white/60 text-sm">{selectedDeposit.profiles?.phone || 'No phone'}</p>
              </div>

              {/* Deposit Info */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Amount</p>
                  <p className="text-amber-400 font-bold text-lg">{parseFloat(selectedDeposit.amount).toFixed(2)} ETB</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Target VIP</p>
                  <p className="text-white font-semibold">{selectedDeposit.target_vip || 'Basic'}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Reference</p>
                  <p className="text-white text-sm truncate">{selectedDeposit.payment_reference || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Transaction ID</p>
                  <p className="text-white text-sm truncate">{selectedDeposit.transaction_id || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Date Submitted</p>
                  <p className="text-white text-sm">{new Date(selectedDeposit.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Proof Image */}
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Payment Proof</p>
                {selectedDeposit.proof_image_url ? (
                  <a href={selectedDeposit.proof_image_url} target="_blank" rel="noopener noreferrer" className="block relative group">
                    <img 
                      src={selectedDeposit.proof_image_url} 
                      alt="Payment Proof" 
                      className="w-full h-auto max-h-72 object-contain rounded-xl border border-white/10 bg-black/50" 
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                      <span className="text-white text-sm font-medium flex items-center gap-1">
                        Open Full Image <ExternalLink size={14} />
                      </span>
                    </div>
                  </a>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                    <p className="text-white/40 text-sm">No image uploaded.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons in Modal */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
              <button 
                onClick={() => handleDecline(selectedDeposit.id)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 font-semibold hover:bg-red-500/30 transition-all active:scale-95"
              >
                Decline
              </button>
              <button 
                onClick={() => approveDeposit(selectedDeposit.id)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold hover:bg-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Approve
              </button>
            </div>
          </GlassCard>
        </div>
      )}

    </div>
  );
};

export default AdminPayments;