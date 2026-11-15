import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If these are missing during the build, the app will throw a clear error in the console
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase URL or Anon Key. Check your Cloudflare Environment Variables and trigger a new build.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    // Forces Supabase to use the native fetch API, fixing Cloudflare Worker issues
    fetch: (...args) => fetch(...args),
  },
});

export const phoneToEmail = (phone) => `${phone.replace(/[^0-9]/g, '')}@hidase.com`;