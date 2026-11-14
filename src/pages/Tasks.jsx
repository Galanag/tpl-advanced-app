import { useEffect, useState, useCallback, useRef } from 'react';
import { PlayCircle, Clock, X, Loader2, CheckCircle2, AlertTriangle, Lock, BarChart3, ExternalLink, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { claimVideoReward, saveProgress } from '../utils/mlm';
import GlassCard from '../components/GlassCard';
import SkeletonLoader from '../components/SkeletonLoader';

const Tasks = () => {
  const { user, profile, refreshProfile } = useAuthStore();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watchedIds, setWatchedIds] = useState(new Set());
  const [progressMap, setProgressMap] = useState({});

  // Fetch VIP level and settings for reward display and quota
  const [userVipLevel, setUserVipLevel] = useState(profile?.vip_level || 'Basic');
  const [userRewardAmount, setUserRewardAmount] = useState(0);
  const [quotaLimit, setQuotaLimit] = useState(profile?.daily_quota_limit || 10);
  const [watchedToday, setWatchedToday] = useState(profile?.daily_videos_watched || 0);
  // Derived reactively so the quota banner updates after data is fetched
  const quotaReached = watchedToday >= quotaLimit;
  const quotaReachedLocal = quotaReached;
  const [accountActive, setAccountActive] = useState(profile?.account_status === 'active');

  // Modals for feedback
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showWatchedModal, setShowWatchedModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  // Auto-award state: the task currently "watched" in an external tab
  const [pendingWatch, setPendingWatch] = useState(null);
  const [awarding, setAwarding] = useState(false);
  const [completion, setCompletion] = useState(null); // { title, reward }
  const [taskError, setTaskError] = useState('');

  const pendingWatchRef = useRef(null);
  const awardingRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      try {
        const { data: profileData } = await supabase.from('profiles').select('vip_level, daily_quota_limit, daily_videos_watched, account_status').eq('id', user.id).single();
        if (profileData) {
          setUserVipLevel(profileData.vip_level || 'Basic');
          setQuotaLimit(profileData.daily_quota_limit || 10);
          setWatchedToday(profileData.daily_videos_watched || 0);
          setAccountActive(profileData.account_status === 'active');

          // Fetch reward amount based on VIP level
          const { data: settings } = await supabase.from('admin_settings').select('*');
          const settingsMap = {};
          (settings || []).forEach((s) => { settingsMap[s.key] = s.value; });
          let amount = 0;
          switch (profileData.vip_level) {
            case 'VIP1':
              amount = parseFloat(settingsMap.vip1_reward_amount) || 15;
              break;
            case 'VIP2':
              amount = parseFloat(settingsMap.vip2_reward_amount) || 20;
              break;
            case 'VIP3':
              amount = parseFloat(settingsMap.vip3_reward_amount) || 25;
              break;
            case 'Basic':
            default:
              amount = parseFloat(settingsMap.basic_reward_amount) || 600;
              break;
          }
          setUserRewardAmount(amount);
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      }
    };
    fetchUserData();
  }, [user]);

  useEffect(() => { fetchVideos(); }, []);

  const fetchVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('[Tasks] Error fetching videos:', error);
      setVideos([]);
    } else {
      setVideos(data || []);
      if (user?.id && data?.length) {
        const { data: progressData, error: progressError } = await supabase.from('user_progress').select('video_id, status, watched_seconds').eq('user_id', user.id);
        if (progressError) {
          console.error('[Tasks] Error fetching user progress:', progressError);
        } else {
          const map = {};
          const completed = new Set();
          (progressData || []).forEach((p) => {
            map[p.video_id] = p;
            if (p.status === 'completed') completed.add(p.video_id);
          });
          setProgressMap(map);
          setWatchedIds(completed);
        }
      }
    }
    setLoading(false);
  };

  const awardTask = useCallback(async (video) => {
    if (awardingRef.current || !user || !video) return;
    awardingRef.current = true;
    setAwarding(true);
    setTaskError('');
    try {
      // Treat the task as fully watched when the user returns from the external tab.
      const reward = await claimVideoReward(user, video, parseInt(video.duration_seconds) || 30);
      await refreshProfile();

      setWatchedIds((prev) => new Set([...prev, video.id]));
      setCompletion({ title: video.title, reward });
      setPendingWatch(null);
      pendingWatchRef.current = null;

      // Refresh quota / watched counters from the server
      const { data: fresh } = await supabase.from('profiles').select('daily_videos_watched, daily_quota_limit').eq('id', user.id).single();
      if (fresh) {
        setWatchedToday(fresh.daily_videos_watched || 0);
        setQuotaLimit(fresh.daily_quota_limit || 10);
      }
    } catch (err) {
      setTaskError(err.message || 'Failed to award reward.');
    } finally {
      awardingRef.current = false;
      setAwarding(false);
    }
  }, [user, refreshProfile]);

  // When the user returns to the app (focus), auto-award the task opened in a new tab.
  useEffect(() => {
    const handleFocus = () => {
      const video = pendingWatchRef.current;
      if (!video || awardingRef.current) return;
      awardTask(video);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [awardTask]);

  const startWatch = (video) => {
    setTaskError('');

    if (!video.youtube_url) {
      setTaskError('This task has no video link yet. Please check back soon.');
      return;
    }

    // IMPORTANT: open the popup synchronously as the very first action of the
    // user click. Browsers block popups that are not triggered synchronously,
    // so any async Supabase call must come AFTER window.open.
    const win = window.open(video.youtube_url, '_blank', 'noopener,noreferrer');
    if (!win) {
      setTaskError('Popup blocked. Please allow pop-ups for this site to watch this task.');
      return;
    }

    // Mark progress so the server knows the task was started (async, after popup)
    if (user?.id) saveProgress(user.id, video.id, 0);

    pendingWatchRef.current = video;
    setPendingWatch(video);
  };

  const handleVideoClick = (video) => {
    if (!accountActive) {
      setShowPendingModal(true);
    } else if (watchedIds.has(video.id)) {
      setShowWatchedModal(true);
    } else if (quotaReached) {
      setShowQuotaModal(true);
    } else {
      startWatch(video);
    }
  };

  return (
    <div className="fade-in-up space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Tasks</h2>
        <p className="text-white/50 text-sm mt-0.5">Watch videos to earn rewards</p>
      </div>

      {/* Pop-up notice */}
      <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 flex items-center gap-3">
        <ExternalLink size={18} className="text-sky-400 shrink-0" />
        <p className="text-white/80 text-sm">
          Please allow pop-ups for this site so you can watch videos. Each task opens in a new tab.
        </p>
      </div>

      {!accountActive && (
        <GlassCard className="border-amber-500/30">
          <div className="flex items-center gap-3">
            <Lock size={24} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-white font-semibold">Account Pending Activation</p>
              <p className="text-white/50 text-sm">Pay the registration fee to activate your account and start earning.</p>
            </div>
          </div>
        </GlassCard>
      )}

      {accountActive && (
        <GlassCard>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm flex items-center gap-1.5">
              <BarChart3 size={14} className="text-amber-400" /> Daily Quota
            </span>
            <span className={`text-sm font-semibold ${quotaReached ? 'text-red-400' : 'text-amber-400'}`}>
              {watchedToday}/{quotaLimit} videos watched ({userVipLevel})
            </span>
          </div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${quotaReached ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-amber-500 to-amber-600'}`}
              style={{ width: `${Math.min((watchedToday / quotaLimit) * 100, 100)}%` }}
            />
          </div>
          {quotaReached && <p className="text-red-400/80 text-xs mt-2">Daily quota reached. Please come back tomorrow.</p>}
        </GlassCard>
      )}

      {/* Watching in another tab indicator */}
      {pendingWatch && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 flex items-center gap-3">
          {awarding ? <Loader2 size={18} className="text-sky-400 animate-spin shrink-0" /> : <ExternalLink size={18} className="text-sky-400 shrink-0" />}
          <div className="min-w-0">
            <p className="text-white/90 text-sm font-medium">
              {awarding ? 'Awarding your reward…' : 'Watching in another tab'}
            </p>
            <p className="text-white/50 text-xs truncate">
              {awarding ? 'Hold on, crediting your balance.' : 'Return to this tab after watching to claim your reward automatically.'}
            </p>
          </div>
        </div>
      )}

      {taskError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-red-400 text-sm">{taskError}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonLoader key={i} className="h-56 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => {
            const isWatched = watchedIds.has(video.id);
            const isAccountInactive = !accountActive;
            const disabled = isWatched || quotaReached || isAccountInactive;
            return (
              <GlassCard
                key={video.id}
                onClick={() => handleVideoClick(video)}
                className={disabled ? 'opacity-50' : ''}
              >
                <div className="relative h-36 rounded-xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 mb-3 flex items-center justify-center">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <PlayCircle size={40} className="text-white/30" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {isWatched ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <CheckCircle2 size={40} className="text-emerald-400" />
                    </div>
                  ) : (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white/80 text-xs flex items-center gap-1">
                      <Clock size={10} /> {video.duration_seconds}s
                    </div>
                  )}
                  {isWatched && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-xs font-bold">Done</div>
                  )}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-900 text-xs font-bold">
                    +{userRewardAmount} ETB
                  </div>
                </div>
                <h4 className="text-white/90 text-sm font-semibold line-clamp-2">{video.title}</h4>
                <p className="text-white/40 text-xs mt-1 flex items-center gap-1">
                  {isWatched ? 'Reward claimed' : !isAccountInactive && !quotaReachedLocal ? (<><ExternalLink size={11} /> Tap to watch &amp; earn</>) : ''}
                </p>
              </GlassCard>
            );
          })}
          {videos.length === 0 && (
            <div className="col-span-full text-center py-16">
              <PlayCircle size={48} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No tasks available yet. Check back soon!</p>
            </div>
          )}
        </div>
      )}

      {/* Task Completed Modal */}
      {completion && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 text-center fade-in-up">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-emerald-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Task Completed!</h3>
            <p className="text-white/60 text-sm mb-2 truncate">{completion.title}</p>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 mb-5">
              <Sparkles size={16} className="text-emerald-400" />
              <span className="text-emerald-300 font-bold">+{completion.reward} ETB</span>
            </div>
            <p className="text-white/40 text-xs mb-5">Your balance has been updated.</p>
            <button onClick={() => setCompletion(null)} className="btn-primary w-full">
              Awesome
            </button>
          </GlassCard>
        </div>
      )}

      {/* Pending Account Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 fade-in-up">
            <button onClick={() => setShowPendingModal(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-white/50 transition-colors active:scale-95">
              <X size={18} />
            </button>
            <div className="text-center mb-6">
              <h3 className="text-white font-bold text-lg mb-2">Account Not Active</h3>
              <p className="text-white/50 text-sm mb-5">
                Please pay the registration fee and wait for admin approval to start earning.
              </p>
              <div className="flex justify-center">
                <button onClick={() => setShowPendingModal(false)} className="btn-secondary">
                  OK
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Already Watched Modal */}
      {showWatchedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 fade-in-up">
            <button onClick={() => setShowWatchedModal(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-white/50 transition-colors active:scale-95">
              <X size={18} />
            </button>
            <div className="text-center mb-6">
              <h3 className="text-white font-bold text-lg mb-2">Task Already Completed</h3>
              <p className="text-white/50 text-sm mb-5">
                You have already claimed the reward for this task.
              </p>
              <div className="flex justify-center">
                <button onClick={() => setShowWatchedModal(false)} className="btn-secondary">
                  OK
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Quota Reached Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 fade-in-up">
            <button onClick={() => setShowQuotaModal(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-white/50 transition-colors active:scale-95">
              <X size={18} />
            </button>
            <div className="text-center mb-6">
              <h3 className="text-white font-bold text-lg mb-2">Daily Quota Reached</h3>
              <p className="text-white/50 text-sm mb-5">
                You have reached your daily quota. Please come back tomorrow to earn more.
              </p>
              <div className="flex justify-center">
                <button onClick={() => setShowQuotaModal(false)} className="btn-secondary">
                  OK
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default Tasks;