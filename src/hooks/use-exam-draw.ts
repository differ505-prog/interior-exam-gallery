/**
 * use-exam-draw.ts — 抽題邏輯
 *
 * 策略：最少練習優先
 * 每次從指定試卷組合中，取出練習次數最少的題目，隨機抽取一張。
 * 若練習次數 ≥ 5，該題自動排除（防冷落保護）。
 */

import { ArchiveItem, UploadEntry } from "@/types/exam";
import { UPLOAD_KINDS } from "@/lib/upload-constants";

/** 試卷組合區塊 slug */
export type DrawGroup = "plan-ceiling-elevation" | "perspective-detail";

/** 抽題結果 */
export type DrawResult = {
  item: ArchiveItem;
  practiceCount: number;
};

const EXCLUDED_THRESHOLD = 5; // 練習 ≥5 次，排除

/**
 * 統計每題的「我的練習圖」上傳次數
 */
export function countPracticePerItem(
  items: ArchiveItem[],
  uploads: UploadEntry[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) {
    map[item.code] = uploads.filter(
      (u) => u.sheetCode === item.code && u.kind === UPLOAD_KINDS.MY_PRACTICE
    ).length;
  }
  return map;
}

/**
 * 從最少練習池中隨機抽取一題
 * Fisher-Yates 洗牌後取第一個
 */
export function drawExam(
  items: ArchiveItem[],
  practiceCountMap: Record<string, number>
): DrawResult | null {
  // 過濾：排除練習 ≥5 次的題目
  const eligible = items.filter(
    (item) => (practiceCountMap[item.code] ?? 0) < EXCLUDED_THRESHOLD
  );

  if (eligible.length === 0) return null;

  // Fisher-Yates 洗牌
  const shuffled = [...eligible];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const picked = shuffled[0];
  return {
    item: picked,
    practiceCount: practiceCountMap[picked.code] ?? 0,
  };
}
