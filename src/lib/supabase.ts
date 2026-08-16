/**
 * Supabase Client — 匿名簽入 + 跨裝置同步
 *
 * 使用方式：
 * - 前端元件：直接 import { supabase } from '@/lib/supabase'
 * - server-side：請用 createServerClient（由 Next.js 外層注入）
 *
 * 匿名簽入流程：
 * 1. 首次開啟 → signInAnonymously() → 取得固定 UUID
 * 2. UUID 存入 sessionStorage → 同瀏覽器復用
 * 3. 資料寫入 public.user_data 表（RLS 限定本人）
 *
 * 環境變數（見 .env.example）：
 * NEXT_PUBLIC_SUPABASE_URL       — 專案 URL
 * NEXT_PUBLIC_SUPABASE_ANON_KEY  — 公開的匿名鑰匙
 * SUPABASE_SERVICE_ROLE_KEY     — 僅 server-side 使用
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * 是否已完整設定 Supabase（URL + Anon Key 皆存在）
 */
export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

/**
 * 瀏覽器端 Supabase Client
 * 搭配 anonymous sign-in 使用，uid 自動關聯 public.user_data
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,   // UUID 存入 localStorage，重啟瀏覽器仍復用
        storageKey: "draft-gallery-auth",
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * 嘗試匿名簽入，回傳 session（或 null）
 * 若已登入（session 存在）則直接回傳，不重複簽入
 */
export async function ensureAnonymousSession() {
  if (!supabase) return null;

  const { data: session } = await supabase.auth.getSession();
  if (session?.session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn("[Supabase] Anonymous sign-in failed:", error.message);
    return null;
  }
  return data;
}
