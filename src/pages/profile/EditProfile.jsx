import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { User, Phone, Loader2, CheckCircle2 } from 'lucide-react';

const EditProfile = () => {
  const { user, profile, refreshProfile } = useAuthStore();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone: phone })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update the auth store
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigate('/profile');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in-up space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Edit Profile</h2>
        <button
          onClick={() => navigate('/profile')}
          className="text-sm text-white/60 hover:text-white"
        >
          Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="glass-input pl-10"
            autoComplete="name"
            required
          />
        </div>

        <div className="relative">
          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
            <p className="text-emerald-400 text-sm">Profile updated successfully!</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Updating...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </form>
    </div>
  );
};

export default EditProfile;