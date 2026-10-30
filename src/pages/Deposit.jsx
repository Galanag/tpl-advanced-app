import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import SkeletonLoader from '../components/SkeletonLoader';

const Deposit = () => {
  const { user, refreshProfile } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    amount: '',
    paymentMethod: '',
    transactionId: '',
  });

  const paymentMethods = [
    { label: 'Telebirr', value: 'telebirr' },
    { label: 'M-Pesa', value: 'm-pesa' },
    { label: 'Bank Transfer', value: 'bank_transfer' },
    { label: 'CBE Birr', value: 'cbe_birr' },
    { label: 'Other', value: 'other' },
  ];

  useEffect(() => {
    // Clear success/error messages when component mounts or user changes
    setError('');
    setSuccess('');
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!user) {
      setError('User not authenticated');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!form.paymentMethod) {
      setError('Please select a payment method');
      return;
    }
    if (!form.transactionId.trim()) {
      setError('Transaction ID is required');
      return;
    }

    setLoading(true);
    try {
      // Insert deposit request
      const { data, error: depositError } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          amount: parseFloat(form.amount),
          payment_method: form.paymentMethod,
          transaction_id: form.transactionId.trim(),
          status: 'pending',
        })
        .select()
        .single();

       if (depositError) throw depositError;

       setSuccess('Deposit request submitted successfully. Awaiting admin approval.');
       setForm({
         amount: '',
         paymentMethod: '',
         transactionId: '',
       });

       // Navigate to wallet after 1.5 seconds to show the success message
       setTimeout(() => {
         navigate('/wallet');
       }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit deposit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Ambient glow blobs */}
      <div className="fixed top-[-20%] left-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md fade-in-up relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/30">
            <span className="text-slate-900 font-bold text-3xl">H</span>
          </div>
          <h1 className="text-2xl font-bold text-white">HIDASE</h1>
          <p className="text-white/50 text-sm mt-1">Investment Group — Watch &amp; Earn</p>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-white font-semibold mb-4">Make a Deposit</h2>
          <p className="text-white/40 text-sm mb-6">
            Submit a deposit request to increase your balance and upgrade your VIP level.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 mb-4">
              <p className="text-emerald-400 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/50 text-sm block mb-1.5">Amount (ETB) *</label>
              <input
                type="number"
                min="1"
                step="0.01"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                className="glass-input"
                placeholder="Enter deposit amount"
              />
            </div>

            <div>
              <label className="text-white/50 text-sm block mb-1.5">Payment Method *</label>
              <select
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleChange}
                className="glass-input"
              >
                <option value="">Select payment method</option>
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white/50 text-sm block mb-1.5">Transaction ID *</label>
              <input
                type="text"
                name="transactionId"
                value={form.transactionId}
                onChange={handleChange}
                className="glass-input"
                placeholder="Enter your transaction ID"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setForm({ amount: '', paymentMethod: '', transactionId: '' });
                  setError('');
                  setSuccess('');
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    Submitting…
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Deposit;