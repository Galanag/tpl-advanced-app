import { createClient } from '@supabase/supabase-js';

// Get the environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail loudly if environment variables are missing during the build
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ CRITICAL ERROR: Supabase environment variables are missing!");
  console.error("URL:", SUPABASE_URL ? "Present" : "Missing");
  console.error("KEY:", SUPABASE_ANON_KEY ? "Present" : "Missing");
  console.error("If you are in production (Cloudflare), ensure you added VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Environment Variables and triggered a new build.");
}

export const supabase = createClient(
  SUPABASE_URL || 'https://missing-url.supabase.co', // Fallback prevents app crash, but API calls will fail
  SUPABASE_ANON_KEY || 'missing-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: {
      // This explicitly forces Supabase to use the browser's native fetch API
      // It fixes the "Failed to fetch" error in Cloudflare Workers/Pages
      fetch: (...args) => fetch(...args),
    },
  }
);

// Helper: transform phone number to pseudo-email for Supabase Auth
export const phoneToEmail = (phone) => `${phone.replace(/[^0-9]/g, '')}@hidase.com`;