/**
 * 上傳服務狀態資訊
 *
 * 歷史說明：
 * - v1：Supabase（需要付費專案，現已停用）
 * - v2：Vercel KV（Upstash Redis，免費額度充足）
 */

import { hasCloudinaryEnv, cloudinaryCloudName } from "@/lib/cloudinary";
import { hasKvEnv } from "@/lib/kv-store";

export function getSupabaseStatus() {
  return {
    // 圖片儲存：Cloudinary
    imageStorage: {
      configured: hasCloudinaryEnv,
      provider: "cloudinary",
      cloudName: hasCloudinaryEnv ? cloudinaryCloudName : null,
    },
    // 中繼資料：Vercel KV
    metadata: {
      configured: hasKvEnv(),
      provider: "vercel-kv",
    },
  };
}
