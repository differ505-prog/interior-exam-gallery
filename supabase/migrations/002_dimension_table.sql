-- ============================================================
-- Migration: 002_dimension_table
-- Purpose: 建立尺寸對照表資料表（跨所有平面圖共用）
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- 資料表：dimension_entries
-- 使用者自訂的尺寸對照表，左欄=實際尺寸，右欄=工具尺寸
-- 由於是跨試卷共用，uuid 為主鍵，無 sheet_code 欄位
-- ============================================================
create table if not exists public.dimension_entries (
  id          uuid    default gen_random_uuid() primary key,
  user_id     uuid    not null references auth.users(id) on delete cascade,
  real_size   text    not null default '',
  tool_size   text    not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  -- 避免空白列
  constraint dimension_entries_not_empty
    check (real_size <> '' OR tool_size <> '')
);

-- ============================================================
-- RLS（Row Level Security）：使用者只能讀寫自己的資料
-- ============================================================
alter table public.dimension_entries enable row level security;

drop policy if exists "Users can manage own dimension_entries" on public.dimension_entries;
create policy "Users can manage own dimension_entries"
on public.dimension_entries
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- 自動更新 updated_at
-- ============================================================
drop trigger if exists dimension_entries_updated_at on public.dimension_entries;
create trigger dimension_entries_updated_at
  before update on public.dimension_entries
  for each row execute function public.handle_updated_at();
