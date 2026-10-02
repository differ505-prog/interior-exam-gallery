/**
 * use-exam-draw.ts — 抽題邏輯
 *
 * 策略：最少練習優先 + CE 類別平衡（v1.2 池級平衡版）
 *
 * - 平面圖：最少練習次數優先
 * - CE（天花板與立面圖）：
 *   1. 以「池」為單位計數（ceiling_total / elevation_total）
 *   2. 池內視角（客/餐/臥）均勻隨機，不影響下次加權
 *   3. 根據池級差距動態加權，趨於平衡
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

/** CE 類別平衡統計（池級） */
export type CECategoryBalance = {
  ceilingCount: number;   // 天花板池已練習張數
  elevationCount: number; // 立面池已練習張數
  diff: number;           // ceilingCount - elevationCount
  lean: "ceiling" | "elevation" | "balanced";
};

const EXCLUDED_THRESHOLD = 5; // 練習 ≥5 次，排除

/**
 * 判斷 CE 試卷屬於「天花板池」還是「立面池」
 * v1.2：優先以 item.view 欄位判斷，向後相容以 code 字串 fallback
 */
export function getCEDrawingType(
  item: ArchiveItem
): "ceiling" | "elevation" {
  // 優先用 view 欄位
  if (item.view) {
    return item.view.endsWith("天") ? "ceiling" : "elevation";
  }
  // 向後相容：fallback 以 code 字串判斷
  return item.code.includes("天花") ||
         item.code.includes("客天") ||
         item.code.includes("餐天") ||
         item.code.includes("臥天")
    ? "ceiling"
    : "elevation";
}

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
 * 計算「天花板池」與「立面池」的練習總量差距
 * @param uploads 所有上傳記錄
 * @param ceilingItems 天花板試卷池（v1.2 由 getCEDrawingType(item) === "ceiling" 識別）
 * @param elevationItems 立面試卷池（v1.2 由 getCEDrawingType(item) === "elevation" 識別）
 */
