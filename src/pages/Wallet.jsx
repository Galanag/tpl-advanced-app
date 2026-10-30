import { useEffect, useState } from 'react';
import { Wallet as WalletIcon, ArrowUpRight, ArrowLeftRight, TrendingUp, Gift, PlusCircle, Banknote, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import GlassCard from '../components/GlassCard';
import SkeletonLoader from '../components/SkeletonLoader';
import WithdrawModal from '../components/WithdrawModal';
import { useNavigate } from 'react-router-dom';

const Wallet = () => {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const navigate = useNavigate();
  
  // Financial metrics
  const [availableBalance, setAvailableBalance] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalApprovedDeposits, setTotalApprovedDeposits] = useState(0);
  const [pendingWithdrawalsAmount, setPendingWithdrawalsAmount] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  
  // Transaction history
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
    const [showReferralGate, setShowReferralGate] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Withdrawal limits
  const [withdrawalMinimum, setWithdrawalMinimum] = useState(100); // default
  const [referralsRequired, setReferralsRequired] = useState(5); // default
  
  const balance = parseFloat(profile?.balance) || 0;
  const successfulReferrals = parseInt(profile?.successful_referrals || 0);
  
  // Fetch financial metrics and transaction history
  useEffect(() => {
    fetchFinancialMetrics();
    fetchTransactions();
  }, [profile?.id]);
  
  const fetchFinancialMetrics = async () => {
    if (!user?.id) return;
    
    try {
      // Available balance (from profiles)
      setAvailableBalance(balance);
      
      // Total earnings (commissions)
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('commissions')
        .select('amount')
        .eq('user_id', user.id);
      
      if (commissionsError) throw commissionsError;
      const totalEarn = (commissionsData || []).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      setTotalEarnings(totalEarn);
      
      // Total approved deposits
      const { data: depositsData, error: depositsError } = await supabase
        .from('deposits')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'approved');
      
      if (depositsError) throw depositsError;
      const totalDeposits = (depositsData || []).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      setTotalApprovedDeposits(totalDeposits);
      
      // Pending withdrawals amount
      const { data: pendingWithdrawalsData, error: pendingWithdrawalsError } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'pending');
      
      if (pendingWithdrawalsError) throw pendingWithdrawalsError;
      const totalPending = (pendingWithdrawalsData || []).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      setPendingWithdrawalsAmount(totalPending);
      
      // Total withdrawn (approved or completed)
      const { data: withdrawnData, error: withdrawnError } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('user_id', user.id)
        .in('status', ['approved', 'completed']);
      
      if (withdrawnError) throw withdrawnError;
      const totalWithdrawnAmount = (withdrawnData || []).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      setTotalWithdrawn(totalWithdrawnAmount);
    } catch (err) {
      console.error('Error fetching financial metrics:', err);
    }
  };
  
  const fetchTransactions = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [cr, wr] = await Promise.all([
        supabase.from('commissions').select('id, amount, type, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('withdrawals').select('id, amount, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
      ]);
      const all = [
        ...(cr.data || []).map(c => ({ id: `c-${c.id}`, type: 'commission', amount: parseFloat(c.amount), label: `Commission (${c.type || 'P1'})`, date: c.created_at })),
        ...(wr.data || []).map(w => ({ id: `w-${w.id}`, type: 'withdrawal', amount: -parseFloat(w.amount), label: `Withdrawal (${w.status})`, date: w.created_at })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(all);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const iconFor = (type) => type === 'commission'
    ? <TrendingUp size={16} className="text-emerald-400" />
    : <ArrowUpRight size={16} className="text-amber-400" />;
  
  const canWithdraw = successfulReferrals >= referralsRequired && availableBalance >= withdrawalMinimum && profile?.payment_account_number;
  
  return (
    <div className="fade-in-up space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Wallet</h2>
        <p className="text-white/50 text-sm mt-0.5">Manage your earnings and withdrawals</p>
      </div>
      
      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <GlassCard className="p-4">
          <h3 className="text-white font-semibold mb-2">Available Balance</h3>
          <p className="text-2xl font-bold text-white">
            {availableBalance.toFixed(2)} <span className="text-lg text-amber-400">ETB</span>
          </p>
          <p className="text-white/50 text-xs mt-1">What you can withdraw</p>
        </GlassCard>
        
        <GlassCard className="p-4">
          <h3 className="text-white font-semibold mb-2">Total Earnings</h3>
          <p className="text-2xl font-bold text-white">
            {totalEarnings.toFixed(2)} <span className="text-lg text-amber-400">ETB</span>
          </p>
          <p className="text-white/50 text-xs mt-1">From commissions</p>
        </GlassCard>
        
        <GlassCard className="p-4">
          <h3 className="text-white font-semibold mb-2">Total Approved Deposits</h3>
          <p className="text-2xl font-bold text-white">
            {totalApprovedDeposits.toFixed(2)} <span className="text-lg text-amber-400">ETB</span>
          </p>
          <p className="text-white/50 text-xs mt-1">From approved deposits</p>
        </GlassCard>
        
        <GlassCard className="p-4">
          <h3 className="text-white font-semibold mb-2">Pending Withdrawals</h3>
          <p className="text-2xl font-bold text-white">
            {pendingWithdrawalsAmount.toFixed(2)} <span className="text-lg text-amber-400">ETB</span>
          </p>
          <p className="text-white/50 text-xs mt-1">Awaiting approval</p>
        </GlassCard>
        
        <GlassCard className="p-4">
          <h3 className="text-white font-semibold mb-2">Total Withdrawn</h3>
          <p className="text-2xl font-bold text-white">
            {totalWithdrawn.toFixed(2)} <span className="text-lg text-amber-400">ETB</span>
          </p>
          <p className="text-white/50 text-xs mt-1">Successfully withdrawn</p>
        </GlassCard>
      </div>
      
      {/* Action Buttons */}
      <GlassCard className="relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl -ml-10 -mb-10" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-white/50 text-sm">Available Balance</p>
            <h3 className="text-4xl font-bold text-white mt-1">
              {availableBalance.toFixed(2)} <span className="text-lg text-amber-400">ETB</span>
            </h3>
            <p className="text-white/40 text-xs mt-2">Minimum withdrawal: {withdrawalMinimum} ETB</p>
            <p className="text-white/40 text-xs mt-1">Referrals required: {referralsRequired} (You have {successfulReferrals})</p>
            {!profile?.payment_account_number && (
              <p className="text-white/40 text-xs mt-1 text-red-400">Please add payment method in Profile</p>
            )}
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/20">
            <WalletIcon size={24} className="text-slate-900" />
          </div>
        </div>
        <div className="relative grid grid-cols-2 gap-3 mt-6">
          <div className="flex space-x-2">
            <button onClick={() => navigate('/deposit')} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <PlusCircle size={18} /> Deposit
            </button>
            <button
              onClick={() => {
                if (!profile?.payment_account_number) {
                  setMessage({ type: 'error', text: 'Please add your payment method in your Profile before withdrawing.' });
                } else if (successfulReferrals < referralsRequired) {
                  setShowReferralGate(true);
                } else if (availableBalance < withdrawalMinimum) {
                  setMessage({ type: 'error', text: `Your available balance is below the minimum withdrawal of ${withdrawalMinimum} ETB.` });
                } else {
                  setShowWithdraw(true);
                }
              }}
              disabled={!canWithdraw}
              className={`btn-primary flex-1 flex items-center justify-center gap-2 ${!canWithdraw ? 'opacity-50' : ''}`}
            >
              <ArrowUpRight size={18} /> Withdraw
            </button>
          </div>
        </div>
      </GlassCard>
      
      {message && (
        <div className={`rounded-xl px-4 py-3 border text-sm ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : message.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400'
          : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
        }`}>{message.text}</div>
      )}
      
      {showReferralGate && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80">
          <GlassCard className="w-full max-w-sm p-6 text-center fade-in-up">
            <AlertTriangle size={48} className="text-amber-400 mx-auto mb-3" />
            <h4 className="text-white font-bold text-lg mb-2">Insufficient Referrals</h4>
            <p className="text-white/50 text-sm mb-5">
              You need {referralsRequired} successful referrals to withdraw. You currently have {successfulReferrals}.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowReferralGate(false)} className="btn-secondary flex-1">
                OK
              </button>
            </div>
          </GlassCard>
        </div>
      )}
      
      {showWithdraw && (
        <WithdrawModal
          balance={availableBalance}
          user={user}
          refreshProfile={refreshProfile}
          withdrawalMinimum={withdrawalMinimum}
          onClose={() => setShowWithdraw(false)}
          onSuccess={(text) => { setMessage({ type: 'success', text }); setShowWithdraw(false); fetchFinancialMetrics(); fetchTransactions(); }}
        />
      )}
      
      {/* Transaction History */}
      <div>
        <h3 className="text-white font-semibold mb-3">Transaction History</h3>
{loading ? (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => <SkeletonLoader key={i} className="h-16 w-full rounded-xl" />)}
  </div>
) : transactions.length === 0 ? (
  <GlassCard className="text-center py-10">
    <Gift size={40} className="text-white/20 mx-auto mb-3" />
    <p className="text-white/40 text-sm">No transactions yet. Start watching videos to earn!</p>
  </GlassCard>
) : (
  <div className="space-y-2">
    {transactions.map((tx) => (
      <GlassCard key={tx.id} className="flex items-center gap-3 py-3 px-4">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          {iconFor(tx.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/90 text-sm font-medium truncate">{tx.label}</p>
          <p className="text-white/40 text-xs">{tx.date ? new Date(tx.date).toLocaleString() : ''}</p>
        </div>
        <span className={`font-semibold text-sm shrink-0 ${tx.amount >= 0 ? 'text-emerald-400' : 'text-white/60'}`}>
          {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)} ETB
        </span>
      </GlassCard>
    ))}
  </div>
)}
      </div>
    </div>
  );
};

export default Wallet;