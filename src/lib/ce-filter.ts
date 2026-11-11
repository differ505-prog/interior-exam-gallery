/**
 * ce-filter.ts
 * 天花板與立面圖跨題號（201–206）與區域視角篩選邏輯單一事實來源。
 */

import type { ArchiveItem } from "@/types/exam";

export const CE_QUESTION_OPTIONS = [
  "全部",
  "201",
  "202",
  "203",
  "204",
  "205",
  "206",
] as const;

export type CEQuestionFilter = (typeof CE_QUESTION_OPTIONS)[number];

export const CE_CEILING_TYPES = [
  "客廳天花",
  "餐廳天花",
  "主臥天花",
  "全部天花",
] as const;

export const CE_ELEVATION_TYPES = [
  "客廳立面",
  "餐廳立面",
  "主臥立面",
  "全部立面",
] as const;

export interface CEQuickZonePreset {
  id: string;
  label: string;
  question: CEQuestionFilter;
  type: string;
  pool: "ceiling" | "elevation";
  expectedCount: number;
}

/**
 * 跨題一鍵區域專攻預設組合（點擊即切換為「全部題號 ＋ 指定區域視角」）
 */
export const CE_QUICK_ZONE_PRESETS: CEQuickZonePreset[] = [
  {
    id: "all-living-ceiling",
    label: "全客廳天花",
    question: "全部",
    type: "客廳天花",
    pool: "ceiling",
    expectedCount: 36,
  },
  {
    id: "all-dining-ceiling",
    label: "全餐廳天花",
    question: "全部",
    type: "餐廳天花",
    pool: "ceiling",
    expectedCount: 36,
  },
  {
    id: "all-bedroom-ceiling",
    label: "全主臥天花",
    question: "全部",
    type: "主臥天花",
    pool: "ceiling",
    expectedCount: 36,
  },
  {
    id: "all-ceiling",
    label: "全庫天花",
    question: "全部",
    type: "全部天花",
    pool: "ceiling",
    expectedCount: 108,
  },
  {
    id: "all-living-elevation",
    label: "全客廳立面",
    question: "全部",
    type: "客廳立面",
    pool: "elevation",
    expectedCount: 36,
  },
  {
    id: "all-dining-elevation",
    label: "全餐廳立面",
    question: "全部",
    type: "餐廳立面",
    pool: "elevation",
    expectedCount: 36,
  },
  {
    id: "all-bedroom-elevation",
    label: "全主臥立面",
    question: "全部",
    type: "主臥立面",
    pool: "elevation",
    expectedCount: 36,
  },
  {
    id: "all-elevation",
    label: "全庫立面",
    question: "全部",
    type: "全部立面",
    pool: "elevation",
    expectedCount: 108,
  },
];

/**
 * 判斷試卷是否符合指定的天花板／立面視角篩選條件
 */
export function matchCEType(item: ArchiveItem, selectedType: string): boolean {
  if (selectedType === "全部") return true;

  if (selectedType === "全部天花" || selectedType === "天花板配置圖") {
    return Boolean(
      item.view?.endsWith("天") ||
        item.code.endsWith("客天") ||
        item.code.endsWith("餐天") ||
        item.code.endsWith("臥天") ||
        item.code.endsWith("天花")
    );
  }
  if (selectedType === "客廳天花") {
    return (
      item.view === "客天" ||
      item.code.endsWith("客天") ||
      item.code.endsWith("天花")
    );
  }
  if (selectedType === "餐廳天花") {
    return item.view === "餐天" || item.code.endsWith("餐天");
  }
  if (selectedType === "主臥天花") {
    return item.view === "臥天" || item.code.endsWith("臥天");
  }

  if (selectedType === "全部立面") {
    return Boolean(
      item.view?.endsWith("立") ||
        item.code.endsWith("客立") ||
        item.code.endsWith("餐立") ||
        item.code.endsWith("臥立")
    );
  }
  if (selectedType === "客廳立面" || selectedType === "客廳立面圖") {
    return item.view === "客立" || item.code.endsWith("客立");
  }
  if (selectedType === "餐廳立面" || selectedType === "餐廳立面圖") {
    return item.view === "餐立" || item.code.endsWith("餐立");
  }
  if (selectedType === "主臥立面" || selectedType === "主臥立面圖") {
    return item.view === "臥立" || item.code.endsWith("臥立");
  }

  return true;
}

/**
 * 執行天花板與立面圖雙維度篩選（支援「全部」題號跨全庫查詢）
 */
export function filterCeilingElevationItems(
  items: ArchiveItem[],
  selectedQuestion: string,
  selectedType: string
): ArchiveItem[] {
  return items.filter((item) => {
    const matchesQuestion =
      selectedQuestion === "全部" || item.code.startsWith(selectedQuestion);
    return matchesQuestion && matchCEType(item, selectedType);
  });
}