export function calcCECategoryBalance(
  uploads: UploadEntry[],
  ceilingItems: ArchiveItem[],
  elevationItems: ArchiveItem[]
): CECategoryBalance {
  const ceilingCodes = new Set(ceilingItems.map((i) => i.code));
  const elevationCodes = new Set(elevationItems.map((i) => i.code));

  // unique sheetCode 去重計算已練習張數
  const ceilingUploaded = new Set(
    uploads
      .filter(
        (u) =>
          ceilingCodes.has(u.sheetCode) &&
          u.kind === UPLOAD_KINDS.MY_PRACTICE
      )
      .map((u) => u.sheetCode)
  ).size;

  const elevationUploaded = new Set(
    uploads
      .filter(
        (u) =>
          elevationCodes.has(u.sheetCode) &&
          u.kind === UPLOAD_KINDS.MY_PRACTICE
      )
      .map((u) => u.sheetCode)
  ).size;

  const diff = ceilingUploaded - elevationUploaded;

  let lean: CECategoryBalance["lean"] = "balanced";
  if (diff > 2) lean = "ceiling";
  else if (diff < -2) lean = "elevation";

  return {
    ceilingCount: ceilingUploaded,
    elevationCount: elevationUploaded,
    diff,
    lean,
  };
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

  const minCount = Math.min(
    ...eligible.map((item) => practiceCountMap[item.code] ?? 0)
  );
  const leastPracticed = eligible.filter(
    (item) => (practiceCountMap[item.code] ?? 0) === minCount
  );

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
 * v1.2：CE 抽題以「池」為單位加權，池內視角均勻隨機
 */
export function drawExamGroup(
  group: DrawGroup,
  practiceCountMap: Record<string, number>
): DrawResult[] {
  const results: DrawResult[] = [];

  if (group === "perspective-detail") {
    const perspectiveItems =
      examSections.find((s) => s.slug === "perspective")?.items ?? [];
    const pResult = drawOneFromItems(perspectiveItems, practiceCountMap);
    if (pResult) results.push(pResult);

    const detailItems =
      examSections.find((s) => s.slug === "detail")?.items ?? [];
    const dResult = drawOneFromItems(detailItems, practiceCountMap);
    if (dResult) results.push(dResult);
  } else if (group === "plan-ceiling-elevation") {
    // ── Step 1：抽平面圖 ──────────────────────────────
    const planItems = examSections.find((s) => s.slug === "plan")?.items ?? [];
    const planResult = drawOneFromItems(planItems, practiceCountMap);

    if (planResult) {
      results.push(planResult);

      // ── Step 2：取同題號的 CE 試卷 ─────────────────
      // v1.2：以 baseCode（如 "201"）取同題號試卷
      const baseCode = planResult.item.code;
      const allCeItems =
        examSections.find((s) => s.slug === "ceiling-elevation")?.items ?? [];
      const matchingCeItems = allCeItems.filter((item) =>
        item.code.startsWith(baseCode)
      );

      // ── Step 3：以 view 欄位分類天花板池 vs 立面池 ──
      const ceilingPool = matchingCeItems.filter(
        (item) => getCEDrawingType(item) === "ceiling"
      );
      const elevationPool = matchingCeItems.filter(
        (item) => getCEDrawingType(item) === "elevation"
      );

      // ── Step 4：建構加權池（池級平衡）───────────────
      // 平衡邏輯由呼叫端（exam-draw-section.tsx）傳入 lean，
      // 此函式僅組合候選池，隨機抽樣由 drawOneFromItems 處理
      const balancedPool = [...ceilingPool, ...elevationPool];
      const ceResult = drawOneFromItems(balancedPool, practiceCountMap);

      if (ceResult) results.push(ceResult);
    }
  }

  return results;
}

/**
 * 供外部呼叫，取得當前 CE 練習總量平衡狀態（池級）
 * @param uploads 所有上傳記錄
 * @param baseCode 平面圖 baseCode（如 "201"），限定只計算同題號的 CE
 */
export function getCurrentCEBalance(
  uploads: UploadEntry[],
  baseCode: string
): CECategoryBalance {
  const allCeItems =
    examSections.find((s) => s.slug === "ceiling-elevation")?.items ?? [];
  const matchingCeItems = allCeItems.filter((item) =>
    item.code.startsWith(baseCode)
  );

  // v1.2：以 getCEDrawingType(item) 分類，而非 code 字串
  const ceilingPool = matchingCeItems.filter(
    (item) => getCEDrawingType(item) === "ceiling"
  );
  const elevationPool = matchingCeItems.filter(
    (item) => getCEDrawingType(item) === "elevation"
  );

  return calcCECategoryBalance(uploads, ceilingPool, elevationPool);
}

/**
 * 依據池級平衡狀態，回傳加權後的 CE 抽題池
 * @param ceilingPool 天花板試卷池
 * @param elevationPool 立面試卷池
 * @param lean 當前池級平衡傾向
 */
export function buildWeightedCEPool(
  ceilingPool: ArchiveItem[],
  elevationPool: ArchiveItem[],
  lean: CECategoryBalance["lean"]
): ArchiveItem[] {
  if (lean === "elevation") {
    // 立面已練習更少 → 80% 抽立面、20% 抽天花
    return [
      ...elevationPool,
      ...elevationPool,
      ...elevationPool,
      ...elevationPool,
      ...ceilingPool,
    ];
  } else if (lean === "ceiling") {
    // 天花已練習更少 → 80% 抽天花、20% 抽立面
    return [
      ...ceilingPool,
      ...ceilingPool,
      ...ceilingPool,
      ...ceilingPool,
      ...elevationPool,
    ];
  }
  // balanced → 50/50
  return [...ceilingPool, ...elevationPool];
}
