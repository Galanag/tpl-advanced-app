import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Header = () => {
  const location = useLocation();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  useEffect(() => {
    refreshProfile();
  }, [location.pathname, refreshProfile]);

  return (
    <header className="glass sticky top-0 z-50 px-4 py-3 border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="HIDASE Logo" className="h-10 w-auto" />
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">HIDASE</h1>
            <p className="text-[10px] text-white/50 -mt-0.5">Investment Group</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {profile && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-white/50 uppercase tracking-wide">Balance</p>
              <p className="text-sm font-semibold text-amber-400">
                {(parseFloat(profile.balance) || 0).toFixed(2)} ETB
              </p>
            </div>
          )}
          <Link
            to="/profile"
            className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors active:scale-95"
          >
            <User size={16} className="text-amber-400" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;