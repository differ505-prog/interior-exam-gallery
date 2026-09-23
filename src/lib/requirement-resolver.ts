/**
 * requirement-resolver.ts
 *
 * 需求圖解析單一事實來源（Single Source of Truth）。
 *
 * 設計背景：
 * 平面圖試卷（plan）的需求圖（requirement）以字母版本（A/B/C/D/E）共用。
 * 例如上傳一張「A 需求圖」，會出現在 201A、202A、203A、204A、205A、206A 六張試卷的 Modal 中。
 *
 * 共用 key 命名規則：
 * - sectionSlug + variant，例如 "plan-A"、"ceiling-elevation-B"
 *
 * 可擴展性：
 * 未來可支援天花板與立面圖（ceiling-elevation-A 等）、大樣圖（detail-217-scale 等）
 */

import { UploadEntry } from "@/types/exam";

export type SharedRequirementKey = {
  sectionSlug: string;
  variant: string;
};

/**
 * 建立共用需求圖的 key。
 * 用於：
 * 1. 上傳新共用需求圖時，作為 sheetCode 存入 KV
 * 2. 查詢時比對 sheetCode 是否為共用 key
 */
export function buildSharedRequirementKey(k: SharedRequirementKey): string {
  return `${k.sectionSlug}-${k.variant}`;
}

/**
 * 解析 sheetCode 是否為共用需求圖 key。
 * 例如 "plan-A" → { sectionSlug: "plan", variant: "A" }
 * 例如 "201A" → null（非共用 key）
 */
export function parseSharedRequirementKey(sheetCode: string): SharedRequirementKey | null {
  const match = sheetCode.match(/^(plan|ceiling-elevation|perspective|detail)-([A-Z]|[A-Z]{2,})$/);
  if (!match) return null;
  return {
    sectionSlug: match[1],
    variant: match[2],
  };
}

/**
 * 列出受某個共用需求圖影響的試卷題號。
 *
 * plan：201-206 × [variant]
 * ceiling-elevation：201-206 × [variant] 各四張（天花/客立/餐立/臥立）
 */
export function listAffectedSheetCodes(sectionSlug: string, variant: string): string[] {
  const questions = ["201", "202", "203", "204", "205", "206"];
  const codes: string[] = [];

  if (sectionSlug === "plan") {
    // 平面圖：直接組合題號 + 版本
    for (const q of questions) {
      codes.push(`${q}${variant}`);
    }
  } else if (sectionSlug === "ceiling-elevation") {
    // 天花板與立面圖：每個版本 × 4 視角
    for (const q of questions) {
      codes.push(`${q}${variant}天花`);
      codes.push(`${q}${variant}客立`);
      codes.push(`${q}${variant}餐立`);
      codes.push(`${q}${variant}臥立`);
    }
  } else if (sectionSlug === "perspective") {
    // 透視圖：固定 207-212 × [variant]
    for (const q of ["207", "208", "209", "210", "211", "212"]) {
      codes.push(`${q}${variant}`);
    }
  } else if (sectionSlug === "detail") {
    // 大樣圖：213-224
    for (let i = 213; i <= 224; i++) {
      codes.push(`${i}`);
    }
  }

  return codes;
}

/**
 * 找出某個 sectionSlug + variant 的現有共用需求圖（若存在）。
 * 僅回傳「以共用 key 上傳」的記錄，忽略一般的練習圖。
 */
export function findSharedRequirementOverride(
  uploads: UploadEntry[],
  sectionSlug: string,
  variant: string,
): UploadEntry | null {
  const key = buildSharedRequirementKey({ sectionSlug, variant });
  return uploads.find(
    (u) => u.sheetCode === key && u.kind === "標記試卷",
  ) ?? null;
}

/**
 * 解析某個試卷題號應該顯示的需求圖 URL。
 *
 * 優先順序：
 * 1. KV 中有以 sectionSlug-variant key 上傳的共用需求圖 → 使用該圖
 * 2. 否則 fallback 至 /images/plan/requirement-{variant}.jpg（靜態圖）
 *
 * @returns { url, isOverride, is404 }
 */
export function resolveRequirementImageUrl(
  sectionSlug: string,
  itemCode: string,
  uploads: UploadEntry[],
): { url: string; isOverride: boolean; is404: boolean } {
  // 從 itemCode 推斷 variant
  // plan: 201A → A, 202B → B
  // ceiling-elevation: 201A天花 → A, 201A客立 → A
  const variant = extractVariant(itemCode);
  if (!variant) {
    return { url: "", isOverride: false, is404: true };
  }

  // 嘗試找共用覆寫圖
  const override = findSharedRequirementOverride(uploads, sectionSlug, variant);
  if (override) {
    const url = override.imageUrls?.[0] ?? override.imageUrl;
    return { url, isOverride: true, is404: false };
  }

  // Fallback 靜態圖
  const staticUrl = buildStaticRequirementUrl(sectionSlug, itemCode, variant);
  return { url: staticUrl, isOverride: false, is404: false };
}

/**
 * 從 itemCode 抽出字母版本。
 * "201A" → "A"
 * "201A天花" → "A"
 * "208乙" → "乙"
 */
function extractVariant(itemCode: string): string | null {
  // 匹配倒數第 1 或第 2 個字元是否為字母/中文版本
  const match = itemCode.match(/([A-Z]|[甲乙丙丁])$/);
  return match ? match[1] : null;
}

/**
 * 建立靜態需求圖 URL。
 *
 * 優先順序（由上而下）：
 * 1. 205 A-F 有專屬題目圖（question-205.jpg），優先使用
 * 2. 透視圖 207-212 共用 208 題目圖
 * 3. 大樣圖使用各題號資料夾
 * 4. 其餘平面圖使用共用 requirement-{variant}.jpg
 */
function buildStaticRequirementUrl(sectionSlug: string, itemCode: string, variant: string): string {
  if (sectionSlug === "plan") {
    // 205 A-F 專屬題目圖
    if (itemCode.startsWith("205") && /^[A-Z]$/.test(variant)) {
      return `/images/plan/question-205.jpg`;
    }
    return `/images/plan/requirement-${variant}.jpg`;
  }
  if (sectionSlug === "ceiling-elevation") {
    return `/images/plan/requirement-${variant}.jpg`;
  }
  if (sectionSlug === "detail") {
    // 大樣圖使用題號作為資料夾
    return `/images/${itemCode}/${itemCode}-answer.jpg`;
  }
  if (sectionSlug === "perspective") {
    return "/images/208/2021021722093353239 (2).jpg";
  }
  return "";
}

/**
 * 檢查某個上傳記錄是否為「共用需求圖」。
 */
export function isSharedRequirement(entry: UploadEntry): boolean {
  return parseSharedRequirementKey(entry.sheetCode) !== null;
}

/**
 * 取得共用需求圖的受影響範圍摘要（人類可讀）。
 */
export function getSharedRequirementSummary(key: SharedRequirementKey): {
  count: number;
  preview: string;
} {
  const codes = listAffectedSheetCodes(key.sectionSlug, key.variant);
  const preview = codes.slice(0, 3).join("、") + (codes.length > 3 ? "…" : "");
  return { count: codes.length, preview };
}
