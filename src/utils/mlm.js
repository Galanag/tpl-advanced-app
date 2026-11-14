import { supabase } from '../lib/supabase';

const COMMISSION_RATES = { 1: 0.10, 2: 0.03, 3: 0.02 };

export const distributeCommissions = async (userId, amount) => {
  try {
    let currentId = userId;
    let level = 1;
    while (level <= 13) {
      const { data: currentProfile } = await supabase.from('profiles').select('referred_by').eq('id', currentId).single();
      if (!currentProfile?.referred_by) break;
      const uplineId = currentProfile.referred_by;
      const rate = COMMISSION_RATES[level] || 0;
      if (rate > 0) {
        const commissionAmount = parseFloat((amount * rate).toFixed(2));
        const { data: upline } = await supabase.from('profiles').select('balance').eq('id', uplineId).single();
        if (upline) {
          await supabase.from('profiles').update({ balance: (parseFloat(upline.balance) || 0) + commissionAmount }).eq('id', uplineId);
          await supabase.from('commissions').insert({ user_id: uplineId, amount: commissionAmount, type: `P${level}`, source_user_id: userId });
        }
      }
      currentId = uplineId;
      level++;
    }
  } catch (error) {
    console.error('Commission distribution error:', error);
  }
};

export const claimVideoReward = async (user, video, watchedSeconds) => {
  const requiredSeconds = parseInt(video.duration_seconds) || 30;
  if (watchedSeconds < requiredSeconds) {
    throw new Error(`Watch time validation failed. You watched ${watchedSeconds}s of ${requiredSeconds}s required.`);
  }

  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (profileError) throw new Error(`Failed to load profile: ${profileError.message}`);
  if (!profile) throw new Error('Profile not found');
  if (profile.account_status !== 'active') throw new Error('Your account is not active. Please complete registration.');

  const quotaLimit = profile.daily_quota_limit || 10;
  const watchedToday = profile.daily_videos_watched || 0;
  if (watchedToday >= quotaLimit) throw new Error('Daily quota reached. Please come back tomorrow.');

  // --- ATOMIC: check for existing completion BEFORE any writes ---
  const { data: existingProgress, error: progressCheckError } = await supabase.from('user_progress').select('status').eq('user_id', user.id).eq('video_id', video.id).single();
  if (progressCheckError && progressCheckError.code !== 'PGRST116') {
    throw new Error(`Failed to check existing progress: ${progressCheckError.message}`);
  }
  if (existingProgress?.status === 'completed') {
    throw new Error('You have already claimed the reward for this task.');
  }

  // Get reward amount based on VIP level from admin settings
  const { data: settings } = await supabase.from('admin_settings').select('*');
  const settingsMap = {};
  (settings || []).forEach((s) => { settingsMap[s.key] = s.value; });

  let rewardAmount = 0;
  switch (profile.vip_level) {
    case 'VIP1':
      rewardAmount = parseFloat(settingsMap.vip1_reward_amount) || 15;
      break;
    case 'VIP2':
      rewardAmount = parseFloat(settingsMap.vip2_reward_amount) || 20;
      break;
    case 'VIP3':
      rewardAmount = parseFloat(settingsMap.vip3_reward_amount) || 25;
      break;
    case 'Basic':
    default:
      rewardAmount = parseFloat(settingsMap.basic_reward_amount) || 600;
      break;
  }

  // --- ATOMIC: persist completion BEFORE balance update ---
  const { error: upsertError } = await supabase.from('user_progress').upsert({
    user_id: user.id,
    video_id: video.id,
    status: 'completed',
    watched_seconds: watchedSeconds,
    completed_at: new Date().toISOString(),
  }, { onConflict: 'user_id,video_id' });
  if (upsertError) throw new Error(`Failed to save progress: ${upsertError.message}`);

  const { error: historyError } = await supabase.from('watch_history').insert({ user_id: user.id, video_id: video.id, status: 'completed' });
  if (historyError) throw new Error(`Failed to record watch history: ${historyError.message}`);

  // Only now update balance (only reached if both writes above succeeded)
  const { error: balanceError } = await supabase.from('profiles').update({
    balance: (parseFloat(profile.balance) || 0) + rewardAmount,
    daily_videos_watched: watchedToday + 1,
  }).eq('id', user.id);
  if (balanceError) throw new Error(`Failed to update balance: ${balanceError.message}`);

  await distributeCommissions(user.id, rewardAmount);
  return rewardAmount;
};

export const saveProgress = async (userId, videoId, watchedSeconds) => {
  await supabase.from('user_progress').upsert({
    user_id: userId,
    video_id: videoId,
    status: 'in_progress',
    watched_seconds: watchedSeconds,
  }, { onConflict: 'user_id,video_id' });
};