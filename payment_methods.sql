-- Add payment method columns to profiles table if they don't exist
alter table public.profiles
  add column if not exists payment_method text,
  add column if not exists payment_account_name text,
  add column if not exists payment_account_number text;