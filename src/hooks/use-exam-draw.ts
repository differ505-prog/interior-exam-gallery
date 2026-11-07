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
import {
  calcVariantBalance,
  extractPlanVariant,
  extractBaseQuestion,
  calcPlanBaseQuestionCounts,
  selectEligibleBaseQuestions,
} from "@/lib/plan-variant";
import {
  extractPerspectiveBaseQuestion,
  calcPerspectiveBaseQuestionCounts,
  selectEligiblePerspectiveBaseQuestions,
} from "@/lib/perspective-matrix";
import { selectBestCEItem } from "@/lib/ce-matrix";

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
          uCode === cleanI &&
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

/** 透視圖備考專攻模式 */
export type PerspectiveFocusMode = "auto" | "1vp" | "2vp";

export interface DrawExamOptions {
  perspectiveFocusMode?: PerspectiveFocusMode;
  uploads?: import("@/types/exam").UploadEntry[];
}

/**
 * 依據抽題組合抽出對應的題目陣列
 * v2：透視圖改為方向感知抽題（兩層：先算方向 deficit，再在方向內抽題）
 * v3：支援消點專攻模式（auto 考場均衡 1:2 / 1vp 一消特訓 / 2vp 二消特訓）
 */
export function drawExamGroup(
  group: DrawGroup,
  practiceCountMap: Record<string, number>,
  options?: DrawExamOptions
): ExtendedDrawResult[] {
  const results: ExtendedDrawResult[] = [];

  if (group === "perspective-detail") {
    const perspectiveItems =
      examSections.find((s) => s.slug === "perspective")?.items ?? [];
    const focusMode = options?.perspectiveFocusMode ?? "auto";

    // ── 空間與消點雙層矩陣抽題（Perspective Matrix Draw）──────
    // 統計各大題號（207–212 空間格局）全方向總練習張數
    const baseCounts = calcPerspectiveBaseQuestionCounts(
      perspectiveItems,
      practiceCountMap
    );

    // 取得最近練習過的透視題號（用於同頻平手時避讓）
    const recentUpload = options?.uploads?.find(
      (u) =>
        u.kind === UPLOAD_KINDS.MY_PRACTICE &&
        (u.sectionSlug === "perspective" || !u.sectionSlug) &&
        /^(20[7-9]|21[0-2])/.test(u.sheetCode)
    );
    const recentBase = recentUpload
      ? extractPerspectiveBaseQuestion(recentUpload.sheetCode)
      : null;

    const eligibleBaseQuestions = selectEligiblePerspectiveBaseQuestions(
      baseCounts,
      recentBase
    );

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

    // 決定抽題方向
    let targetDirection: PerspectiveDirection | null = null;
    if (focusMode === "1vp") {
      targetDirection = "甲";
    } else if (focusMode === "2vp") {
      // 二消模式：在 乙、丙 中挑選 deficit 較大或未練滿者
      const twoVpCandidates = (["乙", "丙"] as PerspectiveDirection[]).filter(
        (d) => !completedDirections.includes(d)
      );
      const candidates = twoVpCandidates.length > 0 ? twoVpCandidates : (["乙", "丙"] as PerspectiveDirection[]);
      candidates.sort((a, b) => {
        const diff = directionDeficits[b] - directionDeficits[a];
        if (Math.abs(diff) < 0.001) {
          return (directionCounts[a] ?? 0) - (directionCounts[b] ?? 0);
        }
        return diff;
      });
      targetDirection = candidates[0];
    } else if (activeDirections.length > 0) {
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
    } else {
      // 各向完全平手（如開局或甲、乙、丙張數均等）：依教學序強制優先由甲起步
      const uncompleted = (["甲", "乙", "丙"] as PerspectiveDirection[]).filter(
        (d) => !completedDirections.includes(d)
      );
      targetDirection = uncompleted.length > 0 ? uncompleted[0] : "甲";
    }

    // ── Layer 2：在目標方向內，優先過濾出生疏題號（空間格局平衡） ──────
    const directionPool = targetDirection
      ? perspectiveItems.filter(
          (item) => extractPerspectiveDirection(item.code) === targetDirection
        )
      : perspectiveItems;

    // 優先挑選落在最生疏題號（eligibleBaseQuestions）內的試卷
    const spacePrioritizedPool = directionPool.filter((item) => {
      const base = extractPerspectiveBaseQuestion(item.code);
      return base ? eligibleBaseQuestions.includes(base) : true;
    });

    const finalPool =
      spacePrioritizedPool.length > 0 ? spacePrioritizedPool : directionPool;

    const pResult = drawOneFromItems(finalPool, practiceCountMap);
    if (pResult) {
      const pickedBase = extractPerspectiveBaseQuestion(pResult.item.code);
      const pickedBaseCount = pickedBase ? baseCounts[pickedBase] : 0;
      const baseInfo = pickedBase
        ? ` · 優先補強生疏題號 ${pickedBase}（全向已練 ${pickedBaseCount} 次）`
        : "";

      let reason = `🎯 各向均衡 · 優先由甲向起步${baseInfo}`;
      if (focusMode === "1vp") {
        reason = `🎯 一消特訓：鎖定甲向（1VP 基礎功，已練 ${directionCounts.甲} 張）${baseInfo}`;
      } else if (focusMode === "2vp" && targetDirection) {
        reason = `🎯 二消特訓：鎖定 ${targetDirection}向（2VP 考場 67% 重點，已練 ${directionCounts[targetDirection]} 張）${baseInfo}`;
      } else if (activeDirections.length > 0 && targetDirection) {
        const isOneVp = targetDirection === "甲";
        const count = directionCounts[targetDirection];
        const targetCount = Math.round(totalPerspectiveCount / 3);
        reason = isOneVp
          ? `甲向落後（一消點 1VP：已練 ${count} 張，目標 ${targetCount} 張，考場佔比 33%）${baseInfo}`
          : `${targetDirection}向落後（二消點 2VP：已練 ${count} 張，目標 ${targetCount} 張，二消合佔 67%）${baseInfo}`;
      }

      results.push({
        ...pResult,
        directionReason: reason,
      });
    }

    const detailItems =
      examSections.find((s) => s.slug === "detail")?.items ?? [];
    const dResult = drawOneFromItems(detailItems, practiceCountMap);
    if (dResult) results.push(dResult);
  } else if (group === "plan-ceiling-elevation") {
    // ── 空間矩陣三層抽題（Plan Matrix Draw）──────
    const planItems = examSections.find((s) => s.slug === "plan")?.items ?? [];

    // Layer 1：各大題號（201–206 空間格局）練習張數統計
    const baseCounts = calcPlanBaseQuestionCounts(planItems, practiceCountMap);

    // 取得最近練習過的題號（用於同頻平手時避讓）
    const recentUpload = options?.uploads?.find(
      (u) =>
        u.kind === UPLOAD_KINDS.MY_PRACTICE &&
        (u.sectionSlug === "plan" || !u.sectionSlug) &&
        /^\d{3}/.test(u.sheetCode)
    );
    const recentBase = recentUpload
      ? extractBaseQuestion(recentUpload.sheetCode)
      : null;

    const eligibleBaseQuestions = selectEligibleBaseQuestions(
      baseCounts,
      recentBase
    );

    // Layer 2：計算 A~F 各需求單版本 deficit，選出落後版本
    const variantBalance = calcVariantBalance(planItems, practiceCountMap);
    const targetVariant =
      variantBalance.lean === "balanced" ? null : variantBalance.lean;

    // Layer 3：空間矩陣交集（候選大題號 ∩ 目標需求單）
    let planPool = planItems.filter((item) => {
      const base = extractBaseQuestion(item.code);
      const variant = extractPlanVariant(item.code);
      const matchBase = base && eligibleBaseQuestions.includes(base);
      const matchVariant = targetVariant ? variant === targetVariant : true;
      return matchBase && matchVariant;
    });

    // 容錯防禦：若交集為空，降級為最少大題號池
    if (planPool.length === 0) {
      planPool = planItems.filter((item) => {
        const base = extractBaseQuestion(item.code);
        return base && eligibleBaseQuestions.includes(base);
      });
    }
    // 二次降級：若仍為空，回歸所有平面試卷
    if (planPool.length === 0) {
      planPool = planItems;
    }

    const planResult = drawOneFromItems(planPool, practiceCountMap);

    if (planResult) {
      const pickedBase = extractBaseQuestion(planResult.item.code);
      const pickedVariant = extractPlanVariant(planResult.item.code);
      const basePractices = pickedBase ? baseCounts[pickedBase] : 0;
      const targetCount = Math.round(variantBalance.totalCount / 6);

      let reason = "空間格局與需求單均衡，隨機抽取";
      if (pickedBase && pickedVariant) {
        reason = `🎯 空間矩陣：${pickedBase} 題型優先（已練 ${basePractices} 次）＋ ${pickedVariant} 需求單補強（已練 ${variantBalance.variantCounts[pickedVariant]} 張，目標 ${targetCount} 張）`;
      } else if (targetVariant) {
        reason = `${targetVariant} 需求單落後補強（已練 ${variantBalance.variantCounts[targetVariant]} 張，目標 ${targetCount} 張）`;
      }

      results.push({
        ...planResult,
        directionReason: reason,
      });

      // ── Step 2：取同題號的 CE 試卷 ─────────────────
      const baseCode = planResult.item.code;
      const allCeItems =
        examSections.find((s) => s.slug === "ceiling-elevation")?.items ?? [];
      const matchingCeItems = allCeItems.filter((item) =>
        item.code.startsWith(baseCode)
      );

      // ── Step 3：取得池級平衡（天花板池 vs 立面池） ─────────
      const ceilingPool = allCeItems.filter(
        (item) => getCEDrawingType(item) === "ceiling"
      );
      const elevationPool = allCeItems.filter(
        (item) => getCEDrawingType(item) === "elevation"
      );
      const ceBalance = calcCECategoryBalance(
        options?.uploads ?? [],
        ceilingPool,
        elevationPool
      );

      // ── Step 4：以 CE 視角矩陣抽出一張（池級平衡 + 空間視角累積赤字）───
      let targetCategory: "ceiling" | "elevation" | "auto" = "auto";
      if (ceBalance.lean === "ceiling") {
        targetCategory = "elevation"; // 立面落後，補強立面
      } else if (ceBalance.lean === "elevation") {
        targetCategory = "ceiling"; // 天花落後，補強天花
      }

      const ceResult = selectBestCEItem({
        matchingCeItems,
        allCeItems,
        practiceCountMap,
        targetCategory,
      });

      if (ceResult) {
        results.push({
          item: ceResult.item,
          practiceCount: ceResult.practiceCount,
          directionReason: ceResult.reason,
        });
      }
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
