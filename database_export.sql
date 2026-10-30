-- This is a PostgreSQL dump. It requires a PostgreSQL database. If migrating to a cPanel environment, ensure PostgreSQL is enabled, or manually convert this to MySQL syntax.

-- =====================================================
-- HIDASE Investment Group — Full Supabase Schema
-- =====================================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Idempotent: safe to re-run.

create extension if not exists "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  full_name text,
  balance numeric(12,2) default 0 not null,
  referral_code text unique not null,
  referred_by uuid references public.profiles(id) on delete set null,
  level text default 'Intern' not null,
  team_size int default 0 not null,
  is_admin boolean default false not null,
  account_status text default 'pending' not null,
  daily_quota_limit int default 10 not null,
  daily_videos_watched int default 0 not null,
  last_quota_reset timestamptz default now(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint account_status_check check (account_status in ('pending','active','suspended'))
);

create index if not exists idx_profiles_referral_code on public.profiles(referral_code);
create index if not exists idx_profiles_referred_by on public.profiles(referred_by);
create index if not exists idx_profiles_account_status on public.profiles(account_status);

-- =====================================================
-- 2. VIDEOS TABLE
-- =====================================================
create table if not exists public.videos (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  thumbnail_url text,
  video_url text,
  reward_amount numeric(10,2) default 0 not null,
  duration_seconds int default 30 not null,
  created_at timestamptz default now() not null
);

-- =====================================================
-- 3. ADMIN SETTINGS TABLE (key-value store)
-- =====================================================
create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now() not null
);

-- Seed defaults (only if missing)
insert into public.admin_settings (key, value) values
  ('registration_fee', '500'),
  ('daily_video_limit', '10'),
  ('video_reward_amount', '10'),
  ('referral_bonus_percentage', '10')
on conflict (key) do nothing;

-- =====================================================
-- 4. USER PROGRESS TABLE (per-user per-video tracking)
-- =====================================================
create table if not exists public.user_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  status text default 'unstarted' not null,
  watched_seconds int default 0 not null,
  completed_at timestamptz,
  created_at timestamptz default now() not null,
  constraint user_progress_status_check check (status in ('unstarted','in_progress','completed')),
  unique(user_id, video_id)
);

create index if not exists idx_user_progress_user on public.user_progress(user_id);

-- =====================================================
-- 5. REFERRALS TABLE (gated referral system)
-- =====================================================
create table if not exists public.referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'pending_payment' not null,
  created_at timestamptz default now() not null,
  constraint referrals_status_check check (status in ('pending_payment','active')),
  unique(referrer_id, referred_id)
);

create index if not exists idx_referrals_referrer on public.referrals(referrer_id);

-- =====================================================
-- 6. LEGACY TABLES (kept for backward compatibility)
-- =====================================================
create table if not exists public.watch_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  status text default 'completed' not null,
  watched_at timestamptz default now() not null
);
create index if not exists idx_watch_history_user on public.watch_history(user_id);

create table if not exists public.commissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  type text not null,
  source_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);
create index if not exists idx_commissions_user on public.commissions(user_id);

create table if not exists public.withdrawals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  status text default 'pending' not null,
  created_at timestamptz default now() not null
);
create index if not exists idx_withdrawals_user on public.withdrawals(user_id);

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================
create or replace function public.increment_team_size(uid uuid)
returns void language sql security definer as $$
  update public.profiles
  set team_size = team_size + 1, updated_at = now()
  where id = uid;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- =====================================================
-- 7b. AUTH TRIGGER — processes supabase.auth.signUp options.data
-- =====================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  my_code text;
  inviter_id uuid := null;
begin
  -- Generate a unique 6-character referral code
  my_code := (
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32)::int + 1, 1), '')
    from generate_series(1, 6)
  );
  -- Ensure uniqueness
  while exists (select 1 from public.profiles where referral_code = my_code) loop
    my_code := (
      select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32)::int + 1, 1), '')
      from generate_series(1, 6)
    );
  end loop;

  -- Resolve inviter via referral code in options.data
  if (NEW.raw_user_meta_data->>'referral_code') is not null then
    select id into inviter_id
    from public.profiles
    where referral_code = upper(trim(NEW.raw_user_meta_data->>'referral_code'))
    limit 1;
  end if;

  insert into public.profiles (
    id, phone, full_name, balance, referral_code, referred_by, level,
    team_size, is_admin, account_status, daily_quota_limit, daily_videos_watched,
    last_quota_reset, created_at, updated_at
  ) values (
    NEW.id,
    NEW.raw_user_meta_data->>'phone', -- actual phone number
    NEW.raw_user_meta_data->>'full_name',
    0,
    my_code,
    inviter_id,
    'Intern',
    0,
    false,
    'pending',
    10,
    0,
    now(),
    now(),
    now()
  );

  -- Create a referral record
  if inviter_id is not null then
    insert into public.referrals (referrer_id, referred_id, status)
    values (inviter_id, NEW.id, 'pending_payment');
  end if;

  return NEW;
