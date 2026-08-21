/**
 * use-exam-draw.ts — 抽題邏輯
 *
 * 策略：最少練習優先
 * 每次從指定試卷組合中，取出練習次數最少的題目，隨機抽取一張。
 * 若練習次數 ≥ 5，該題自動排除（防冷落保護）。
 */

import { ArchiveItem, UploadEntry } from "@/types/exam";
import { UPLOAD_KINDS } from "@/lib/upload-constants";
import { examSections } from "@/data/exam-content";

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
    const iCode = item.code.trim().toLowerCase();
    map[item.code] = uploads.filter((u) => {
      const uCode = u.sheetCode.replace(/[\s\-_]/g, "").toLowerCase();
      const cleanI = iCode.replace(/[\s\-_]/g, "").toLowerCase();
      const isMatch = uCode === cleanI || uCode.includes(cleanI);
      return isMatch && u.kind === UPLOAD_KINDS.MY_PRACTICE;
    }).length;
  }
  return map;
}

/**
 * 從指定分類中抽出一題（最少練習優先）
 */
function drawOneFromItems(
  items: ArchiveItem[],
  practiceCountMap: Record<string, number>
): DrawResult | null {
  const eligible = items.filter(
    (item) => (practiceCountMap[item.code] ?? 0) < EXCLUDED_THRESHOLD
  );

  if (eligible.length === 0) return null;

  const minCount = Math.min(...eligible.map(item => practiceCountMap[item.code] ?? 0));
  const leastPracticed = eligible.filter(item => (practiceCountMap[item.code] ?? 0) === minCount);

  const shuffled = [...leastPracticed];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const picked = shuffled[0];
  return {
    item: picked,
    practiceCount: minCount,
  };
}

/**
 * 依據抽題組合抽出對應的題目陣列
 */
export function drawExamGroup(
  group: DrawGroup,
  practiceCountMap: Record<string, number>
): DrawResult[] {
  const results: DrawResult[] = [];
  
  if (group === "perspective-detail") {
    const perspectiveItems = examSections.find(s => s.slug === "perspective")?.items ?? [];
    const pResult = drawOneFromItems(perspectiveItems, practiceCountMap);
    if (pResult) results.push(pResult);
    
    const detailItems = examSections.find(s => s.slug === "detail")?.items ?? [];
    const dResult = drawOneFromItems(detailItems, practiceCountMap);
    if (dResult) results.push(dResult);
  } else if (group === "plan-ceiling-elevation") {
    // 先抽平面圖
    const planItems = examSections.find(s => s.slug === "plan")?.items ?? [];
    const planResult = drawOneFromItems(planItems, practiceCountMap);
    
    if (planResult) {
      results.push(planResult);
      // 再抽同題號的天花/立面圖 (例如 201 -> 201A, 201B)
      const baseCode = planResult.item.code; // e.g., "201"
      const ceItems = examSections.find(s => s.slug === "ceiling-elevation")?.items ?? [];
      const matchingCeItems = ceItems.filter(item => item.code.startsWith(baseCode));
      
      const ceResult = drawOneFromItems(matchingCeItems, practiceCountMap);
      if (ceResult) results.push(ceResult);
    }
  }
  
  return results;
}
