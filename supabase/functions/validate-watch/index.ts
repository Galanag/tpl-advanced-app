// Supabase Edge Function: validate-watch
// Server-side watch time validation before releasing funds.
// Deploy: supabase functions deploy validate-watch
//
// Called from the client with: { videoId, watchedSeconds }
// Verifies watchedSeconds >= video.duration_seconds, checks quota, credits reward.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { videoId, watchedSeconds } = await req.json();

    // Authenticate the user via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    }

    // Fetch video
    const { data: video } = await supabase.from('videos').select('*').eq('id', videoId).single();
    if (!video) {
      return new Response(JSON.stringify({ error: 'Video not found' }), { status: 404 });
    }

    // Validate watch time
    const requiredSeconds = parseInt(video.duration_seconds) || 30;
    if (watchedSeconds < requiredSeconds) {
      return new Response(JSON.stringify({
        success: false,
        error: `Watch time validation failed. ${watchedSeconds}s watched, ${requiredSeconds}s required.`,
      }), { status: 400 });
    }

    // Fetch profile and check status/quota
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }
    if (profile.account_status !== 'active') {
      return new Response(JSON.stringify({ error: 'Account not active' }), { status: 403 });
    }

    const quotaLimit = profile.daily_quota_limit || 10;
    if ((profile.daily_videos_watched || 0) >= quotaLimit) {
      return new Response(JSON.stringify({ error: 'Daily quota reached' }), { status: 403 });
    }

    const reward = parseFloat(video.reward_amount) || 0;

    // Mark progress completed
    await supabase.from('user_progress').upsert({
      user_id: user.id,
      video_id: videoId,
      status: 'completed',
      watched_seconds: watchedSeconds,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,video_id' });

    // Record watch history
    await supabase.from('watch_history').insert({
      user_id: user.id,
      video_id: videoId,
      status: 'completed',
    });

    // Credit balance + quota
    await supabase.from('profiles').update({
      balance: (parseFloat(profile.balance) || 0) + reward,
      daily_videos_watched: (profile.daily_videos_watched || 0) + 1,
    }).eq('id', user.id);

    return new Response(JSON.stringify({ success: true, reward }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
