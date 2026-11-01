/**
 * plan-variant.ts
 *
 * 平面圖版本感知平衡（方案 A）單一事實來源（Single Source of Truth）。
 *
 * 設計背景：
 * 平面圖試卷（plan）分為 A~F 六種需求單版本，每版本 6 題（201–206）。
 * 舊邏輯只按「整題練習次數」抽題，A~F 字母不進計算，
 * 導致 201A 練十次、201F 零次仍被判定為均衡。
 *
 * 本模組照抄透視圖「方向感知抽題」（use-exam-draw.ts 的 calcPerspectiveBalance）
 * 的數學模型，把「三方向 × 1/3」換成「六版本 × 1/6」：
 * - Layer 1：計算各版本 deficit（目標佔比 − 實際佔比）
 * - Layer 2：在 deficit 最大的版本內抽最少練習的試卷
 *
 * 純邏輯層：不得 import React / KV / Cloudinary / Supabase。
 */

import type { ArchiveItem } from "@/types/exam";

/** 平面圖需求單版本類型 */
export type PlanVariant = "A" | "B" | "C" | "D" | "E" | "F";

/** 六版本清單（教學序 A→F） */
export const PLAN_VARIANTS: readonly PlanVariant[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
] as const;

/**
 * 版本權重常數（常數鎖定，不可改為魔術數字）。
 * 六版本需求單均等，各佔 1/6。
 */
export const PLAN_VARIANT_WEIGHTS: Record<PlanVariant, number> = {
  A: 1 / 6,
  B: 1 / 6,
  C: 1 / 6,
  D: 1 / 6,
  E: 1 / 6,
  F: 1 / 6,
};

/** 0.5% 遲滯帶，防止各版本來回震盪 */
export const VARIANT_DEADBAND = 0.005;

/** 單張試卷練習次數排除線（≥5 次排除） */
export const VARIANT_COMPLETION_THRESHOLD = 5;

/** 每版本試卷張數（201–206） */
export const ITEMS_PER_VARIANT = 6;

/** 平手時的教學序 */
export const VARIANT_ORDER: Record<PlanVariant, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
};

/** 平面圖 6 大空間題號清單（201–206） */
export const PLAN_BASE_QUESTIONS = [
  "201",
  "202",
  "203",
  "204",
  "205",
  "206",
] as const;

export type PlanBaseQuestion = (typeof PLAN_BASE_QUESTIONS)[number];

/**
 * 從試卷 code 抽出平面圖 3 位數大題號。
 * "201A" → "201"
 * "205C" → "205"
 * "201A客天" → "201"
 * "208甲" → null（非 201–206 平面題號）
 */
export function extractBaseQuestion(code: string): PlanBaseQuestion | null {
  const match = code.match(/^(\d{3})/);
  if (!match) return null;
  const num = match[1];
  return (PLAN_BASE_QUESTIONS as readonly string[]).includes(num)
    ? (num as PlanBaseQuestion)
    : null;
}

/**
 * 統計 201–206 各大題號的總練習張數（跨 A~F 版本加總）
 */
export function calcPlanBaseQuestionCounts(
  planItems: ArchiveItem[],
  practiceCountMap: Record<string, number>
): Record<PlanBaseQuestion, number> {
  const counts: Record<PlanBaseQuestion, number> = {
    "201": 0,
    "202": 0,
    "203": 0,
    "204": 0,
    "205": 0,
    "206": 0,
  };

  for (const item of planItems) {
    const base = extractBaseQuestion(item.code);
    if (base) {
      counts[base] += practiceCountMap[item.code] ?? 0;
    }
  }

  return counts;
}

/**
 * 挑選候選大題號池（最少練習優先，並支援最近大題避讓）
 */
export function selectEligibleBaseQuestions(
  baseCounts: Record<PlanBaseQuestion, number>,
  recentBase?: PlanBaseQuestion | null
): PlanBaseQuestion[] {
  const minCount = Math.min(...Object.values(baseCounts));
  const least = PLAN_BASE_QUESTIONS.filter((q) => baseCounts[q] === minCount);

  // 若有多個最少題號，且最近剛練過其中一個，優先避讓該最近題號（避免連續兩次同空間格局）
  if (least.length > 1 && recentBase && least.includes(recentBase)) {
    return least.filter((q) => q !== recentBase);
  }

  return least;
}