exception when others then
  return NEW;
end;
$$;

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================
alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.admin_settings enable row level security;
alter table public.user_progress enable row level security;
alter table public.referrals enable row level security;
alter table public.watch_history enable row level security;
alter table public.commissions enable row level security;
alter table public.withdrawals enable row level security;

-- PROFILES
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated using (auth.uid() = id or is_admin());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated using (auth.uid() = id or is_admin());

-- VIDEOS
drop policy if exists "videos_select_auth" on public.videos;
create policy "videos_select_auth" on public.videos for select to authenticated using (true);
drop policy if exists "videos_insert_admin" on public.videos;
create policy "videos_insert_admin" on public.videos for insert to authenticated with check (is_admin());
drop policy if exists "videos_update_admin" on public.videos;
create policy "videos_update_admin" on public.videos for update to authenticated using (is_admin());
drop policy if exists "videos_delete_admin" on public.videos;
create policy "videos_delete_admin" on public.videos for delete to authenticated using (is_admin());

-- ADMIN_SETTINGS
drop policy if exists "settings_select_auth" on public.admin_settings;
create policy "settings_select_auth" on public.admin_settings for select to authenticated using (true);
drop policy if exists "settings_update_admin" on public.admin_settings;
create policy "settings_update_admin" on public.admin_settings for update to authenticated using (is_admin());
drop policy if exists "settings_insert_admin" on public.admin_settings;
create policy "settings_insert_admin" on public.admin_settings for insert to authenticated with check (is_admin());

-- USER_PROGRESS
drop policy if exists "progress_select_own_or_admin" on public.user_progress;
create policy "progress_select_own_or_admin" on public.user_progress for select to authenticated using (auth.uid() = user_id or is_admin());
drop policy if exists "progress_upsert_own" on public.user_progress;
create policy "progress_upsert_own" on public.user_progress for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "progress_update_own" on public.user_progress;
create policy "progress_update_own" on public.user_progress for update to authenticated using (auth.uid() = user_id);

-- REFERRALS
drop policy if exists "referrals_select_related_or_admin" on public.referrals;
create policy "referrals_select_related_or_admin" on public.referrals for select to authenticated using (auth.uid() = referrer_id or auth.uid() = referred_id or is_admin());
drop policy if exists "referrals_insert_admin" on public.referrals;
create policy "referrals_insert_admin" on public.referrals for insert to authenticated with check (is_admin());
drop policy if exists "referrals_update_admin" on public.referrals;
create policy "referrals_update_admin" on public.referrals for update to authenticated using (is_admin());

-- WATCH_HISTORY
drop policy if exists "watch_history_select_own" on public.watch_history;
create policy "watch_history_select_own" on public.watch_history for select to authenticated using (auth.uid() = user_id);
drop policy if exists "watch_history_insert_own" on public.watch_history;
create policy "watch_history_insert_own" on public.watch_history for insert to authenticated with check (auth.uid() = user_id);

-- COMMISSIONS
drop policy if exists "commissions_select_own" on public.commissions;
create policy "commissions_select_own" on public.commissions for select to authenticated using (auth.uid() = user_id);

-- WITHDRAWALS
drop policy if exists "withdrawals_select_own" on public.withdrawals;
create policy "withdrawals_select_own" on public.withdrawals for select to authenticated using (auth.uid() = user_id);
drop policy if exists "withdrawals_insert_own" on public.withdrawals;
create policy "withdrawals_insert_own" on public.withdrawals for insert to authenticated with check (auth.uid() = user_id);

-- =====================================================
-- 9. SEED DATA (sample videos)
-- =====================================================
insert into public.videos (title, thumbnail_url, video_url, reward_amount, duration_seconds) values
  ('Welcome to HIDASE', 'https://placehold.co/400x225/1e293b/f59e0b?text=Welcome', '', 10, 30),
  ('How Referral Earnings Work', 'https://placehold.co/400x225/1e293b/f59e0b?text=Referrals', '', 15, 45),
  ('Daily Earning Tips', 'https://placehold.co/400x225/1e293b/f59e0b?text=Tips', '', 12, 30),
  ('Withdrawal Guide', 'https://placehold.co/400x225/1e293b/f59e0b?text=Withdraw', '', 8, 20),
  ('Success Stories', 'https://placehold.co/400x225/1e293b/f59e0b?text=Stories', '', 20, 60),
  ('Team Building Strategy', 'https://placehold.co/400x225/1e293b/f59e0b?text=Team', '', 18, 50)
on conflict do nothing;

-- =====================================================
-- 10. AUTH TRIGGER BINDING
-- =====================================================
-- This fires automatically when a new user signs up via supabase.auth.signUp
-- It processes the options.data (full_name, referral_code) and creates the profile
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();