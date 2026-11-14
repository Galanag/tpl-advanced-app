import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import SkeletonLoader from '../components/SkeletonLoader';

const Deposit = () => {
  const { user, profile, refreshProfile } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [form, setForm] = useState({
    amount: '',
    paymentMethod: '',
    transactionId: '',
    targetVip: '',
    paymentReference: '',
    paymentName: '',
    proofImage: null,
    proofImageUrl: '',
  });

  const paymentMethods = [
    { label: 'Telebirr', value: 'Telebirr' },
    { label: 'CBE Birr', value: 'CBE Birr' },
    { label: 'Awash Bank', value: 'Awash Bank' },
    { label: 'Dashen Bank', value: 'Dashen Bank' },
    { label: 'Bank of Abyssinia', value: 'Bank of Abyssinia' },
    { label: 'Other', value: 'Other' },
  ];

  // Determine which VIP levels are available for upgrade
  const getAvailableVipLevels = () => {
    if (!profile?.vip_level) return [];
    const vipOrder = ['Basic', 'VIP1', 'VIP2', 'VIP3'];
    const currentIndex = vipOrder.indexOf(profile.vip_level);
    if (currentIndex === -1) return [];
    return vipOrder.slice(currentIndex + 1);
  };

  const availableVipLevels = getAvailableVipLevels();
  const maxVipLevel = 'VIP3';

  const getUpgradeCost = (targetVip) => {
    const currentVip = profile?.vip_level || 'Basic';
    const currentPrice = settings[`${currentVip.toLowerCase()}_price`] || 0;
    const targetPrice = settings[`${targetVip.toLowerCase()}_price`] || 0;
    return Math.max(0, targetPrice - currentPrice);
  };

  useEffect(() => {
    // Clear messages
    setError('');
    setSuccess('');
    fetchSettings();
  }, [user, profile?.vip_level]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('admin_settings').select('*');
      if (error) throw error;
      const settingsMap = {};
      (data || []).forEach((s) => { settingsMap[s.key] = s.value; });
      setSettings(settingsMap);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'proofImage') {
      const file = files[0];
      if (file) {
        setForm((prev) => ({ ...prev, proofImage: file }));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
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

    if (!form.targetVip) {
      setError('Please select a target VIP');
      return;
    }

    if (!form.paymentReference.trim()) {
      setError('Payment reference is required');
      return;
    }

    if (!form.paymentName.trim()) {
      setError('Payment name is required');
      return;
    }

    if (!form.proofImage) {
      setError('Proof image is required');
      return;
    }

    setLoading(true);

    try {
      // Upload proof image to Supabase Storage
      const file = form.proofImage;
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `deposit_proofs/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('deposit_proofs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw new Error(`Failed to upload proof image: ${uploadError.message}`);
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('deposit_proofs')
        .getPublicUrl(filePath);

      const proofImageUrl = publicUrlData.publicUrl;

      // Insert deposit request with all fields
      const { data, error: depositError } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          amount: parseFloat(form.amount),
          payment_method: form.paymentMethod,
          transaction_id: form.transactionId.trim(),
          target_vip: form.targetVip,
          payment_reference: form.paymentReference.trim(),
          payment_name: form.paymentName.trim(),
          proof_image_url: proofImageUrl,
          status: 'pending',
        })
        .select()
        .single();

      if (depositError) throw depositError;

      setSuccess('Deposit upgrade request submitted successfully. Awaiting admin approval.');
      setForm({
        amount: '',
        paymentMethod: '',
        transactionId: '',
        targetVip: profile?.vip_level || '',
        paymentReference: '',
        paymentName: '',
        proofImage: null,
        proofImageUrl: '',
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
          <p className="text-white/50 text-sm mt-1">Investment Group — Watch & Earn</p>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-white font-semibold mb-4">Upgrade VIP Level</h2>
          <p className="text-white/40 text-sm mb-6">
            Submit a deposit request to upgrade your VIP level and earn more.
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

          {availableVipLevels.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-4">
              <p className="text-amber-400 text-sm">You are at the highest VIP level ({profile?.vip_level || 'Basic'}). No further upgrades available.</p>
            </div>
          ) : settingsLoading ? (
            <div className="text-center py-8">
              <SkeletonLoader className="h-20 w-full rounded-xl" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white/50 text-sm block mb-1.5">Current VIP Level</label>
                <div className="glass-input py-2 px-3 bg-white/5 text-white/70">
                  {profile?.vip_level || 'Basic'}
                </div>
              </div>

              <div>
                <label className="text-white/50 text-sm block mb-1.5">Target VIP Level *</label>
                <select
                  name="targetVip"
                  value={form.targetVip}
                  onChange={handleChange}
                  className="glass-input"
                >
                  <option value="">Select target VIP</option>
                  {availableVipLevels.map((vip) => (
                    <option key={vip} value={vip}>{vip}</option>
                  ))}
                </select>
              </div>

              {form.targetVip && (
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <p className="text-amber-400 text-sm font-medium mb-1">Upgrade Cost</p>
                  <p className="text-white text-lg font-bold">
                    +{getUpgradeCost(form.targetVip).toFixed(2)} ETB
                  </p>
                  <p className="text-white/40 text-xs mt-1">
                    From {profile?.vip_level || 'Basic'} to {form.targetVip}
                  </p>
                </div>
              )}

              <div>
                <label className="text-white/50 text-sm block mb-1.5">Amount (ETB) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  className="glass-input"
                  placeholder="Enter amount to pay"
                />
                <p className="text-white/40 text-xs mt-1">
                  Must match exactly: {getUpgradeCost(form.targetVip || 'VIP1').toFixed(2)} ETB
                </p>
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
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/50 text-sm block mb-1.5">Payment Reference (Transaction ID) *</label>
                <input
                  type="text"
                  name="paymentReference"
                  value={form.paymentReference}
                  onChange={handleChange}
                  className="glass-input"
                  placeholder="Enter transaction/reference number"
                />
              </div>

              <div>
                <label className="text-white/50 text-sm block mb-1.5">Account Name *</label>
                <input
                  type="text"
                  name="paymentName"
                  value={form.paymentName}
                  onChange={handleChange}
                  className="glass-input"
                  placeholder="Name on your payment account"
                />
              </div>

              <div>
                <label className="text-white/50 text-sm block mb-1.5">Proof Image (Screenshot) *</label>
                <div className="relative">
                  <input
                    type="file"
                    name="proofImage"
                    onChange={handleChange}
                    className="glass-input"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    required
                  />
                  <p className="text-white/40 text-xs mt-1">
                    Accepted: JPG, PNG, WEBP (max 5MB)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      amount: '',
                      paymentMethod: '',
                      transactionId: '',
                      targetVip: profile?.vip_level || '',
                      paymentReference: '',
                      paymentName: '',
                      proofImage: null,
                      proofImageUrl: '',
                    });
                    setError('');
                    setSuccess('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !form.proofImage}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Deposit;