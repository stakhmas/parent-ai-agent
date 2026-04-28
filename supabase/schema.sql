create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  name text not null,
  age int not null check (age between 1 and 12),
  gender text,
  favorite_hero text,
  created_at timestamptz not null default now()
);

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  child_id uuid references children(id) on delete set null,
  email text,
  source text not null default 'web',
  telegram_chat_id bigint,
  child_name text not null,
  child_age int not null,
  child_gender text,
  challenge text not null,
  favorite_hero text not null,
  tone text not null,
  length text not null,
  title text not null,
  preview text not null,
  full_story text not null,
  parent_message jsonb not null,
  share_slug text unique,
  status text not null default 'preview',
  generated_at timestamptz not null default now()
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  story_id uuid references stories(id) on delete set null,
  stripe_session_id text unique,
  stripe_customer_id text,
  product_type text not null,
  amount_cents int not null,
  currency text not null default 'usd',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  stripe_subscription_id text unique not null,
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists bedtime_streaks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  child_id uuid references children(id) on delete cascade,
  current_count int not null default 0,
  longest_count int not null default 0,
  last_completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists share_events (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete cascade,
  channel text,
  visitor_id text,
  converted_purchase_id uuid references purchases(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists telegram_users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint unique not null,
  chat_id bigint not null,
  username text,
  first_name text,
  last_name text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists stories_challenge_idx on stories(challenge);
create index if not exists stories_email_idx on stories(email);
create index if not exists stories_source_idx on stories(source);
create index if not exists stories_telegram_chat_idx on stories(telegram_chat_id);
create index if not exists purchases_status_idx on purchases(status);
