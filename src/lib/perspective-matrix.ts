/**
 * perspective-matrix.ts
 *
 * 透視圖空間格局與消點雙層矩陣抽題（Perspective Matrix Draw）單一事實來源。
 *
 * 設計背景（UI/UX 總監 9.5+ 方案）：
 * 透視圖試卷（perspective）包含 6 個空間格局大題（207–212）與 3 個消點方向（甲/乙/丙），共 18 張。
 * 舊版抽題僅以「方向維度（甲/乙/丙）」進行 deficit 平衡，對 207–212 空間格局熟悉度完全盲目。
 *
 * 本模組提供：
 * 1. 207–212 基礎題號提取與驗證
 * 2. 跨方向（甲+乙+丙）題號總練習次數統計
 * 3. 候選題號選擇（最少練習優先 + 最近練習冷卻避讓）
 *
 * 純邏輯層：不得 import React / KV / Cloudinary / Supabase。
 */

import type { ArchiveItem } from "@/types/exam";

/** 透視圖 6 大空間格局題號清單（207–212） */
export const PERSPECTIVE_BASE_QUESTIONS = [
  "207",
  "208",
  "209",
  "210",
  "211",
  "212",
] as const;

export type PerspectiveBaseQuestion =
  (typeof PERSPECTIVE_BASE_QUESTIONS)[number];

/**
 * 從試卷 code 抽出透視圖 3 位數大題號。
 * "208甲" → "208"
 * "212丙" → "212"
 * "201A" → null（非 207–212 透視題號）
 */
export function extractPerspectiveBaseQuestion(
  code: string
): PerspectiveBaseQuestion | null {
  const match = code.match(/^(20[7-9]|21[0-2])/);
  if (!match) return null;
  const num = match[1];
  return (PERSPECTIVE_BASE_QUESTIONS as readonly string[]).includes(num)
    ? (num as PerspectiveBaseQuestion)
    : null;
}

/**
 * 統計 207–212 各大題號的總練習張數（跨甲、乙、丙方向全數加總）
 */
export function calcPerspectiveBaseQuestionCounts(
  perspectiveItems: ArchiveItem[],
  practiceCountMap: Record<string, number>
): Record<PerspectiveBaseQuestion, number> {
  const counts: Record<PerspectiveBaseQuestion, number> = {
    "207": 0,
    "208": 0,
    "209": 0,
    "210": 0,
    "211": 0,
    "212": 0,
  };

  for (const item of perspectiveItems) {
    const base = extractPerspectiveBaseQuestion(item.code);
    if (!base) continue;
    counts[base] += practiceCountMap[item.code] ?? 0;
  }

  return counts;
}

/**
 * 依據練習次數選出合格的候選大題號（最少練習優先，並可避開最近練習過的題號）
 *
 * @param baseCounts 各題號累積練習次數
 * @param recentBase 最近練習過的大題號（若同次數平手，優先避開以達到冷卻防重複）
 */
export function selectEligiblePerspectiveBaseQuestions(
  baseCounts: Record<PerspectiveBaseQuestion, number>,
  recentBase?: PerspectiveBaseQuestion | null
): PerspectiveBaseQuestion[] {
  const entries = Object.entries(baseCounts) as [
    PerspectiveBaseQuestion,
    number
  ][];
  if (entries.length === 0) return [...PERSPECTIVE_BASE_QUESTIONS];

  const minCount = Math.min(...entries.map(([, count]) => count));
  const minCandidates = entries
    .filter(([, count]) => count === minCount)
    .map(([q]) => q);

  // 若有多個最少練習題號平手，且最近練習過的題號也在其中，則將其冷卻剔除
  if (
    minCandidates.length > 1 &&
    recentBase &&
    minCandidates.includes(recentBase)
  ) {
    return minCandidates.filter((q) => q !== recentBase);
  }

  return minCandidates;
}
