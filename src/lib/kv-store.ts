/**
 * Vercel KV (Upstash Redis) 存取層
 *
 * 設計原則：
 * - 所有操作以 Redis List (LPUSH/LRANGE) 儲存練習圖列表
 * - 每筆記錄為 JSON 字串，包含完整 UploadEntry 欄位
 * - 上限 200 筆記錄（超出時 LPOP 移除最舊的），避免 Redis 容量膨脹
 * - 讀取一律反序（LREM + 重新 LPUSH）以保持最新在前
 */

import { kv } from "@vercel/kv";
import { randomUUID } from "crypto";
import { UploadEntry } from "@/types/exam";

const KV_LIST_KEY = "practice_entries";
const KV_COUNT_KEY = "practice_entries_count";
const MAX_ENTRIES = 200;

const ALLOWED_KINDS: ReadonlySet<string> = new Set([
  "我的練習圖",
  "他人範例圖",
  "他人作品參考",
]);

function mapEntry(raw: Record<string, unknown>): UploadEntry | null {
  const kind = String(raw.kind ?? "");
  if (!ALLOWED_KINDS.has(kind)) {
    return null;
  }

  const created = new Date(String(raw.createdAt ?? Date.now()));
  if (Number.isNaN(created.getTime())) {
    return null;
  }

  let mappedKind: UploadEntry["kind"] = kind as UploadEntry["kind"];
  if (kind === "他人範例圖") {
    mappedKind = "他人作品參考";
  }

  return {
    id: String(raw.id ?? randomUUID()),
    title: String(raw.title ?? "").trim() || "未命名圖面",
    category: String(raw.category ?? "").trim() || "未分類",
    sheetCode: String(raw.sheetCode ?? "").trim() || "—",
    imageUrl: String(raw.imageUrl ?? "").trim(),
    kind: mappedKind,
    authorName: String(raw.authorName ?? "").trim() || "匿名",
    scoreNote: String(raw.scoreNote ?? "").trim(),
    teacherComment: String(raw.teacherComment ?? "").trim(),
    weaknesses: Array.isArray(raw.weaknesses)
      ? raw.weaknesses.filter(
          (w): w is string =>
            typeof w === "string" && w.trim().length > 0,
        )
      : [],
    createdAt: created.toISOString(),
  };
}

export interface KvUploadPayload {
  title: string;
  category: string;
  sheetCode: string;
  imageUrl: string;
  kind: UploadEntry["kind"];
  authorName: string;
  scoreNote: string;
  teacherComment: string;
  weaknesses: string[];
}

/**
 * 新增一筆練習圖記錄到 KV List。
 * 若列表已達 200 筆，自動 LPOP 移除最舊記錄。
 */
export async function kvPushEntry(payload: KvUploadPayload): Promise<void> {
  const entry: Record<string, unknown> = {
    id: randomUUID(),
    ...payload,
    createdAt: new Date().toISOString(),
  };

  const entryJson = JSON.stringify(entry);
  console.log("[kv] LPUSH 寫入:", { key: KV_LIST_KEY, entryId: entry.id, sheetCode: payload.sheetCode, json: entryJson.slice(0, 120) });

  // LPUSH 新記錄到列表前端
  await kv.lpush(KV_LIST_KEY, entryJson);

  // 若超出上限，移除最舊記錄
  const len = await kv.llen(KV_LIST_KEY);
  console.log("[kv] 寫入後列表長度:", len);

  if (len > MAX_ENTRIES) {
    await kv.lpop(KV_LIST_KEY);
    console.log("[kv] 已移除最舊記錄");
  }

  console.log("[kv] LPUSH 完成");
}

/**
 * 取出最近 N 筆記錄（最新在前），轉換為 UploadEntry。
 * 連線失敗時回拋錯誤，由呼叫端處理降級 fallback。
 */
export async function kvGetRecentEntries(
  limit = 6,
): Promise<UploadEntry[]> {
  const raw = await kv.lrange(KV_LIST_KEY, 0, limit - 1);
  return parseEntries(raw);
}

/**
 * 取出所有記錄（全量），用於抽題統計練習次數。
 * 無限長度，連線失敗時回拋錯誤。
 */
export async function kvGetAllEntries(): Promise<UploadEntry[]> {
  const raw = await kv.lrange(KV_LIST_KEY, 0, -1);
  return parseEntries(raw);
}

/** 通用解析：string[] → UploadEntry[] */
function parseEntries(raw: string[]): UploadEntry[] {
  if (!raw || raw.length === 0) return [];

  return raw
    .map((item) => {
      if (typeof item === "object" && item !== null) {
        return item as Record<string, unknown>;
      }
      if (typeof item === "string") {
        try {
          return JSON.parse(item) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
      return null;
    })
    .filter((r): r is Record<string, unknown> => r !== null)
    .map(mapEntry)
    .filter((e): e is UploadEntry => e !== null);
}

/**
 * 檢查 KV 是否已設定（藉此推斷使用者是否已連結 Vercel KV）。
 * 注意：@vercel/kv 在未設定環境變數時連線會拋錯，
 * 所以我們在 route.ts 層級以 try/catch 攔截。
 */
export function hasKvEnv(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN,
  );
}
