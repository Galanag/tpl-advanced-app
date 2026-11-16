import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, X, Loader2, CheckCircle2, AlertTriangle, Lock, BarChart3, Pause, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { claimVideoReward, saveProgress } from '../utils/mlm';
import GlassCard from '../components/GlassCard';
import SkeletonLoader from '../components/SkeletonLoader';

const extractYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match ? match[1] : null;
};

const Tasks = () => {
  const { user, profile, refreshProfile } = useAuthStore();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watchedIds, setWatchedIds] = useState(new Set());
  const [progressMap, setProgressMap] = useState({});

  // Fetch VIP level and settings for reward display and quota
    const [userVipLevel, setUserVipLevel] = useState(profile?.vip_level || 'Basic');
  const VIP_LEVELS = ['Basic', 'VIP1', 'VIP2', 'VIP3', 'VIP4', 'VIP5'];
  const userVipIndex = VIP_LEVELS.indexOf(profile?.vip_level || 'Basic');
  const [userRewardAmount, setUserRewardAmount] = useState(0);
  const [quotaLimit, setQuotaLimit] = useState(profile?.daily_quota_limit || 10);
  const [watchedToday, setWatchedToday] = useState(profile?.daily_videos_watched || 0);
  const quotaReached = watchedToday >= quotaLimit;
  const [accountActive, setAccountActive] = useState(profile?.account_status === 'active');

  // Modals for feedback
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showWatchedModal, setShowWatchedModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [lastReward, setLastReward] = useState(0);

  // Pending account info (registration fee + Telebirr payment details)
  const [registrationFee, setRegistrationFee] = useState(0);
  const [telebirrName, setTelebirrName] = useState('');
  const [telebirrNumber, setTelebirrNumber] = useState('');

  // Video player modal state
  const [activeVideo, setActiveVideo] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [playerError, setPlayerError] = useState('');
  const timerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      try {
        const { data: profileData } = await supabase.from('profiles').select('vip_level, daily_quota_limit, daily_videos_watched, account_status').eq('id', user.id).single();
        if (profileData) {
          setUserVipLevel(profileData.vip_level || 'Basic');
          setQuotaLimit(profileData.daily_quota_limit || 10);

  // Fallback: calculate quota based on vip_level if profile data is missing
  const vipFallbackQuota = {
    'Basic': 5,
    'VIP1': 10,
    'VIP2': 15,
    'VIP3': 20,
    'VIP4': 25,
  }[profileData.vip_level] || 5;
  if (profileData.daily_quota_limit <= 0) {
    setQuotaLimit(vipFallbackQuota);
  }
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

  useEffect(() => { fetchVideos(); }, [user]);

  // Fetch registration fee + Telebirr payment details from admin_settings
  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('admin_settings').select('key, value');
        if (data) {
          const map = {};
          data.forEach((s) => { map[s.key] = s.value; });
          setRegistrationFee(parseFloat(map.registration_fee) || 500);
          setTelebirrName(map.telebirr_name || '');
          setTelebirrNumber(map.telebirr_number || '');
        }
      } catch (err) {
        console.error('Failed to fetch admin settings:', err);
      }
    };
    fetchSettings();
  }, [user]);

  const fetchVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
    const visibleVideos = data?.filter(v => {
      const videoVipIndex = VIP_LEVELS.indexOf(v.min_vip_level || 'Basic');
      return videoVipIndex <= userVipIndex;
    }) || [];
    setVideos(visibleVideos);
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

  // Start watching a video - open the modal and mark in_progress
  const startWatch = useCallback((video) => {
    setPlayerError('');
    if (!video.youtube_url) {
      setPlayerError('This task has no video link yet. Please check back soon.');
      return;
    }
    // Mark progress so the server knows the task was started
    if (user?.id) saveProgress(user.id, video.id, 0);
    
    // Open modal - this will trigger the timer
    setActiveVideo(video);
    setTimeLeft(video.duration_seconds || 30);
    setTimerRunning(true);
  }, [user]);

  // Handle video click with guards
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

  // Timer effect
  useEffect(() => {
    if (!timerRunning || timeLeft <= 0) {
      if (timeLeft <= 0 && timerRunning) {
        setTimerRunning(false);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timerRunning, timeLeft]);

  // Claim reward when timer is done
  const handleClaim = useCallback(async () => {
    if (!activeVideo || claiming || timeLeft > 0) return;
    setClaiming(true);
    setPlayerError('');
    try {
      const reward = await claimVideoReward(user, activeVideo, activeVideo.duration_seconds || 30);
      await refreshProfile();

      setWatchedIds((prev) => new Set([...prev, activeVideo.id]));
      
      // Refresh quota / watched counters from the server
      const { data: fresh } = await supabase.from('profiles').select('daily_videos_watched, daily_quota_limit').eq('id', user.id).single();
      if (fresh) {
        setWatchedToday(fresh.daily_videos_watched || 0);
        setQuotaLimit(fresh.daily_quota_limit || 10);
      }

      // Close modal and show completion
      setActiveVideo(null);
      setTimeLeft(0);
      setTimerRunning(false);

      setShowCompletionModal(true);
      setLastReward(userRewardAmount);
    } catch (err) {
      setPlayerError(err.message || 'Failed to award reward.');
    } finally {
      setClaiming(false);
    }
  }, [activeVideo, claiming, timeLeft, user, refreshProfile]);

  const closePlayer = () => {
    clearInterval(timerRef.current);
    setTimerRunning(false);
    setActiveVideo(null);
    setTimeLeft(0);
    setPlayerError('');
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

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

      {playerError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-red-400 text-sm">{playerError}</p>
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
                  {isWatched ? 'Reward claimed' : !isAccountInactive && !quotaReached ? (<><Play size={11} /> Tap to watch & earn</>) : ''}
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

      {/* Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-sm" onClick={closePlayer}>
          <div className="relative h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <GlassCard className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h3 className="text-white font-semibold text-sm truncate pr-4">{activeVideo.title}</h3>
                <button 
                  onClick={closePlayer}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/60 transition-colors active:scale-95 shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Video Player */}
              <div className="flex-1 flex flex-col min-h-0">
                {(activeVideo.youtube_url && extractYouTubeId(activeVideo.youtube_url)) ? (
                  <div className="relative w-full aspect-video bg-black flex-shrink-0">
                    <iframe
                      ref={playerRef}
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${extractYouTubeId(activeVideo.youtube_url)}?autoplay=1&rel=0&modestbranding=1`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-black rounded-xl">
                    <div className="w-20 h-20 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin" />
                    <p className="text-white/50 text-sm">Loading video...</p>
                  </div>
                )}

                {/* Timer & Controls */}
                <div className="px-4 py-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <Clock size={20} className="text-amber-400" />
                      </div>
                      <div>
                        <p className="text-white/50 text-xs">Time Remaining</p>
                        <p className="text-white text-2xl font-mono font-bold tabular-nums">{formatTime(timeLeft)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTimerRunning(!timerRunning)}
                        disabled={timeLeft <= 0}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors active:scale-95 disabled:opacity-50"
                      >
                        {timerRunning ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-1000 ease-linear"
                      style={{ width: `${Math.min(((activeVideo.duration_seconds - timeLeft) / (activeVideo.duration_seconds || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Claim Button */}
                {timeLeft <= 0 && (
                  <div className="px-4 py-4 border-t border-white/10">
                    <button
                      onClick={handleClaim}
                      disabled={claiming}
                      className={`btn-primary w-full flex items-center justify-center gap-2 ${claiming ? '!bg-emerald-500/20 !text-emerald-400 !border !border-emerald-500/30' : ''}`}
                    >
                      {claiming ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Claiming…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          Claim {userRewardAmount} ETB Reward
                        </>
                      )}
                    </button>
                    {playerError && <p className="text-red-400 text-sm mt-2 text-center">{playerError}</p>}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Video Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 fade-in-up">
            <button onClick={() => setShowCompletionModal(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-white/50 transition-colors active:scale-95">
              <X size={18} />
            </button>
            <div className="text-center mb-6">
              <h3 className="text-white font-bold text-lg mb-2">Reward Awarded!</h3>
              <p className="text-white/50 text-sm mb-3">
                You have earned {lastReward} ETB for completing the task.
              </p>
              <div className="flex justify-center space-x-4">
                <button onClick={() => setShowCompletionModal(false)} className="btn-secondary">
                  OK
                </button>
                <button onClick={() => setShowCompletionModal(false) && closePlayer()} className="btn-primary">
                  Continue
                </button>
              </div>
            </div>
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
              <p className="text-white/50 text-sm mb-3">Pay the registration fee and upload the proof to activate your account.</p>
              <div className="space-y-3 mb-5">
                <p className="text-white/60 text-sm">Registration Fee: {registrationFee} ETB</p>
                <p className="text-white/60 text-sm">Send Payment To: {telebirrName} ({telebirrNumber})</p>
              </div>
              <div className="flex justify-center space-x-4">
                <button onClick={() => setShowPendingModal(false)} className="btn-secondary">OK</button>
                <button onClick={() => { setShowPendingModal(false); navigate('/deposit'); }} className="btn-primary">Go to Deposit Page to Upload Proof</button>
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