/**
 * use-exam-draw.ts — 抽題邏輯
 *
 * 策略：最少練習優先 + CE 類別平衡（v1.2 池級平衡版）
 *      + 透視圖方向感知抽題（v2 方向平衡版）
 *
 * - 平面圖：最少練習次數優先
 * - CE（天花板與立面圖）：
 *   1. 以「池」為單位計數（ceiling_total / elevation_total）
 *   2. 池內視角（客/餐/臥）均勻隨機，不影響下次加權
 *   3. 根據池級差距動態加權，趨於平衡
 * - 透視圖（v2）：
 *   1. 以「方向」（甲/乙/丙）為單位，以「圖片張數」計數
 *   2. 權重常數：一消點 1/3 : 二消點 2/3（考場實際比例 1:2）
 *   3. 先計算各方向 deficit，再在 deficit 最大的方向內抽最少練習試卷
 */

import { ArchiveItem } from "@/types/exam";
import { UPLOAD_KINDS } from "@/lib/upload-constants";
import { examSections } from "@/data/exam-content";
import { countPracticePerItem } from "@/lib/practice-stats";

/** 試卷組合區塊 slug */
export type DrawGroup = "plan-ceiling-elevation" | "perspective-detail";

/** 抽題結果 */
export type DrawResult = {
  item: ArchiveItem;
  practiceCount: number;
};

/** 擴展抽題結果（含方向抽題理由） */
export type ExtendedDrawResult = DrawResult & {
  directionReason?: string;
};

/** CE 類別平衡統計（池級） */
export type CECategoryBalance = {
  ceilingCount: number;   // 天花板池已練習張數
  elevationCount: number; // 立面池已練習張數
  diff: number;           // ceilingCount - elevationCount
  lean: "ceiling" | "elevation" | "balanced";
};

const EXCLUDED_THRESHOLD = 5; // 練習 ≥5 次，排除

// ═══════════════════════════════════════════════════════
// 透視圖方向分類器與權重常數（v2 新增）
// ═══════════════════════════════════════════════════════

/** 透視圖方向類型 */
export type PerspectiveDirection = "甲" | "乙" | "丙";

/** 透視圖方向消點類型 */
export type VPOccupancy = "1VP" | "2VP";

/**
 * 透視圖方向權重常數（常數鎖定，不可改為魔術數字）。
 * 一消點 : 二消點 = 1 : 2，即各方向均等 1/3。
 */
export const PERSPECTIVE_DIRECTION_WEIGHTS: Record<PerspectiveDirection, number> =
  {
    甲: 1 / 3, // 一消點
    乙: 1 / 3, // 二消點
    丙: 1 / 3, // 二消點
  };

/** 透視圖方向 → 消點類型 */
export const DIRECTION_VP_MAP: Record<PerspectiveDirection, VPOccupancy> = {
  甲: "1VP",
  乙: "2VP",
  丙: "2VP",
};

/** 消點類型 → 目標比例 */
export const VP_TARGET_RATIO: Record<VPOccupancy, number> = {
  "1VP": 1 / 3, // 占 1/3
  "2VP": 2 / 3, // 占 2/3
};

const PERSPECTIVE_DEADBAND = 0.005; // 0.5% 遲滯帶，防止來回震盪
const PERSPECTIVE_COMPLETION_THRESHOLD = 5; // 每張試卷最多練習次數
const ITEMS_PER_DIRECTION = 6; // 每個方向的試卷張數

/**
 * 從試卷 code 抽出透視方向（甲/乙/丙）。
 * "208甲" → "甲"
 * "212丙" → "丙"
 */
export function extractPerspectiveDirection(
  code: string
): PerspectiveDirection | null {
  const match = code.match(/[甲乙丙]$/);
  return (match ? match[0] : null) as PerspectiveDirection | null;
}

/** 透視圖方向平衡統計 */
export type PerspectiveBalance = {
  directionCounts: Record<PerspectiveDirection, number>; // 各方向練習張數
  totalCount: number; // 總練習張數
  directionShares: Record<PerspectiveDirection, number>; // 各方向佔比（小數）
  directionDeficits: Record<PerspectiveDirection, number>; // 各方向 deficit
  lean: PerspectiveDirection | "balanced"; // 當前傾向
  completedDirections: PerspectiveDirection[]; // 已練滿的方向
};

