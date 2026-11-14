import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Video, Users, Settings, ArrowLeft, CreditCard, Banknote } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdminStore } from '../../store/adminStore';
import AdminVideos from './AdminVideos';
import AdminUsers from './AdminUsers';
import AdminSettings from './AdminSettings';
import AdminPayments from './AdminPayments';
import AdminWithdrawals from './AdminWithdrawals';
import GlassCard from '../../components/GlassCard';

const TABS = [
  { id: 'videos', label: 'Video Management', icon: Video },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'withdrawals', label: 'Withdrawals', icon: Banknote },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('videos');
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const { fetchSettings, fetchVideos, fetchUsers } = useAdminStore();

  useEffect(() => {
    fetchSettings();
    fetchVideos();
    fetchUsers();
    fetchActiveUsersCount();
    fetchPendingWithdrawalsCount();
  }, [fetchSettings, fetchVideos, fetchUsers]);

  const fetchActiveUsersCount = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('account_status', 'active');
      if (error) throw error;
      setActiveUsersCount(count || 0);
    } catch (err) {
      console.error('Error fetching active users count:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchPendingWithdrawalsCount = async () => {
    try {
      const { data, error, count } = await supabase
        .from('withdrawals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      setPendingWithdrawalsCount(count || 0);
    } catch (err) {
      console.error('Error fetching pending withdrawals count:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Admin Header */}
      <header className="glass sticky top-0 z-50 px-4 py-3 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-full hover:bg-white/10 text-white/60 transition-colors active:scale-95">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <LayoutDashboard size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">Admin Panel</h1>
                <p className="text-[10px] text-white/40">HIDASE Investment Group</p>
              </div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold">
            Admin
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
          <GlassCard className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Users size={24} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-white/50 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-white">{loadingStats ? '—' : activeUsersCount}</p>
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Banknote size={24} className="text-amber-400" />
            </div>
            <div>
              <p className="text-white/50 text-sm">Pending Withdrawals</p>
              <p className="text-2xl font-bold text-white">{loadingStats ? '—' : pendingWithdrawalsCount}</p>
            </div>
          </GlassCard>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 active:scale-95 ${
                activeTab === id
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-lg shadow-amber-500/20'
                  : 'glass text-white/60 hover:text-white hover:bg-white/15'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

         {/* Tab Content */}
         <div className="fade-in-up">
           {activeTab === 'videos' && <AdminVideos />}
           {activeTab === 'users' && <AdminUsers />}
           {activeTab === 'settings' && <AdminSettings />}
           {activeTab === 'payments' && <AdminPayments />}
           {activeTab === 'withdrawals' && <AdminWithdrawals />}
         </div>
      </div>
    </div>
  );
};

export default AdminDashboard;