import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, MessageCircle, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';

const Header = () => {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    
    // Fetch unread notifications count
    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);
      
      setUnreadCount(count || 0);
    };
    
    fetchUnreadCount();
    
    // Optional: Poll every 60 seconds for new notifications
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="HIDASE Logo" className="h-8 w-auto" />
          <div className="hidden sm:block">
            <h1 className="text-white font-bold text-lg leading-tight">HIDASE</h1>
            <p className="text-[10px] text-white/50">Investment Group</p>
          </div>
        </Link>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          
          {/* Telegram Support Link */}
          <a 
            href="https://t.me/Hidase_Investment_Admin" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors text-sm"
          >
            <MessageCircle size={16} className="text-amber-400" />
            Support
          </a>

          {/* Notification Bell */}
          <button 
            onClick={() => navigate('/profile/notifications')}
            className="relative p-2 rounded-full hover:bg-white/10 text-white/60 transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
            )}
          </button>

          {/* Profile Link */}
          <Link to="/profile" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <User size={16} className="text-slate-900" />
            </div>
            <span className="hidden md:block text-white font-semibold text-sm">
              {(parseFloat(profile?.balance) || 0).toFixed(2)} ETB
            </span>
          </Link>

        </div>
      </div>
    </header>
  );
};

export default Header;