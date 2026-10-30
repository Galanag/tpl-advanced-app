import { useEffect, useState, useCallback, useRef } from 'react';
import { PlayCircle, Clock, X, Loader2, CheckCircle2, AlertTriangle, Lock, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { claimVideoReward, saveProgress } from '../utils/mlm';
import GlassCard from '../components/GlassCard';
import SkeletonLoader from '../components/SkeletonLoader';
import ReferralGate from '../components/ReferralGate';

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const VideoPlayerModal = ({ video, initialSeconds = 0, onClose, onClaimed, onQuotaReached }) => {
  const { user, refreshProfile } = useAuthStore();
  const total = video.duration_seconds || 30;
  const [timeLeft, setTimeLeft] = useState(Math.max(total - initialSeconds, 0));
  const [finished, setFinished] = useState(initialSeconds >= total);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [error, setError] = useState('');
  const [rewardAmount, setRewardAmount] = useState(0); // Will be fetched based on VIP level
  const intervalRef = useRef(null);
  const watchedRef = useRef(initialSeconds);

  // Fetch reward amount based on user's VIP level and settings
  useEffect(() => {
    if (!user) return;
    const fetchReward = async () => {
      try {
        const { data: settings } = await supabase.from('admin_settings').select('*');
        const settingsMap = {};
        (settings || []).forEach((s) => { settingsMap[s.key] = s.value; });
        let amount = 0;
        switch (user.profile?.vip_level) {
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
            amount = parseFloat(settingsMap.basic_reward_amount) || 10;
            break;
        }
        setRewardAmount(amount);
      } catch (err) {
        console.error('Failed to fetch reward amount:', err);
        // Fallback to video's reward amount
        setRewardAmount(parseFloat(video.reward_amount) || 0);
      }
    };
    fetchReward();
  }, [user]);

  useEffect(() => {
    if (finished) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setFinished(true);
          return 0;
        }
        watchedRef.current = total - (prev - 1);
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearInterval(intervalRef.current);
      if (!finished && watchedRef.current > 0 && watchedRef.current < total) {
        saveProgress(user.id, video.id, watchedRef.current);
      }
    };
  }, [video.id, finished]);

  useEffect(() => {
    if (finished || claimed) return;
    const saveInterval = setInterval(() => {
      if (watchedRef.current > 0 && watchedRef.current < total) {
        saveProgress(user.id, video.id, watchedRef.current);
      }
    }, 10000);
    return () => clearInterval(saveInterval);
  }, [video.id, finished, claimed]);

  const handleClose = () => {
    if (!finished && !claimed && watchedRef.current > 0 && watchedRef.current < total) {
      setShowCloseWarning(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    saveProgress(user.id, video.id, watchedRef.current);
    onClose();
  };

  const handleClaim = async () => {
    if (!finished || claiming) return;
    setClaiming(true);
    setError('');
    try {
      await claimVideoReward(user, video, total);
      await refreshProfile();
      setClaimed(true);
      onClaimed();
      const fresh = await supabase.from('profiles').select('daily_videos_watched, daily_quota_limit').eq('id', user.id).single();
      if (fresh.data && fresh.data.daily_videos_watched >= fresh.data.daily_quota_limit) {
        setTimeout(() => onQuotaReached(), 1500);
      }
    } catch (err) {
      setError(err.message || 'Failed to claim reward.');
    } finally {
      setClaiming(false);
    }
  };

  const progress = ((total - timeLeft) / total) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg overflow-hidden fade-in-up">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h3 className="text-white font-semibold text-sm">Watch &amp; Earn</h3>
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-white/10 text-white/60 transition-colors active:scale-95">
            <X size={18} />
          </button>
        </div>
        <div className="relative aspect-video bg-black">
          {video.video_url ? (
            <YouTubeEmbed url={video.video_url} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <PlayCircle size={56} className="text-white/30" />
              <p className="text-white/40 text-sm">Video playback</p>
              <p className="text-white/20 text-xs">Timer running...</p>
            </div>
          )}
        </div>
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-white/60 flex items-center gap-1.5">
              <Clock size={14} />{finished ? 'Completed!' : `${formatTime(timeLeft)} remaining`}
            </span>
            <span className="text-amber-400 font-semibold">+{rewardAmount} ETB</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-1000 ease-linear"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        <div className="p-5">
          <p className="text-white/50 text-sm mb-3 truncate">{video.title}</p>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button
            onClick={handleClaim}
            disabled={!finished || claiming || claimed}
            className={`btn-primary flex items-center justify-center gap-2 ${claimed ? '!bg-emerald-500/20 !text-emerald-400 !border !border-emerald-500/30' : ''}`}
          >
            {claimed ? (<><CheckCircle2 size={18} />Reward Claimed!</>) : claiming ? (<><Loader2 size={18} className="animate-spin" />Verifying...</>) : finished ? ('Claim Reward') : (`Wait ${formatTime(timeLeft)} to claim`)}
          </button>
        </div>
      </div>
      {showCloseWarning && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80">
          <GlassCard className="w-full max-w-sm p-6 text-center fade-in-up">
            <AlertTriangle size={48} className="text-amber-400 mx-auto mb-3" />
            <h4 className="text-white font-bold text-lg mb-2">Video Not Finished!</h4>
            <p className="text-white/50 text-sm mb-5">
              You must finish the video to earn the reward. Your progress will be saved and you can resume later.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCloseWarning(false)} className="btn-primary flex-1">Keep Watching</button>
              <button onClick={confirmClose} className="btn-secondary flex-1">Save &amp; Exit</button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

const Tasks = () => {
  const { user, profile, refreshProfile } = useAuthStore();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedResume, setSelectedResume] = useState(0);
  const [watchedIds, setWatchedIds] = useState(new Set());
  const [progressMap, setProgressMap] = useState({});
  const [showReferralGate, setShowReferralGate] = useState(false);

  // Fetch VIP level and settings for reward display and quota
  const [userVipLevel, setUserVipLevel] = useState(profile?.vip_level || 'Basic');
  const [userRewardAmount, setUserRewardAmount] = useState(0);
  const [quotaLimit, setQuotaLimit] = useState(profile?.daily_quota_limit || 10);
  const [watchedToday, setWatchedToday] = useState(profile?.daily_videos_watched || 0);
   const [quotaReached, setQuotaReached] = useState(watchedToday >= quotaLimit);
   const quotaReachedLocal = quotaReached;
  const [accountActive, setAccountActive] = useState(profile?.account_status === 'active');

  // Modals for feedback
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showWatchedModal, setShowWatchedModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);

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
              amount = parseFloat(settingsMap.basic_reward_amount) || 10;
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
       console.log('[Tasks] Videos fetched:', data);
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

  const handleVideoClick = (video) => {
    const prog = progressMap[video.id];
    const resume = prog && prog.status === 'in_progress' ? prog.watched_seconds : 0;
    setSelected(video);
    setSelectedResume(resume);
  };

  const handleClaimed = useCallback(() => {
    if (selected) setWatchedIds((prev) => new Set([...prev, selected.id]));
  }, [selected]);

  return (
    <div className="fade-in-up space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Tasks</h2>
        <p className="text-white/50 text-sm mt-0.5">Watch videos to earn rewards</p>
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

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonLoader key={i} className="h-56 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => {
            const isWatched = watchedIds.has(video.id);
             const quotaReachedLocal = quotaReached;
            const isAccountInactive = !accountActive;
             const disabled = isWatched || quotaReachedLocal || isAccountInactive;
            return (
              <GlassCard
                key={video.id}
                onClick={() => {
                  if (isAccountInactive) {
                    setShowPendingModal(true);
                  } else if (isWatched) {
                    setShowWatchedModal(true);
                  } else if (quotaReachedLocal) {
                    setShowQuotaModal(true);
                  } else {
                    handleVideoClick(video);
                  }
                }}
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
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500/90 text-slate-900 text-xs font-bold">Resume</div>
                  )}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-900 text-xs font-bold">
                    +{userRewardAmount} ETB
                  </div>
                </div>
                <h4 className="text-white/90 text-sm font-semibold line-clamp-2">{video.title}</h4>
                <p className="text-white/40 text-xs mt-1">
                  {isWatched ? 'Reward claimed' : isWatched && !isAccountInactive && !quotaReachedLocal ? 'Tap to resume watching' : !isWatched && !isAccountInactive && !quotaReachedLocal ? 'Tap to start watching' : ''}
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

      {selected && (
        <VideoPlayerModal
          video={selected}
          initialSeconds={selectedResume}
          onClose={() => { setSelected(null); fetchVideos(); }}
          onClaimed={handleClaimed}
          onQuotaReached={() => setShowReferralGate(true)}
        />
      )}

      {showReferralGate && (
        <ReferralGate
          activeCount={profile?.team_size || 0}
          onClose={() => setShowReferralGate(false)}
        />
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
              <h3 className="text-white font-bold text-lg mb-2">Video Already Watched</h3>
              <p className="text-white/50 text-sm mb-5">
                You have already claimed the reward for this video.
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