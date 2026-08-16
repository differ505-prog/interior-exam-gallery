-- ============================================================
-- Migration: 001_user_data_sync
-- Purpose: 建立跨裝置使用者資料同步資料表
-- ============================================================

-- 啟用 UUID 擴充
create extension if not exists "pgcrypto";

-- ============================================================
-- 資料表：user_data
-- 儲存速記本與教學資源，匿名簽入後關聯至 auth.users
-- ============================================================
create table if not exists public.user_data (
  id          uuid    default gen_random_uuid() primary key,
  user_id     uuid    not null references auth.users(id) on delete cascade,
  sheet_code  text    not null,
  scratch_note text   not null default '',
  teaching_links jsonb not null default '[]',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  -- 唯一鍵：同一使用者、同一試卷只會有一筆記錄
  constraint user_data_unique
    unique (user_id, sheet_code)
);

-- ============================================================
-- RLS（Row Level Security）：使用者只能讀寫自己的資料
-- ============================================================
alter table public.user_data enable row level security;

-- 所有操作限本人
create policy "Users can manage own user_data"
on public.user_data
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- 自動更新 updated_at
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_data_updated_at
  before update on public.user_data
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 匿名簽入啟用（Anonymous Sign-in）
-- ============================================================
-- 此功能需在 Supabase Dashboard → Authentication → Providers
-- 啟用「Anonymous Sign-ins」選項
--
-- 或執行以下 SQL（需 superuser）：
-- update auth.config set enable_anonymous_sign_ins = true;
