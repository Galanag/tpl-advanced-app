import { useState } from 'react';
import { Loader2, X, AlertTriangle, Copy, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import GlassCard from './GlassCard';

const WithdrawModal = ({ 
  balance, 
  user, 
  profile, 
  refreshProfile, 
  withdrawalMinimum, 
  requiredReferrals, 
  successfulReferrals, 
  onClose, 
  onSuccess 
}) => {
  const navigate = useNavigate();
  
  // --- State ---
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // --- Referral Gate State ---
  const [showReferralGate, setShowReferralGate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  const minWithdrawal = withdrawalMinimum || 3000;

  // Build the referral link safely
  let referralLink = null;
  let initialCopyMsg = '';
  if (!profile?.referral_code) {
    initialCopyMsg = 'Generating code... please refresh.';
  } else {
    referralLink = `${window.location.origin}/auth?ref=${profile.referral_code}`;
  }

  // ==========================================
  // Main Withdrawal Submission Logic
  // ==========================================
  const handleWithdraw = async (e) => {
    e.preventDefault();
    setError('');

    const amt = parseFloat(amount);
    
    // 1. Basic Validation
    if (!amt || amt <= 0) return setError('Enter a valid amount');
    
    // 2. Minimum Withdrawal Check (Strictly >=)
    if (amt < minWithdrawal) {
      return setError(`Minimum withdrawal is ${minWithdrawal} ETB.`);
    }
    
    // 3. Sufficient Balance Check
    if (amt > balance) return setError('Insufficient balance');

    // 4. Referral Gate Check
    if (successfulReferrals < requiredReferrals) {
      setShowReferralGate(true);
      return;
    }

    // 5. Process Withdrawal
    setProcessing(true);
    try {
      // Insert withdrawal record
      await supabase.from('withdrawals').insert({ 
        user_id: user.id, 
        amount: amt, 
        status: 'pending' 
      });
      
      // Deduct from balance
      await supabase.from('profiles').update({ 
        balance: balance - amt 
      }).eq('id', user.id);
      
      // Refresh local profile state
      await refreshProfile();
      
      // Trigger success callback and close modal
      onSuccess(`Withdrawal of ${amt.toFixed(2)} ETB requested successfully.`);
      
    } catch (err) {
      setError(err.message || 'Withdrawal failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ==========================================
  // Copy Referral Link Logic
  // ==========================================
  const copyReferral = async () => {
    if (!profile?.referral_code) {
      alert("Your referral code is still generating. Redirecting you to the Team page where you can get it.");
      navigate('/team');
      return;
    }

    const link = `${window.location.origin}/auth?ref=${profile.referral_code}`;

    try {
      // Try modern API first (works on desktop and newer mobile browsers)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setCopyMsg('Link copied!');
        setTimeout(() => { setCopied(false); setCopyMsg(''); }, 2000);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (err) {
      // Fallback for older mobile browsers (iOS Safari)
      try {
        const textArea = document.createElement("textarea");
        textArea.value = link;
        
        // Make the textarea invisible
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopied(true);
          setCopyMsg('Link copied!');
          setTimeout(() => { setCopied(false); setCopyMsg(''); }, 2000);
        } else {
          throw new Error('execCommand failed');
        }
      } catch (fallbackErr) {
        setCopyMsg('Failed to copy. Please select the link manually.');
        setTimeout(() => setCopyMsg(''), 3000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6 fade-in-up">
        <h3 className="text-white font-bold text-lg mb-4">Withdraw Funds</h3>
        
        <form onSubmit={handleWithdraw} className="space-y-4">
          {/* Amount Input */}
          <div>
            <label className="text-white/50 text-sm block mb-1.5">Amount (ETB)</label>
            <input
              type="number"
              min={minWithdrawal}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="glass-input"
              placeholder={`Min ${minWithdrawal} ETB`}
            />
          </div>
          
          {/* Phone Input */}
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
          
          {/* Error Message */}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={processing} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {processing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing…
                </>
              ) : 'Confirm'}
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
              To withdraw your {amount} ETB, you must invite {requiredReferrals} friends who have paid the registration fee. You currently have {successfulReferrals} active referrals.
            </p>
            
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowReferralGate(false)} 
                className="btn-secondary flex-1"
              >
                Close
              </button>
              
              <button 
                type="button" 
                onClick={copyReferral} 
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {copied ? (
                  <><CheckCircle2 size={16} /> Copied</>
                ) : (
                  <><Copy size={16} /> Copy Link</>
                )}
              </button>
            </div>
            
            {copyMsg && (
              <p className={`text-xs mt-3 ${copied ? 'text-emerald-400' : 'text-red-400'}`}>
                {copyMsg}
              </p>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default WithdrawModal;