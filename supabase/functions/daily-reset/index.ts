// Supabase Edge Function: daily-reset
// Runs at midnight (00:00) via pg_cron to reset all users' daily quotas.
//
// Deploy: supabase functions deploy daily-reset
// Schedule via SQL: select cron.schedule('daily-quota-reset', '0 0 * * *', $$select net.http_post(url:='https://<PROJECT_REF>.supabase.co/functions/v1/daily-reset', headers:=jsonb_build_object('Authorization','Bearer <SERVICE_ROLE_KEY>'), body:='{}'::jsonb)$$);

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (_req) => {
  try {
    // Reset all users' daily_videos_watched to 0 and update last_quota_reset
    const { data, error } = await supabase
      .from('profiles')
      .update({
        daily_videos_watched: 0,
        last_quota_reset: new Date().toISOString(),
      })
      .neq('daily_videos_watched', 0);

    if (error) {
      console.error('Reset error:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Daily quotas reset' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
