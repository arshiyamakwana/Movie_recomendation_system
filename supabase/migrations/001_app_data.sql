create extension if not exists pgcrypto;

create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  auth_user_id text,
  movie_id bigint not null,
  movie_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_key, movie_id)
);

create index if not exists idx_watchlist_items_user_key
  on public.watchlist_items (user_key, created_at desc);

create table if not exists public.mood_scan_events (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  auth_user_id text,
  mood_id text not null,
  detected_emotion text,
  detection_method text not null check (detection_method in ('camera', 'quiz', 'manual', 'custom')),
  custom_prompt text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_mood_scan_events_user_key
  on public.mood_scan_events (user_key, created_at desc);

create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  auth_user_id text,
  movie_id bigint not null,
  recommendation_source text not null,
  action text not null check (action in ('click', 'save', 'dismiss', 'like', 'dislike')),
  mood_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_recommendation_feedback_user_key
  on public.recommendation_feedback (user_key, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_watchlist_items_updated_at on public.watchlist_items;
create trigger trg_watchlist_items_updated_at
before update on public.watchlist_items
for each row
execute procedure public.set_updated_at();
