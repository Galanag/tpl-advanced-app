import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, ArrowDownToLine, Users, BarChart3, PlayCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import GlassCard from '../components/GlassCard';
import SkeletonLoader from '../components/SkeletonLoader';

const Home = () => {
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6);
    setVideos(data || []);
    setLoading(false);
  };

  const balance = parseFloat(profile?.balance) || 0;
  const level = profile?.level || 'Intern';
  const teamSize = profile?.team_size || 0;

  const quickActions = [
    { label: 'Withdraw', icon: Wallet, path: '/wallet', color: 'from-amber-500 to-amber-600' },
    { label: 'Deposit', icon: ArrowDownToLine, path: '/wallet', color: 'from-emerald-500 to-emerald-600' },
    { label: 'Invite', icon: Users, path: '/team', color: 'from-sky-500 to-sky-600' },
    { label: 'Stats', icon: BarChart3, path: '/profile', color: 'from-purple-500 to-purple-600' },
  ];


  return (
    <div className="fade-in-up space-y-6">
      {/* Balance Card */}
      <GlassCard className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
        <div className="relative">
          <p className="text-white/50 text-sm">Total Balance</p>
          <h2 className="text-4xl font-bold text-white mt-1">
            {balance.toFixed(2)}{' '}
            <span className="text-lg text-amber-400">ETB</span>
          </h2>
          <div className="flex items-center gap-4 mt-4">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/30">
              {level}
            </span>
            <span className="text-white/40 text-sm">
              Team: {teamSize} member{teamSize !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map(({ label, icon: Icon, path, color }) => (
          <Link
            key={label}
            to={path}
            className="glass-card p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-all duration-200 active:scale-95"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
              <Icon size={20} className="text-white" />
            </div>
            <span className="text-white/70 text-sm font-medium">{label}</span>
          </Link>
        ))}
      </div>

      {/* Featured Videos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Featured Videos</h3>
          <Link to="/tasks" className="text-amber-400 text-sm flex items-center gap-1 hover:text-amber-300">
            See all <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="shrink-0 w-48">
                <SkeletonLoader className="h-28 w-full rounded-xl mb-2" />
                <SkeletonLoader className="h-4 w-3/4 mb-1" />
                <SkeletonLoader className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => navigate('/tasks')}
                className="shrink-0 w-48 glass-card overflow-hidden text-left active:scale-95 transition-transform"
              >
                <div className="relative h-28 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <PlayCircle size={32} className="text-white/40" />
                  )}
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-amber-400 text-xs font-semibold">
                    +{parseFloat(video.reward_amount) || 0} ETB
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-white/90 text-sm font-medium line-clamp-2">{video.title}</p>
                  <p className="text-white/40 text-xs mt-1">{video.duration_seconds}s</p>
                </div>
              </button>
            ))}
            {videos.length === 0 && (
              <p className="text-white/40 text-sm">No videos available yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Recommended */}
      <div>
        <h3 className="text-white font-semibold mb-3">Recommended For You</h3>
        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <SkeletonLoader key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {videos.slice(0, 4).map((video) => (
              <button
                key={`rec-${video.id}`}
                onClick={() => navigate('/tasks')}
                className="w-full glass-card p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shrink-0">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <PlayCircle size={24} className="text-white/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm font-medium truncate">{video.title}</p>
                  <p className="text-amber-400 text-xs font-semibold mt-0.5">
                    +{parseFloat(video.reward_amount) || 0} ETB · {video.duration_seconds}s
                  </p>
                </div>
                <ChevronRight size={16} className="text-white/30 shrink-0" />
              </button>
            ))}
            {videos.length === 0 && (
              <p className="text-white/40 text-sm">Videos will appear here once available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
