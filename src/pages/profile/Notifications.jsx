import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/GlassCard';
import SkeletonLoader from '../../components/SkeletonLoader';
import { ArrowLeft, Bell, CheckCircle2 } from 'lucide-react';

const Notifications = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      // 1. Fetch all notifications for this user
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(data);
      }
      setLoading(false);

      // 2. Mark all as read when the user opens the page
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    };

    fetchNotifications();
  }, [user?.id]);

  return (
    <div className="fade-in-up space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10 text-white/60 transition-colors active:scale-95">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Notifications</h2>
          <p className="text-white/50 text-sm mt-0.5">Updates on your deposits and withdrawals</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <SkeletonLoader key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Bell size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No notifications yet.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <GlassCard key={notif.id} className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/90 font-semibold text-sm">{notif.title}</p>
                <p className="text-white/70 text-sm mt-1">{notif.message}</p>
                <p className="text-white/40 text-xs mt-2">{new Date(notif.created_at).toLocaleString()}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;