/**
 * 從試卷 code 抽出平面圖版本。
 * "201A" → "A"
 * "201A客天" → "A"（CE 試卷同規則，方便跨區統計）
 * "208甲" → null（非 A~F 字母版本）
 */
export function extractPlanVariant(code: string): PlanVariant | null {
  const match = code.match(/^\d{3}([A-F])(?![A-Z])/);
  return (match ? match[1] : null) as PlanVariant | null;
}

/** 平面圖版本平衡統計 */
export type PlanVariantBalance = {
  variantCounts: Record<PlanVariant, number>; // 各版本練習張數
  totalCount: number; // 總練習張數
  variantShares: Record<PlanVariant, number>; // 各版本佔比（小數）
  variantDeficits: Record<PlanVariant, number>; // 各版本 deficit
  lean: PlanVariant | "balanced"; // 當前傾向（下一題優先）
  completedVariants: PlanVariant[]; // 已練滿的版本
};

/** 建立全 0 的版本計數表 */
function emptyVariantCounts(): Record<PlanVariant, number> {
  return { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
}

/**
 * 計算各版本練習張數與 deficit。
 * 統計口徑：與 countPracticePerItem 一致（圖片張數，非去重題數）。
 *
 * @param planItems 平面圖試卷池（slug === "plan" 的 items）
 * @param practiceCountMap `countPracticePerItem(allItems, uploads)` 的結果
 */
export function calcVariantBalance(
  planItems: ArchiveItem[],
  practiceCountMap: Record<string, number>
): PlanVariantBalance {
  const variantCounts = emptyVariantCounts();

  for (const item of planItems) {
    const variant = extractPlanVariant(item.code);
    if (!variant) continue;
    variantCounts[variant] += practiceCountMap[item.code] ?? 0;
  }

  const totalCount =
    variantCounts.A +
    variantCounts.B +
    variantCounts.C +
    variantCounts.D +
    variantCounts.E +
    variantCounts.F;

  const variantShares: Record<PlanVariant, number> = {
    A: totalCount > 0 ? variantCounts.A / totalCount : 1 / 6,
    B: totalCount > 0 ? variantCounts.B / totalCount : 1 / 6,
    C: totalCount > 0 ? variantCounts.C / totalCount : 1 / 6,
    D: totalCount > 0 ? variantCounts.D / totalCount : 1 / 6,
    E: totalCount > 0 ? variantCounts.E / totalCount : 1 / 6,
    F: totalCount > 0 ? variantCounts.F / totalCount : 1 / 6,
  };

  const variantDeficits: Record<PlanVariant, number> = {
    A: 1 / 6 - variantShares.A,
    B: 1 / 6 - variantShares.B,
    C: 1 / 6 - variantShares.C,
    D: 1 / 6 - variantShares.D,
    E: 1 / 6 - variantShares.E,
    F: 1 / 6 - variantShares.F,
  };

  // 已練滿的版本（6 題 × 5 次 = 30 張）
  const completedVariants = PLAN_VARIANTS.filter(
    (v) =>
      variantCounts[v] >=
      VARIANT_COMPLETION_THRESHOLD * ITEMS_PER_VARIANT
  );

  // 活躍候選版本：deficit > DEADBAND 且未完成
  const activeVariants = PLAN_VARIANTS.filter(
    (v) =>
      !completedVariants.includes(v) && variantDeficits[v] > VARIANT_DEADBAND
  );

  let lean: PlanVariant | "balanced" = "balanced";
  if (activeVariants.length > 0) {
    const sorted = [...activeVariants].sort((a, b) => {
      const diff = variantDeficits[b] - variantDeficits[a];
      if (Math.abs(diff) < 0.001) {
        return VARIANT_ORDER[a] - VARIANT_ORDER[b];
      }
      return diff;
    });
    lean = sorted[0];
  }

  return {
    variantCounts,
    totalCount,
    variantShares,
    variantDeficits,
    lean,
    completedVariants,
  };
}
