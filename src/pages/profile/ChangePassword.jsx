import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const ChangePassword = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      // First, verify the current password by attempting to sign in with it
      const email = user?.email; // We don't have email in auth store, but we can get from user?
      // Actually, we don't have email in the auth store. We need to get it from the profile? 
      // The user object from supabase.auth.getSession() has email. But we don't store it in zustand.
      // Let's adjust: we'll fetch the user from supabase again? Or we can update the auth store to include email.
      // For now, we'll use the email from the user object that we get from supabase.auth.getSession().
      // But we don't have it in the zustand store. We'll change the auth store to include email? 
      // Alternatively, we can use the updateUser method which doesn't require current password? 
      // Actually, supabase.auth.updateUser only requires the new password and the user must be logged in.
      // However, for security, we should verify the current password. We can do so by signing in with the current password and then updating.
      // But we don't have the email. Let's get the user from supabase.auth.getSession() again.

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData?.session?.user?.email) {
        throw new Error('Unable to retrieve user email');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: sessionData.session.user.email,
        password: currentPassword,
      });
      if (signInError) throw signInError;

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigate('/profile');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in-up space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Change Password</h2>
        <button
          onClick={() => navigate('/profile')}
          className="text-sm text-white/60 hover:text-white"
        >
          Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type={showCurrent ? 'text' : 'password'}
            name="currentPassword"
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="glass-input pl-10 pr-10"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
          >
            {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type={showNew ? 'text' : 'password'}
            name="newPassword"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="glass-input pl-10 pr-10"
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
          >
            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type={showConfirm ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="glass-input pl-10 pr-10"
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
            <p className="text-emerald-400 text-sm">Password changed successfully!</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Changing...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;