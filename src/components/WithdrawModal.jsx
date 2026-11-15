import { useState } from 'react';
import { Loader2, X, AlertTriangle, Copy, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import GlassCard from './GlassCard';

const WithdrawModal = ({ balance, user, profile, refreshProfile, withdrawalMinimum, referralsRequired, successfulReferrals, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showReferralGate, setShowReferralGate] = useState(false);

  const minWithdrawal = withdrawalMinimum || 100;
  const [copied, setCopied] = useState(false);
  let [copyMsg, setCopyMsg] = useState('');

// Build the referral link from the user's own referral code and the current origin
// Build the referral link - with fallback for missing referral_code
let referralLink;
if (!profile?.referral_code) {
  referralLink = null;
  copyMsg = 'Generating code... please refresh.';
} else {
  referralLink = `${window.location.origin}/auth?ref=${profile.referral_code}`;
  copyMsg = '';
}

const handleWithdraw = async (e) => {
    e.preventDefault();
    setError('');

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError('Enter a valid amount');
    if (amt < minWithdrawal + 1) return setError(`Minimum withdrawal is ${minWithdrawal} ETB. You need to withdraw more than ${minWithdrawal} ETB.`);
    if (amt > balance) return setError('Insufficient balance');

    // --- Referral gate check (moved here from the Wallet page) ---
    if (successfulReferrals < referralsRequired) {
      setShowReferralGate(true);
      return;
    }
    // --- End referral gate check ---

    setProcessing(true);
    try {
      await supabase.from('withdrawals').insert({ user_id: user.id, amount: amt, status: 'pending' });
      await supabase.from('profiles').update({ balance: balance - amt }).eq('id', user.id);
      await refreshProfile();
      onSuccess(`Withdrawal of ${amt.toFixed(2)} ETB requested successfully.`);
    } catch (err) {
      setError(err.message || 'Withdrawal failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const copyReferral = async () => {
    if (!profile?.referral_code) {
      setCopyMsg('Referral code still generating. Please refresh the page.');
      setTimeout(() => setCopyMsg(''), 2000);
      return;
    }
    try {
      const link = `${window.location.origin}/auth?ref=${profile.referral_code}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setCopyMsg('Link copied!');
      setTimeout(() => { setCopied(false); setCopyMsg(''); }, 1800);
    } catch {
      setCopyMsg('Failed to copy');
      setTimeout(() => setCopyMsg(''), 1800);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6 fade-in-up">
        <h3 className="text-white font-bold text-lg mb-4">Withdraw Funds</h3>
        <form onSubmit={handleWithdraw} className="space-y-4">
          <div>
            <label className="text-white/50 text-sm block mb-1.5">Amount (ETB)</label>
            <input
              type="number"
              min={minWithdrawal + 1}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="glass-input"
              placeholder={`Min ${minWithdrawal + 1} ETB`}
            />
          </div>
          <div>
            <label className="text-white/50 text-sm block mb-1.5">Receiving Phone (e.g. Telebirr)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="glass-input"
              placeholder="09XXXXXXXX"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={processing} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {processing ? (<><Loader2 size={16} className="animate-spin" />Processing…</>) : 'Confirm'}
            </button>
          </div>
        </form>
      </div>

      {/* Referral Gate Modal */}
      {showReferralGate && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80">
          <GlassCard className="w-full max-w-sm p-6 text-center fade-in-up">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle size={28} className="text-amber-400" />
            </div>
            <h4 className="text-white font-bold text-lg mb-2">Withdrawal Locked</h4>
            <p className="text-white/60 text-sm mb-5">
              To withdraw your {amount} ETB, you must invite {referralsRequired} friends who have paid the registration fee. You currently have {successfulReferrals} active referrals.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowReferralGate(false)} className="btn-secondary flex-1">Close</button>
              <button type="button" onClick={copyReferral} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {copied ? <><CheckCircle2 size={16} /> Copied</> : <><Copy size={16} /> Copy Referral Link</>}
              </button>
            </div>
            {copyMsg && (
              <p className={`text-xs mt-3 ${copied ? 'text-emerald-400' : 'text-red-400'}`}>{copyMsg}</p>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default WithdrawModal;
