/**
 * sheet-registry.ts
 *
 * 建檔中心的純邏輯層：key 建構、狀態機 reducer、覆蓋率計算。
 * 本檔案不得 import KV、Cloudinary、React（保持可單元測試）。
 */

import type { ArchiveItem } from "@/types/exam";
import type {
  SectionCoverage,
  SheetRecord,
  SheetRegistry,
  SheetSlot,
  SheetSlotStatus,
} from "@/types/sheet-registry";

/** KV Hash key（單一事實來源，API 與 UI 皆引用此常數） */
export const REGISTRY_KV_KEY = "sheet_registry";

/** 支援的四個區塊（與 examSections 對齊） */
export const REGISTRY_SECTIONS = [
  { slug: "plan", label: "平面圖 201-206" },
  { slug: "ceiling-elevation", label: "天花板與立面圖" },
  { slug: "perspective", label: "透視圖 207-212" },
  { slug: "detail", label: "大樣圖 213-224" },
] as const;

/** 建立 field key */
export function buildRegistryKey(
  sectionSlug: string,
  code: string,
  slot: SheetSlot,
): string {
  return `${sectionSlug}:${code}:${slot}`;
}

/** 解析 field key；格式不符回傳 null */
export function parseRegistryKey(key: string): {
  sectionSlug: string;
  code: string;
  slot: SheetSlot;
} | null {
  const parts = key.split(":");
  if (parts.length !== 3) return null;
  const [sectionSlug, code, slot] = parts;
  if (!sectionSlug || !code) return null;
  if (slot !== "question" && slot !== "answer") return null;
  return { sectionSlug, code, slot };
}

/** 建立一筆全新的記錄 */
export function createRecord(
  sectionSlug: string,
  code: string,
  slot: SheetSlot,
  at: string,
): SheetRecord {
  return {
    sectionSlug,
    code,
    slot,
    url: null,
    prevUrl: null,
    prevAt: null,
    stagedUrl: null,
    stagedAt: null,
    updatedAt: at,
  };
}

/** 上傳新圖 → 進入「待核准」。若已有待核准圖，舊的待核准圖被取代。 */
export function applyStage(
  record: SheetRecord,
  url: string,
  at: string,
): SheetRecord {
  return { ...record, stagedUrl: url, stagedAt: at, updatedAt: at };
}

/** 核准：生效欄位 ← 待核准欄位；舊生效欄位降級為上一版。 */
export function applyApprove(record: SheetRecord, at: string): SheetRecord {
  if (!record.stagedUrl) return record;
  return {
    ...record,
    url: record.stagedUrl,
    prevUrl: record.url,
    prevAt: record.updatedAt,
    stagedUrl: null,
    stagedAt: null,
    updatedAt: at,
  };
}

/** 撤銷：丟棄待核准圖，不影響生效與上一版。 */
export function applyDiscard(record: SheetRecord, at: string): SheetRecord {
  if (!record.stagedUrl) return record;
  return { ...record, stagedUrl: null, stagedAt: null, updatedAt: at };
}

/**
 * 回滾：生效與上一版互換。
 * 互換而非清空，讓「回滾」本身也可以再被核准還原（單一按鈕即可復原誤操作）。
 */
export function applyRollback(record: SheetRecord, at: string): SheetRecord {
  if (!record.prevUrl) return record;
  const current = record.url;
  return {
    ...record,
    url: record.prevUrl,
    prevUrl: current,
    prevAt: record.updatedAt,
    updatedAt: at,
  };
}

/** 前台唯一讀取入口：只認生效欄位。 */
export function resolveSlotUrl(record: SheetRecord | undefined): string | null {
  return record?.url ?? null;
}

/** 槽位狀態燈（供建檔中心 UI 使用） */
export function buildSlotStatus(
  record: SheetRecord | undefined,
  slot: SheetSlot,
): SheetSlotStatus {
  const liveUrl = resolveSlotUrl(record);
  const pendingUrl = record?.stagedUrl ?? null;
  const state: SheetSlotStatus["state"] = pendingUrl
    ? "pending"
    : liveUrl
      ? record?.prevUrl
        ? "rollback-ready"
        : "live"
      : "missing";

  return {
    slot,
    state,
    liveUrl,
    pendingUrl,
    canApprove: Boolean(pendingUrl),
    canRollback: Boolean(record?.prevUrl),
  };
}

/** 取得某區塊所有不重複題號（保留題庫順序） */
export function uniqueCodes(items: readonly ArchiveItem[]): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const item of items) {
    if (seen.has(item.code)) continue;
    seen.add(item.code);
    codes.push(item.code);
  }
  return codes;
}

/**
 * 計算某區塊的建檔覆蓋率。
 * 「已備妥」= registry 有生效 URL，或 staticProbe 確認磁碟上有靜態圖。
 */
export function buildSectionCoverage(
  sectionSlug: string,
  items: readonly ArchiveItem[],
  registry: SheetRegistry,
  staticProbe?: Record<string, boolean>,
): SectionCoverage {
  const codes = uniqueCodes(items);
  let questionReady = 0;
  let answerReady = 0;
  let pendingCount = 0;
  const missingCodes: string[] = [];

  for (const code of codes) {
    const question = registry[buildRegistryKey(sectionSlug, code, "question")];
    const answer = registry[buildRegistryKey(sectionSlug, code, "answer")];

    if (question?.stagedUrl) pendingCount += 1;
    if (answer?.stagedUrl) pendingCount += 1;

    // 僅當探測明確回報「磁碟上有圖」才算備妥。探測缺項（unknown）不視為已備妥，
    // 避免 probe 未回傳時把整個區塊誤報為已完成（憲法第八條：誠實狀態）
    const questionOnDisk = staticProbe?.[buildRegistryKey(sectionSlug, code, "question")] === true;
    const answerOnDisk = staticProbe?.[buildRegistryKey(sectionSlug, code, "answer")] === true;

    if (question?.url || questionOnDisk) {
      questionReady += 1;
    } else {
      missingCodes.push(code);
    }
    if (answer?.url || answerOnDisk) answerReady += 1;
  }

  return {
    sectionSlug,
    totalCodes: codes.length,
    questionReady,
    answerReady,
    pendingCount,
    missingCodes,
  };
}