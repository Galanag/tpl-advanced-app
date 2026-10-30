import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Loader2, Banknote } from 'lucide-react';

const PaymentMethods = () => {
  const { profile, refreshProfile } = useAuthStore();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState(profile?.payment_method || '');
  const [paymentAccountName, setPaymentAccountName] = useState(profile?.payment_account_name || '');
  const [paymentAccountNumber, setPaymentAccountNumber] = useState(profile?.payment_account_number || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const paymentMethods = [
    { label: 'Telebirr', value: 'Telebirr' },
    { label: 'CBE Birr', value: 'CBE Birr' },
    { label: 'Awash Bank', value: 'Awash Bank' },
    { label: 'Dashen Bank', value: 'Dashen Bank' },
    { label: 'Bank of Abyssinia', value: 'Bank of Abyssinia' },
    { label: 'Other', value: 'Other' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          payment_method: paymentMethod || null,
          payment_account_name: paymentAccountName || null,
          payment_account_number: paymentAccountNumber || null,
        })
        .eq('id', profile?.id);

      if (updateError) throw updateError;

      // Update the auth store
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigate('/profile');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to save payment method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in-up space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Payment Methods</h2>
        <button
          onClick={() => navigate('/profile')}
          className="text-sm text-white/60 hover:text-white"
        >
          Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Banknote size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <select
            name="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="glass-input pl-10"
            autoComplete="off"
            required
          >
            <option value="">Select Payment Method</option>
            {paymentMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            name="paymentAccountName"
            placeholder="Account Name (e.g., John Doe)"
            value={paymentAccountName}
            onChange={(e) => setPaymentAccountName(e.target.value)}
            className="glass-input pl-10"
            autoComplete="name"
            required
          />
        </div>

        <div className="relative">
          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="tel"
            name="paymentAccountNumber"
            placeholder="Account Number"
            value={paymentAccountNumber}
            onChange={(e) => setPaymentAccountNumber(e.target.value)}
            className="glass-input pl-10"
            autoComplete="tel"
            required
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
            <p className="text-emerald-400 text-sm">Payment method saved successfully!</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Saving...
            </>
          ) : (
            'Save Payment Method'
          )}
        </button>
      </form>
    </div>
  );
};

export default PaymentMethods;