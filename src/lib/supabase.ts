import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "practice-images";

export const hasSupabaseEnv = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey,
);

let cachedAdminClient: SupabaseClient | null = null;

/**
 * 取得 Supabase admin client，延遲初始化避免冷啟動成本。
 * 此函式僅在伺服器端使用，絕對不會在前端 bundle 中暴露 service role key。
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase server environment variables.");
  }

  cachedAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedAdminClient;
}

/**
 * 取得 supabase 設定，供 debug / 顯示用。永遠只回傳布林值，不回傳金鑰。
 */
export function getSupabaseStatus() {
  return {
    configured: hasSupabaseEnv,
    bucket: bucketName,
  };
}