/**
 * 判斷 CE 試卷屬於「天花板池」還是「立面池」
 * v1.2：優先以 item.view 欄位判斷，向後相容以 code 字串 fallback
 */
export function getCEDrawingType(
  item: ArchiveItem
): "ceiling" | "elevation" {
  if (item.view) {
    return item.view.endsWith("天") ? "ceiling" : "elevation";
  }
  return item.code.includes("天花") ||
    item.code.includes("客天") ||
    item.code.includes("餐天") ||
    item.code.includes("臥天")
    ? "ceiling"
    : "elevation";
}

/**
 * 計算透視圖各方向的練習張數與 deficit
 * 統計口徑：imageUrls length（圖片張數）
 */
export function calcPerspectiveBalance(
  perspectiveItems: ArchiveItem[],
  uploads: import("@/types/exam").UploadEntry[]
): PerspectiveBalance {
  const directionImageMap: Record<PerspectiveDirection, number> = {
    甲: 0,
    乙: 0,
    丙: 0,
  };

  for (const item of perspectiveItems) {
    const dir = extractPerspectiveDirection(item.code);
    if (!dir) continue;

    const iCode = item.code.trim().toLowerCase();
    const count = uploads
      .filter((u) => {
        const uCode = u.sheetCode.replace(/[\s\-_]/g, "").toLowerCase();
        const cleanI = iCode.replace(/[\s\-_]/g, "").toLowerCase();
        return (
          (uCode === cleanI || uCode.includes(cleanI)) &&
          u.kind === UPLOAD_KINDS.MY_PRACTICE
        );
      })
      .reduce(
        (sum, u) => sum + (u.imageUrls?.length ?? (u.imageUrl ? 1 : 0)),
        0
      );

    directionImageMap[dir] += count;
  }

  const totalCount =
    directionImageMap.甲 + directionImageMap.乙 + directionImageMap.丙;

  const directionShares: Record<PerspectiveDirection, number> = {
    甲: totalCount > 0 ? directionImageMap.甲 / totalCount : 1 / 3,
    乙: totalCount > 0 ? directionImageMap.乙 / totalCount : 1 / 3,
    丙: totalCount > 0 ? directionImageMap.丙 / totalCount : 1 / 3,
  };

  const directionDeficits: Record<PerspectiveDirection, number> = {
    甲: 1 / 3 - directionShares.甲,
    乙: 1 / 3 - directionShares.乙,
    丙: 1 / 3 - directionShares.丙,
  };

  // 已練滿的方向（≥ 每方向練習總量上限）
  const completedDirections = (
    ["甲", "乙", "丙"] as PerspectiveDirection[]
  ).filter(
    (d) =>
      directionImageMap[d] >=
      PERSPECTIVE_COMPLETION_THRESHOLD * ITEMS_PER_DIRECTION
  );

  // 活躍候選方向：deficit > DEADBAND 且未完成
  const activeDirections = (
    ["甲", "乙", "丙"] as PerspectiveDirection[]
  ).filter(
    (d) =>
      !completedDirections.includes(d) &&
      directionDeficits[d] > PERSPECTIVE_DEADBAND
  );

  let lean: PerspectiveDirection | "balanced" = "balanced";
  if (activeDirections.length > 0) {
    activeDirections.sort((a, b) => {
      const diff = directionDeficits[b] - directionDeficits[a];
      if (Math.abs(diff) < 0.001) {
        const order: Record<PerspectiveDirection, number> = {
          甲: 0,
          乙: 1,
          丙: 2,
        };
        return order[a] - order[b];
      }
      return diff;
    });
    lean = activeDirections[0];
  }

  return {
    directionCounts: directionImageMap,
    totalCount,
    directionShares,
    directionDeficits,
    lean,
    completedDirections,
  };
}

/**
 * 計算「天花板池」與「立面池」的練習總量差距
 * @param uploads 所有上傳記錄
 * @param ceilingItems 天花板試卷池
 * @param elevationItems 立面試卷池
 */
