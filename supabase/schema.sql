create extension if not exists "pgcrypto";

create table if not exists public.practice_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  sheet_code text not null,
  image_url text not null,
  kind text not null check (kind in ('我的練習圖', '他人範例圖')),
  author_name text not null,
  score_note text not null,
  weaknesses text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.practice_entries enable row level security;

drop policy if exists "public can read practice entries" on public.practice_entries;
create policy "public can read practice entries"
  on public.practice_entries
  for select
  using (true);

insert into storage.buckets (id, name, public)
values ('practice-images', 'practice-images', true)
on conflict (id) do nothing;

drop policy if exists "public can read practice images" on storage.objects;
create policy "public can read practice images"
  on storage.objects
  for select
  using (bucket_id = 'practice-images');
