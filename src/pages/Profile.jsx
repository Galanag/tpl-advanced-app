import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { User, Phone, Award, Edit3, Lock, Bell, LogOut, ChevronRight, Shield, Banknote } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import GlassCard from '../components/GlassCard';

const Profile = () => {
  const { profile, user, signOut, refreshProfile } = useAuthStore();
  const navigate = useNavigate();
  const [refreshStatus, setRefreshStatus] = useState(''); // 'loading', 'success', 'error'

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleRefreshProfile = async () => {
    setRefreshStatus('loading');
    try {
      await refreshProfile();
      setRefreshStatus('success');
      setTimeout(() => setRefreshStatus(''), 2000);
    } catch (err) {
      console.error('Failed to refresh profile:', err);
      setRefreshStatus('error');
      setTimeout(() => setRefreshStatus(''), 2000);
    }
  };

    const settings = [
      { label: 'Edit Profile', icon: Edit3 },
      { label: 'Change Password', icon: Lock },
      { label: 'Notifications', icon: Bell },
      { label: 'Privacy & Security', icon: Shield },
      { label: 'Payment Methods', icon: Banknote },
    ];

  return (
    <div className="fade-in-up space-y-6">
      {/* Profile Card */}
      <GlassCard className="relative overflow-hidden text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="relative pt-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/20 border-4 border-slate-900">
            <User size={32} className="text-slate-900" />
          </div>

          <h2 className="text-white font-bold text-xl mt-3">
            {profile?.full_name || 'HIDASE User'}
          </h2>

          <div className="flex items-center justify-center gap-2 text-white/50 text-sm mt-1">
            <Phone size={14} />
            <span>{profile?.phone || 'No phone'}</span>
          </div>

          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 text-amber-400 text-sm font-semibold">
              <Award size={14} />
              {profile?.level || 'Intern'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6 text-left">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white/40 text-xs">Balance</p>
              <p className="text-white font-bold text-lg">
                {(parseFloat(profile?.balance) || 0).toFixed(2)} ETB
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white/40 text-xs">Team Size</p>
              <p className="text-white font-bold text-lg">{profile?.team_size || 0}</p>
            </div>
          </div>

          {refreshStatus === 'loading' && (
            <p className="text-white/50 text-xs mt-2">Refreshing profile...</p>
          )}
          {refreshStatus === 'success' && (
            <p className="text-emerald-400 text-xs mt-2">Profile refreshed!</p>
          )}
          {refreshStatus === 'error' && (
            <p className="text-red-400 text-xs mt-2">Failed to refresh profile</p>
          )}

          <button
            onClick={handleRefreshProfile}
            disabled={refreshStatus === 'loading'}
            className="btn-secondary w-full mt-4"
          >
            {refreshStatus === 'loading' ? 'Refreshing...' : 'Refresh Profile'}
          </button>
        </div>
      </GlassCard>

      {/* Settings */}
      <div>
        <h3 className="text-white font-semibold mb-3">Settings</h3>
        <GlassCard className="divide-y divide-white/10 p-0">
              {settings.map(({ label, icon: Icon }) => (
                <Link
                  to={label.toLowerCase().includes('edit') 
                    ? '/profile/edit' 
                    : label.toLowerCase().includes('password') 
                    ? '/profile/password' 
                    : label.toLowerCase().includes('notifications') 
                    ? '/profile/notifications' 
                    : label.toLowerCase().includes('privacy') 
                    ? '/profile/privacy' 
                    : label.toLowerCase().includes('payment methods') 
                    ? '/profile/payment-methods' 
                    : '/profile'}
                  key={label}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/5 transition-colors active:scale-[0.99]"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <Icon size={16} className="text-amber-400" />
                  </div>
                  <span className="text-white/80 text-sm font-medium flex-1 text-left">{label}</span>
                  <ChevronRight size={16} className="text-white/30" />
                </Link>
              ))}
        </GlassCard>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95 hover:shadow-xl hover:shadow-amber-500/30"
      >
        <LogOut size={18} />
        Logout
      </button>

      <p className="text-center text-white/20 text-xs pb-2">
        HIDASE Investment Group v1.0
      </p>
    </div>
  );
};

export default Profile;
