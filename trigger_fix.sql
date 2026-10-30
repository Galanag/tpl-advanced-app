-- =====================================================
-- Fix for missing profile creation and email confirmation
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- =====================================================

-- Step 1: Drop existing trigger and function
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Step 2: Alter profiles table to add missing columns (if they don't exist)
-- We add vip_level and total_deposited with default values
alter table public.profiles
  add column if not exists vip_level text default 'Basic' not null,
  add column if not exists total_deposited numeric(12,2) default 0 not null;

-- Step 3: Recreate the handle_new_user function with SECURITY DEFINER
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
    team_size, is_admin, account_status, vip_level, total_deposited,
    daily_quota_limit, daily_videos_watched, successful_referrals,
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
    'Basic', -- default vip_level
    0,       -- default total_deposited
    10,
    0,
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

-- Step 4: Recreate the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();