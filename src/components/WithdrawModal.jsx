import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const WithdrawModal = ({ balance, onClose, onSuccess, user, refreshProfile, withdrawalMinimum }) => {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const minWithdrawal = withdrawalMinimum || 100;

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError('Enter a valid amount');
    if (amt < minWithdrawal + 1) return setError(`Minimum withdrawal is ${minWithdrawal} ETB. You need to withdraw more than ${minWithdrawal} ETB.`);
    if (amt > balance) return setError('Insufficient balance');
    if (!phone.trim()) return setError('Enter the receiving phone number');
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
    </div>
  );
};

export default WithdrawModal;