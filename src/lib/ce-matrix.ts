/**
 * ce-matrix.ts
 *
 * 天花板與立面圖（Ceiling & Elevation）空間視角平衡矩陣單一事實來源。
 *
 * 設計背景（UI/UX 總監 9.5+ 方案）：
 * 天花板與立面圖（216 張）包含 6 個空間視角（客天/餐天/臥天/客立/餐立/臥立）。
 * 舊版邏輯僅看「單張試卷本體」次數，導致：
 * 考生在 201 練過主臥天花、202 練過餐廳天花，但全庫客廳天花為 0 次時，
 * 抽到新題號仍會丟 1/3 骰子隨機抽中主臥天花。
 *
 * 本模組提供：
 * 1. CE 視角類型定義與提取
 * 2. 全題庫跨題號視角累積練習量統計
 * 3. 大池落後判定（天花板池 vs 立面池總量平衡）
 * 4. 視角層級赤字仲裁與生疏視角鎖定（客/餐/臥）
 * 5. 平手教學序（客天 > 餐天 > 臥天；客立 > 餐立 > 臥立）
 *
 * 純邏輯層：不得 import React / KV / Cloudinary / Supabase。
 */

import type { ArchiveItem } from "@/types/exam";

/** CE 6 大視角類型標籤 */
export const CE_VIEWS = [
  "客天",
  "餐天",
  "臥天",
  "客立",
  "餐立",
  "臥立",
] as const;

export type CEView = (typeof CE_VIEWS)[number];

export const CE_CEILING_VIEWS = ["客天", "餐天", "臥天"] as const;
export const CE_ELEVATION_VIEWS = ["客立", "餐立", "臥立"] as const;

/** 視角中文全名映射 */
export const CE_VIEW_LABELS: Record<CEView, string> = {
  客天: "客廳天花",
  餐天: "餐廳天花",
  臥天: "主臥天花",
  客立: "客廳立面",
  餐立: "餐廳立面",
  臥立: "主臥立面",
};

/** 平手時的教學標準序（客 > 餐 > 臥） */
export const CE_VIEW_ORDER: Record<CEView, number> = {
  客天: 0,
  餐天: 1,
  臥天: 2,
  客立: 0,
  餐立: 1,
  臥立: 2,
};

/**
 * 從試卷 code 抽出視角標籤。
 * "201A客天" → "客天"
 * "206F臥立" → "臥立"
 * "201A" → null
 */
export function extractCEView(code: string): CEView | null {
  for (const v of CE_VIEWS) {
    if (code.endsWith(v)) return v;
  }
  return null;
}

/**
 * 統計全題庫 6 大視角的累積練習總張數
 */
export function calcCEViewCounts(
  allCeItems: ArchiveItem[],
  practiceCountMap: Record<string, number>
): Record<CEView, number> {
  const counts: Record<CEView, number> = {
    客天: 0,
    餐天: 0,
    臥天: 0,
    客立: 0,
    餐立: 0,
    臥立: 0,
  };

  for (const item of allCeItems) {
    const view = (item.view as CEView) ?? extractCEView(item.code);
    if (view && view in counts) {
      counts[view] += practiceCountMap[item.code] ?? 0;
    }
  }

  return counts;
}

export interface SelectBestCEItemParams {
  matchingCeItems: ArchiveItem[];
  allCeItems: ArchiveItem[];
  practiceCountMap: Record<string, number>;
  targetCategory?: "ceiling" | "elevation" | "auto";
  recentView?: CEView | null;
}

export interface SelectedCEResult {
  item: ArchiveItem;
  practiceCount: number;
  reason: string;
}

/**
 * 從當前題號的候選 CE 試卷中，以「大池赤字平衡 + 視角累積赤字矩陣」抽出最佳試卷
 */
export function selectBestCEItem({
  matchingCeItems,
  allCeItems,
  practiceCountMap,
  targetCategory = "auto",
  recentView = null,
}: SelectBestCEItemParams): SelectedCEResult | null {
  if (matchingCeItems.length === 0) return null;

  // 1. 全題庫 6 大視角練習總量統計
  const viewCounts = calcCEViewCounts(allCeItems, practiceCountMap);

  const totalCeiling =
    viewCounts.客天 + viewCounts.餐天 + viewCounts.臥天;
  const totalElevation =
    viewCounts.客立 + viewCounts.餐立 + viewCounts.臥立;

  // 2. 決定大池：天花板池 (ceiling) vs 立面池 (elevation)
  let chosenCategory: "ceiling" | "elevation";
  if (targetCategory === "ceiling" || targetCategory === "elevation") {
    chosenCategory = targetCategory;
  } else {
    // 總量落後者優先；平手時依教學序由天花板開始
    chosenCategory = totalCeiling <= totalElevation ? "ceiling" : "elevation";
  }

  // 3. 篩選當前大題在該大池內的候選試卷
  const categoryPool = matchingCeItems.filter((item) => {
    const v = (item.view as CEView) ?? extractCEView(item.code);
    if (!v) return false;
    return chosenCategory === "ceiling"
      ? (CE_CEILING_VIEWS as readonly string[]).includes(v)
      : (CE_ELEVATION_VIEWS as readonly string[]).includes(v);
  });

  const candidates = categoryPool.length > 0 ? categoryPool : matchingCeItems;

  // 4. 計算候選試卷對應的「全題庫視角累積次數」，挑出全庫最少者
  const candidateViewStats = candidates.map((item) => {
    const v = (item.view as CEView) ?? extractCEView(item.code);
    const gCount = v ? viewCounts[v] : 0;
    const sCount = practiceCountMap[item.code] ?? 0;
    return { item, view: v, globalCount: gCount, sheetCount: sCount };
  });

  const minGlobal = Math.min(...candidateViewStats.map((c) => c.globalCount));
  let topCandidates = candidateViewStats.filter(
    (c) => c.globalCount === minGlobal
  );

  // 5. 若有多個視角全庫平手，且最近練習過的視角在其中，進行冷卻避讓
  if (topCandidates.length > 1 && recentView) {
    const cooled = topCandidates.filter((c) => c.view !== recentView);
    if (cooled.length > 0) topCandidates = cooled;
  }

  // 6. 若仍平手，以教學序排序（客 > 餐 > 臥）
  topCandidates.sort((a, b) => {
    const orderA = a.view ? CE_VIEW_ORDER[a.view] ?? 99 : 99;
    const orderB = b.view ? CE_VIEW_ORDER[b.view] ?? 99 : 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.sheetCount - b.sheetCount;
  });

  const picked = topCandidates[0];
  const viewLabel = picked.view ? CE_VIEW_LABELS[picked.view] : "專項視角";
  const catLabel = chosenCategory === "ceiling" ? "天花板圖" : "立面圖";

  let reason = `🎯 ${catLabel}優先 · 補強最生疏視角「${viewLabel}」（全庫僅練 ${picked.globalCount} 次）`;
  if (totalCeiling < totalElevation && chosenCategory === "ceiling") {
    reason = `🎯 天花板落後補強（已練 ${totalCeiling} 張，立面已練 ${totalElevation} 張）· 優先補強生疏視角「${viewLabel}」（全庫僅練 ${picked.globalCount} 次）`;
  } else if (totalElevation < totalCeiling && chosenCategory === "elevation") {
    reason = `🎯 立面圖落後補強（已練 ${totalElevation} 張，天花已練 ${totalCeiling} 張）· 優先補強生疏視角「${viewLabel}」（全庫僅練 ${picked.globalCount} 次）`;
  }

  return {
    item: picked.item,
    practiceCount: picked.sheetCount,
    reason,
  };
}