export function calcCECategoryBalance(
  uploads: import("@/types/exam").UploadEntry[],
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
 * v2：透視圖改為方向感知抽題（兩層：先算方向 deficit，再在方向內抽題）
 */
export function drawExamGroup(
  group: DrawGroup,
  practiceCountMap: Record<string, number>
): ExtendedDrawResult[] {
  const results: ExtendedDrawResult[] = [];

  if (group === "perspective-detail") {
    const perspectiveItems =
      examSections.find((s) => s.slug === "perspective")?.items ?? [];

    // ── Layer 1：計算各方向 deficit ───────────────
    const directionCounts: Record<PerspectiveDirection, number> = {
      甲: 0,
      乙: 0,
      丙: 0,
    };
    for (const item of perspectiveItems) {
      const dir = extractPerspectiveDirection(item.code);
      if (dir) {
        directionCounts[dir] += practiceCountMap[item.code] ?? 0;
      }
    }
    const totalPerspectiveCount =
      directionCounts.甲 + directionCounts.乙 + directionCounts.丙;

    // 計算 deficit（目標 1/3 − 實際佔比）
    const directionDeficits: Record<PerspectiveDirection, number> = {
      甲:
        1 / 3 -
        (totalPerspectiveCount > 0
          ? directionCounts.甲 / totalPerspectiveCount
          : 1 / 3),
      乙:
        1 / 3 -
        (totalPerspectiveCount > 0
          ? directionCounts.乙 / totalPerspectiveCount
          : 1 / 3),
      丙:
        1 / 3 -
        (totalPerspectiveCount > 0
          ? directionCounts.丙 / totalPerspectiveCount
          : 1 / 3),
    };

    // 已完成方向（6 題 × 5 次 = 30 張）
    const completedDirections = (
      ["甲", "乙", "丙"] as PerspectiveDirection[]
    ).filter(
      (d) =>
        directionCounts[d] >=
        PERSPECTIVE_COMPLETION_THRESHOLD * ITEMS_PER_DIRECTION
    );

    // 活躍候選方向
    const activeDirections = (
      ["甲", "乙", "丙"] as PerspectiveDirection[]
    ).filter(
      (d) =>
        !completedDirections.includes(d) &&
        directionDeficits[d] > PERSPECTIVE_DEADBAND
    );

    // 決定抽題方向：取 deficit 最大者，平手時依 甲→乙→丙 教學序
    let targetDirection: PerspectiveDirection | null = null;
    if (activeDirections.length > 0) {
      activeDirections.sort((a, b) => {
        const diff = directionDeficits[b] - directionDeficits[a];
        if (Math.abs(diff) < 0.001) {
          const order: Record<PerspectiveDirection, number> = {
            甲: 0,
            乙: 1,
            丙: 2,
          };
          return order[a] - order[b];
        }
        return diff;
      });
      targetDirection = activeDirections[0];
    }

    // ── Layer 2：在目標方向內抽最少練習的試卷 ──────
    const pool = targetDirection
      ? perspectiveItems.filter(
          (item) => extractPerspectiveDirection(item.code) === targetDirection
        )
      : perspectiveItems;

    const pResult = drawOneFromItems(pool, practiceCountMap);
    if (pResult) {
      const targetCount = Math.round(totalPerspectiveCount / 3);
      results.push({
        ...pResult,
        directionReason: targetDirection
          ? `${targetDirection}向落後（已練 ${directionCounts[targetDirection]} 張，目標 ${targetCount} 張）`
          : "各向均衡，隨機抽取",
      });
    }

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

      // ── Step 3：以 view 欄位分類天花板池 vs 立面池 ──
      const ceilingPool = matchingCeItems.filter(
        (item) => getCEDrawingType(item) === "ceiling"
      );
      const elevationPool = matchingCeItems.filter(
        (item) => getCEDrawingType(item) === "elevation"
      );

      // ── Step 4：建構加權池（池級平衡）───────────────
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
  uploads: import("@/types/exam").UploadEntry[],
  baseCode: string
): CECategoryBalance {
  const allCeItems =
    examSections.find((s) => s.slug === "ceiling-elevation")?.items ?? [];
  const matchingCeItems = allCeItems.filter((item) =>
    item.code.startsWith(baseCode)
  );

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
 */
export function buildWeightedCEPool(
  ceilingPool: ArchiveItem[],
  elevationPool: ArchiveItem[],
  lean: CECategoryBalance["lean"]
): ArchiveItem[] {
  if (lean === "elevation") {
    return [
      ...elevationPool,
      ...elevationPool,
      ...elevationPool,
      ...elevationPool,
      ...ceilingPool,
    ];
  } else if (lean === "ceiling") {
    return [
      ...ceilingPool,
      ...ceilingPool,
      ...ceilingPool,
      ...ceilingPool,
      ...elevationPool,
    ];
  }
  return [...ceilingPool, ...elevationPool];
}
