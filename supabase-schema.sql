-- ============================================================
-- TASKER — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE
-- Extends Supabase auth.users with WhatsApp number
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  whatsapp_number text,
  updated_at timestamptz
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policy: Users can only read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Policy: Users can insert their own profile
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Policy: Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);


-- ============================================================
-- 2. TASKS TABLE
-- ============================================================
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  deadline timestamptz not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  is_completed boolean not null default false,
  reminder_minutes_before integer not null default 60,
  notification_sent boolean not null default false,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.tasks enable row level security;

-- Policy: Users can only see their own tasks
create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

-- Policy: Users can create their own tasks
create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

-- Policy: Users can update their own tasks
create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

-- Policy: Users can delete their own tasks
create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);


-- ============================================================
-- 3. AUTO-CREATE PROFILE ON SIGNUP
-- Trigger that creates a profile row when a new user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, updated_at)
  values (new.id, new.raw_user_meta_data ->> 'full_name', now());
  return new;
end;
$$;

-- Attach trigger to auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 4. INDEX for performance on the cron job query
-- ============================================================
create index if not exists idx_tasks_cron
  on public.tasks (is_completed, notification_sent, deadline)
  where is_completed = false and notification_sent = false;
