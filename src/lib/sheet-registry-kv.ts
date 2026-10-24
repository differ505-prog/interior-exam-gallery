/**
 * sheet-registry-kv.ts
 *
 * Vercel KV Hash 存取層。使用 Hash（而非 List）以避開
 * kv-store.ts 的 200 筆 LPOP 上限，避免吃掉練習紀錄。
 */

import { kv } from "@vercel/kv";
import { hasKvEnv } from "@/lib/kv-store";
import { buildRegistryKey, REGISTRY_KV_KEY } from "@/lib/sheet-registry";
import type { SheetRecord, SheetSlot } from "@/types/sheet-registry";

function isSlot(value: unknown): value is SheetSlot {
  return value === "question" || value === "answer";
}

/** 防衛性解析：欄位型別不符或缺 key 一律丟棄，不讓壞資料進入 UI */
function mapRecord(raw: unknown): SheetRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const sectionSlug =
    typeof r.sectionSlug === "string" ? r.sectionSlug.trim() : "";
  const code = typeof r.code === "string" ? r.code.trim() : "";
  if (!sectionSlug || !code || !isSlot(r.slot)) return null;

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

  return {
    sectionSlug,
    code,
    slot: r.slot,
    url: str(r.url),
    prevUrl: str(r.prevUrl),
    prevAt: str(r.prevAt),
    stagedUrl: str(r.stagedUrl),
    stagedAt: str(r.stagedAt),
    updatedAt: str(r.updatedAt) ?? new Date(0).toISOString(),
  };
}

export function hasSheetRegistryEnv(): boolean {
  return hasKvEnv();
}

/** 讀取全部建檔記錄；KV 未設定或讀取失敗時回傳空陣列（降級不中斷前台） */
export async function kvGetSheetRecords(): Promise<SheetRecord[]> {
  if (!hasKvEnv()) return [];
  try {
    const raw = await kv.hgetall<Record<string, unknown>>(REGISTRY_KV_KEY);
    if (!raw) return [];
    return Object.values(raw)
      .map((v) => {
        if (typeof v !== "string") return v;
        try {
          return JSON.parse(v) as unknown;
        } catch {
          return null;
        }
      })
      .map(mapRecord)
      .filter((r): r is SheetRecord => r !== null);
  } catch (error) {
    console.error("[sheet-registry] KV 讀取失敗:", error);
    return [];
  }
}

/** 寫入單筆記錄（Upstash hset 簽章為 hset(key, { field: value })） */
export async function kvSetSheetRecord(record: SheetRecord): Promise<void> {
  const key = buildRegistryKey(record.sectionSlug, record.code, record.slot);
  await kv.hset(REGISTRY_KV_KEY, { [key]: JSON.stringify(record) });
}