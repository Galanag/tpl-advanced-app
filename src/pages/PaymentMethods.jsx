import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/GlassCard';
import { ArrowLeft, Save, Smartphone, Loader2, CheckCircle2 } from 'lucide-react';

const PaymentMethods = () => {
  const { user, profile, refreshProfile } = useAuthStore();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    payment_method: 'Telebirr',
    payment_account_name: '',
    payment_account_number: ''
  });

  // Pre-fill the form with existing data if it exists
  useEffect(() => {
    if (profile) {
      setForm({
        payment_method: 'Telebirr', // Hardcoded to Telebirr
        payment_account_name: profile.payment_account_name || '',
        payment_account_number: profile.payment_account_number || ''
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!form.payment_account_name.trim()) {
      setError('Account name is required');
      setLoading(false);
      return;
    }
    if (!form.payment_account_number.trim()) {
      setError('Account number is required');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          payment_method: 'Telebirr', // Enforce Telebirr
          payment_account_name: form.payment_account_name.trim(),
          payment_account_number: form.payment_account_number.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile(); // Update the global state
      setSuccess('Payment method saved successfully!');
      
      // Redirect back to profile after 1.5 seconds
      setTimeout(() => navigate('/profile'), 1500);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save payment method.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in-up space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate('/profile')} className="p-2 rounded-full hover:bg-white/10 text-white/60 transition-colors active:scale-95">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Payment Methods</h2>
          <p className="text-white/50 text-sm mt-0.5">Set up your withdrawal account</p>
        </div>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <Smartphone size={20} className="text-amber-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Telebirr Only</p>
            <p className="text-white/50 text-xs">Currently, all withdrawals are processed via Telebirr.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-white/50 text-sm block mb-1.5">Payment Method</label>
            <div className="glass-input bg-white/5 py-3 px-4 text-white/70 flex items-center gap-2 cursor-not-allowed">
              <Smartphone size={16} className="text-amber-400" /> Telebirr (Default)
            </div>
          </div>

          <div>
            <label className="text-white/50 text-sm block mb-1.5">Account Name (Full Name)</label>
            <input
              type="text"
              name="payment_account_name"
              value={form.payment_account_name}
              onChange={handleChange}
              className="glass-input"
              placeholder="e.g. Abebe Bikila"
            />
          </div>

          <div>
            <label className="text-white/50 text-sm block mb-1.5">Telebirr Phone Number</label>
            <input
              type="tel"
              name="payment_account_number"
              value={form.payment_account_number}
              onChange={handleChange}
              className="glass-input"
              placeholder="e.g. 0912345678"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <p className="text-emerald-400 text-sm">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Saving...</>
            ) : (
              <><Save size={18} /> Save Payment Method</>
            )}
          </button>
        </form>
      </GlassCard>
    </div>
  );
};

export default PaymentMethods;