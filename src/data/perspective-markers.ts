/**
 * perspective-markers.ts
 *
 * 208 透視圖的方向框標註資料。
 * 用於在題目卷正面的圖片上標示甲／乙／丙三個方向框位置。
 *
 * 設計背景：
 * 甲向 = 一消點透視圖（考場比例 1/3）
 * 乙丙向 = 二消點透視圖（考場比例 2/3）
 * 讓備考者一眼看出「甲向在這裡，乙丙向在那裡」，
 * 呼應 v1.3 附錄 H 的方向感知抽題邏輯。
 */

export type PerspectiveMarker = {
  direction: "甲" | "乙" | "丙";
  /** 方向框相對位置（百分比，0-100） */
  position: {
    top: number;    // 從圖片頂部算起（%）
    left: number;   // 從圖片左側算起（%）
    width: number;  // 框寬度（%）
    height: number; // 框高度（%）
  };
  /** 標籤顯示文字 */
  label: string;
  /** 消點類型 */
  vpType: "一消點" | "二消點";
};

/** 208 題目卷正面的方向框標註（基於實際圖面測量） */
export const PERSPECTIVE_208_MARKERS: PerspectiveMarker[] = [
  {
    direction: "甲",
    position: { top: 15, left: 10, width: 25, height: 35 },
    label: "甲向",
    vpType: "一消點",
  },
  {
    direction: "乙",
    position: { top: 15, left: 38, width: 25, height: 35 },
    label: "乙向",
    vpType: "二消點",
  },
  {
    direction: "丙",
    position: { top: 15, left: 66, width: 25, height: 35 },
    label: "丙向",
    vpType: "二消點",
  },
];

/**
 * 取得某個題號的方向標註（僅 208 有實測資料，其餘題號回傳空陣列）。
 */
export function getPerspectiveMarkers(itemCode: string): PerspectiveMarker[] {
  if (itemCode.startsWith("208")) return PERSPECTIVE_208_MARKERS;
  return [];
}
