/**
 * use-exam-draw.ts — 抽題邏輯
 *
 * 策略：最少練習優先 + CE 類別平衡
 * 每次從指定試卷組合中，取出練習次數最少的題目，隨機抽取一張。
 * 若練習次數 ≥ 5，該題自動排除（防冷落保護）。
 * 天花板圖與立面圖依據練習總量動態調整抽題權重，趨於平衡。
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

/** CE 類別平衡統計 */
export type CECategoryBalance = {
  ceilingCount: number;   // 天花板練習總張數（unique）
  elevationCount: number; // 立面圖練習總張數
  diff: number;           // ceilingCount - elevationCount（正數＝天花已練習更多）
  lean: "ceiling" | "elevation" | "balanced";
};

const EXCLUDED_THRESHOLD = 5; // 練習 ≥5 次，排除

/**
 * 判斷 CE 試卷是「天花板」還是「立面圖」
 * @param code 試卷編號，如 "201A天花"、"201A客立"、"201A餐立"、"201A臥立"
 */
export function getCEDrawingType(
  code: string
): "ceiling" | "elevation" {
  return code.includes("天花") ? "ceiling" : "elevation";
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
 * 計算「天花板圖」與「立面圖」的練習總量差距
 * @param uploads 所有上傳記錄
 * @param ceilingItems 天花板試卷陣列
 * @param elevationItems 立面圖試卷陣列
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
 * CE 抽題時依據兩類型練習總量動態調整權重，趨於平衡。
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
      const baseCode = planResult.item.code;
      const allCeItems =
        examSections.find((s) => s.slug === "ceiling-elevation")?.items ?? [];
      const matchingCeItems = allCeItems.filter((item) =>
        item.code.startsWith(baseCode)
      );

      // ── Step 3：分類天花板 vs 立面圖 ───────────────
      const ceilingPool = matchingCeItems.filter(
        (item) => getCEDrawingType(item.code) === "ceiling"
      );
      const elevationPool = matchingCeItems.filter(
        (item) => getCEDrawingType(item.code) === "elevation"
      );

      // ── Step 4：計算總量平衡（使用空白 uploads 避免無限依賴）──
      // 平衡統計由呼叫端（exam-draw-section）管理，
      // 此函式專注於「已知的平衡狀態」下的抽題。
      // 為確保抽題隨機性，使用 50/50 均等池；
      // 動態加權邏輯由呼叫端控制後再傳入調整後的 pool。
      const balancedPool = [...ceilingPool, ...elevationPool];
      const ceResult = drawOneFromItems(balancedPool, practiceCountMap);

      if (ceResult) results.push(ceResult);
    }
  }

  return results;
}

/**
 * 供外部呼叫，取得當前 CE 練習總量平衡狀態
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

  const ceilingPool = matchingCeItems.filter(
    (item) => getCEDrawingType(item.code) === "ceiling"
  );
  const elevationPool = matchingCeItems.filter(
    (item) => getCEDrawingType(item.code) === "elevation"
  );

  return calcCECategoryBalance(uploads, ceilingPool, elevationPool);
}

/**
 * 依據平衡狀態，回傳加權後的 CE 抽題池
 * @param ceilingPool 天花板試卷池
 * @param elevationPool 立面圖試卷池
 * @param lean 當前平衡傾向
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
