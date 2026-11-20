import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import SkeletonLoader from '../components/SkeletonLoader';
import { Smartphone, Copy, CheckCircle2, ArrowLeft, ShieldCheck, Sparkles, MessageCircle } from 'lucide-react';
import CryptoJS from 'crypto-js'; // ADDED FOR HASHING

const Deposit = () => {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [copied, setCopied] = useState(false);
  const [telebirrName, setTelebirrName] = useState('');
  const [telebirrNumber, setTelebirrNumber] = useState('');
  const [telebirrMissing, setTelebirrMissing] = useState(false);

  // Form State
  const [form, setForm] = useState({
    amount: '',
    transactionId: '',
    targetVip: '',
    paymentReference: '',
    proofImage: null,
    imageHash: '', // STORES THE MD5 HASH
  });

  const isRegistration = profile?.account_status !== 'active';
  const registrationFee = 1000;

  // Determine which VIP levels are available for upgrade
  const getAvailableVipLevels = () => {
    if (!profile?.vip_level) return [];
    const vipOrder = ['Basic', 'VIP1', 'VIP2', 'VIP3', 'VIP4', 'VIP5', 'VIP6', 'VIP7', 'VIP8', 'VIP9', 'VIP10'];
    const currentIndex = vipOrder.indexOf(profile.vip_level);
    if (currentIndex === -1) return [];
    return vipOrder.slice(currentIndex + 1);
  };

  const availableVipLevels = getAvailableVipLevels();

  const getUpgradeCost = (targetVip) => {
    const currentVip = profile?.vip_level || 'Basic';
    const currentPrice = parseFloat(settings[`${currentVip.toLowerCase()}_price`] || 0);
    const targetPrice = parseFloat(settings[`${targetVip.toLowerCase()}_price`] || 0);
    return Math.max(0, targetPrice - currentPrice);
  };

  // Fetch Global Settings on Mount
  useEffect(() => {
    setError('');
    setSuccess('');
    const fetchSettings = async () => {
      const { data } = await supabase.from('admin_settings').select('*');
      if (data) {
        const settingsObj = {};
        data.forEach((item) => {
          settingsObj[item.key] = item.value;
        });
        setSettings(settingsObj);
        
        // Fetch telebirr details
        setTelebirrName(settingsObj.telebirr_name || '');
        setTelebirrNumber(settingsObj.telebirr_number || '');
        
        if (!settingsObj.telebirr_name && !settingsObj.telebirr_number) {
          setTelebirrMissing(true);
        }
      }
      setSettingsLoading(false);
    };
    fetchSettings();
  }, []);

  // Update Amount when VIP Target Changes
  useEffect(() => {
    if (isRegistration) {
      setForm((prev) => ({ ...prev, amount: String(registrationFee), targetVip: 'Basic' }));
    } else if (form.targetVip) {
      setForm((prev) => ({ ...prev, amount: String(getUpgradeCost(form.targetVip)) }));
    }
  }, [isRegistration, registrationFee, form.targetVip]);

  // Handle File Upload & Hash Generation
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setForm(prev => ({ ...prev, proofImage: file }));

    const reader = new FileReader();
    reader.onload = (event) => {
      const binary = event.target.result;
      const hash = CryptoJS.MD5(binary).toString();
      setForm(prev => ({ ...prev, imageHash: hash }));
    };
    reader.readAsBinaryString(file);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const copyNumber = async () => {
    if (!telebirrNumber) return;
    try {
      await navigator.clipboard.writeText(telebirrNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard not available */
    }
  };

  // Form Validity Checks
  const hasReference = form.paymentReference && form.paymentReference.trim() !== '';
  const hasProof = form.proofImage !== null;
  const canSubmit = !loading && (hasReference || hasProof) && (isRegistration || form.targetVip);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) { setError('User not authenticated'); return; }
    if (!isRegistration && !form.targetVip) { setError('Please select a target VIP level'); return; }
    if (!hasReference && !hasProof) { setError("Please provide either a Transaction Reference OR upload a screenshot."); return; }

    const amount = isRegistration ? registrationFee : getUpgradeCost(form.targetVip);
    if (!amount || amount <= 0) { setError('Unable to determine a valid payment amount'); return; }

    setLoading(true);
    await supabase.auth.refreshSession();
    
    try {
      const reference = form.paymentReference ? form.paymentReference.trim() : '';
      
      // --- FRAUD CHECK START ---
      let isFlagged = false;
      
      // 1. Check duplicate reference
      if (reference) {
        const { data: refData } = await supabase.from('deposits').select('id').eq('payment_reference', reference).single();
        if (refData) isFlagged = true;
      }
      
      // 2. Check duplicate image hash
      if (form.imageHash) {
        const { data: hashData } = await supabase.from('deposits').select('id').eq('image_hash', form.imageHash).single();
        if (hashData) isFlagged = true;
      }
      // --- FRAUD CHECK END ---

      let proofImageUrl = null;
      if (form.proofImage) {
        const file = form.proofImage;
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `deposit_proofs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('deposit_proofs')
          .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type });

        if (uploadError) throw new Error(`Failed to upload proof image: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage.from('deposit_proofs').getPublicUrl(filePath);
        proofImageUrl = publicUrlData.publicUrl;
      }

      const { error: depositError } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          amount,
          payment_method: 'Telebirr',
          transaction_id: reference,
          target_vip: isRegistration ? 'Basic' : form.targetVip,
          payment_reference: reference,
          proof_image_url: proofImageUrl,
          image_hash: form.imageHash, // Save hash
          is_flagged: isFlagged,      // Save flag
          status: 'pending',
        });

      if (depositError) throw depositError;

      setSuccess(
        isRegistration
          ? 'Registration payment submitted. Your account will be activated after admin approval.'
          : 'VIP upgrade request submitted. Awaiting admin approval.'
      );
      setForm({ amount: '', transactionId: '', targetVip: '', paymentReference: '', proofImage: null, imageHash: '' });

      setTimeout(() => navigate('/wallet'), 1600);
    } catch (err) {
      setError(err.message || 'Failed to submit deposit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Ambient glow blobs */}
      <div className="fixed top-[-20%] left-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg mx-auto fade-in-up relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10 text-white/60 transition-colors active:scale-95">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">
              {isRegistration ? 'Activate Your Account' : 'Upgrade VIP Level'}
            </h1>
            <p className="text-white/50 text-sm mt-0.5">
              {isRegistration ? 'Pay the registration fee to start earning' : 'Submit a deposit to upgrade your tier'}
            </p>
          </div>
        </div>

        {/* Telebirr Payment Info */}
        <GlassCard className="p-5 mb-4 border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Smartphone size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Pay via Telebirr</p>
              <p className="text-white/40 text-xs">Send payment to this account, then submit the reference below</p>
            </div>
          </div>
          {telebirrNumber ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-black/20 border border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-white/40 text-[11px] uppercase tracking-wide">Account Name</p>
                  <p className="text-white text-sm font-semibold truncate">{telebirrName || '—'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/20 border border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-white/40 text-[11px] uppercase tracking-wide">Phone Number</p>
                  <p className="text-amber-400 text-base font-bold tracking-wide">{telebirrNumber}</p>
                </div>
                <button
                  type="button"
                  onClick={copyNumber}
                  className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs transition-colors active:scale-95"
                >
                  {copied ? <><CheckCircle2 size={13} className="text-emerald-400" /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-black/20 border border-white/10 px-4 py-3">
              <p className="text-amber-400/90 text-sm">{telebirrMissing ? 'Contact Admin to get payment details.' : 'Payment details are not configured yet.'}</p>
            </div>
          )}
        </GlassCard>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-center mb-4">
          <a
            href="https://t.me/Hidase_Investment_Admin"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:text-amber-400 transition-colors"
          >
            <MessageCircle size={18} className="text-amber-400" />
            Having payment issues? Contact Support
          </a>
        </div>

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 mb-4">
            <p className="text-emerald-400 text-sm">{success}</p>
          </div>
        )}

        {/* Form Section */}
        <div className="glass-card p-6">
          {settingsLoading ? (
            <div className="space-y-3">
              <SkeletonLoader className="h-16 w-full rounded-xl" />
              <SkeletonLoader className="h-16 w-full rounded-xl" />
              <SkeletonLoader className="h-12 w-full rounded-xl" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegistration ? (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={16} className="text-amber-400" />
                    <p className="text-amber-400 text-sm font-semibold">Registration Fee</p>
                  </div>
                  <p className="text-white text-2xl font-bold">{registrationFee.toFixed(2)} <span className="text-base text-amber-400">ETB</span></p>
                  <p className="text-white/50 text-xs mt-1">
                    One-time payment that activates your account and unlocks tasks.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-2.5">
                    <span className="text-white/50 text-sm">Current VIP</span>
                    <span className="text-white font-semibold text-sm">{profile?.vip_level || 'Basic'}</span>
                  </div>

                  <div>
                    <label className="text-white/50 text-sm block mb-1.5">Upgrade To *</label>
                    <select name="targetVip" value={form.targetVip} onChange={handleChange} className="glass-input">
                      <option value="">Select target VIP</option>
                      {availableVipLevels.map((vip) => (
                        <option key={vip} value={vip}>{vip}</option>
                      ))}
                    </select>
                    {availableVipLevels.length === 0 && (
                      <p className="text-amber-400/90 text-xs mt-1">You are at the highest VIP level. No further upgrades available.</p>
                    )}
                  </div>

                  {form.targetVip && (
                    <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                      <p className="text-white/50 text-xs">Upgrade Cost</p>
                      <p className="text-white text-lg font-bold">{getUpgradeCost(form.targetVip).toFixed(2)} <span className="text-sm text-amber-400">ETB</span></p>
                      <p className="text-white/40 text-xs mt-1">From {profile?.vip_level || 'Basic'} to {form.targetVip}</p>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="text-white/50 text-sm block mb-1.5">Payment Method</label>
                <div className="glass-input py-2 px-3 bg-white/5 text-white/70 flex items-center gap-2">
                  <Smartphone size={14} className="text-amber-400" /> Telebirr
                </div>
              </div>

              <p className="text-white/50 text-xs mt-2">Please provide at least one proof of payment (Reference or Screenshot).</p>

              <div>
                <label className="text-white/50 text-sm block mb-1.5">Transaction Reference *</label>
                <input
                  type="text"
                  name="paymentReference"
                  value={form.paymentReference}
                  onChange={handleChange}
                  className="glass-input"
                  placeholder="e.g. TB1234567890"
                />
              </div>

              <div>
                <label className="text-white/50 text-sm block mb-1.5">Payment Screenshot *</label>
                <input
                  type="file"
                  name="proofImage"
                  onChange={handleFileChange} // USES NEW HANDLER
                  className="glass-input"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                />
              </div>

              {isRegistration && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-2.5">
                  <Sparkles size={15} className="text-emerald-400 shrink-0" />
                  <p className="text-emerald-300/90 text-xs">Once approved, you can start watching tasks and earning.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setForm({ amount: '', transactionId: '', targetVip: '', paymentReference: '', proofImage: null, imageHash: '' });
                    setError('');
                    setSuccess('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
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
                  ) : 'Submit Payment'}
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