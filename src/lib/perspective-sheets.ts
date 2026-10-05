/**
 * perspective-sheets.ts
 *
 * 透視圖題目卷圖檔解析單一事實來源（Single Source of Truth）。
 *
 * 設計背景：
 * 乙級術科「空間意象透視表現圖」的題目卷是一份 A3 對折試卷，實體上分兩面：
 * - 題目卷正面（`front`）：平面圖 + 甲／乙／丙 三個透視方向標示 + 試題編號與姓名欄
 * - 題目卷背面（`back`）：A／B1／C／D 四面立面圖與展示櫃三視圖
 *
 * 關鍵限制：
 * 目前僅 208 題的題目卷完成掃描與建檔。
 * 其餘題號（207、209–212）尚未收錄圖檔，必須回傳 `null` 讓 UI 顯示佔位狀態，
 * 嚴禁 fallback 到 208 的圖檔。
 */

import { ArchiveItem } from "@/types/exam";

/** 題目卷圖檔組：一面一張，共兩張 */
export type PerspectiveSheetPair = {
  /** 題目卷正面：平面圖 + 甲乙丙透視方向 + 試題編號欄 */
  front: string;
  /** 題目卷背面：A／B1／C／D 立面圖與展示櫃三視圖 */
  back: string;
};

/**
 * 已建檔的透視圖題目卷。
 * key 為題號前綴（不含方向字），value 為正反面圖檔路徑。
 */
const PERSPECTIVE_SHEETS: Record<string, PerspectiveSheetPair> = {
  "208": {
    front: "/images/208/2021021722093353239 (2).jpg",
    back: "/images/208/2021021722093353239 (1).jpg",
  },
};

/**
 * 解析透視圖題號的題目卷正反面圖檔。
 *
 * @param itemCode 試卷代碼，例如 "208甲"、"207乙"
 * @returns 該題的題目卷圖檔組；未建檔時回傳 `null`
 */
export function resolvePerspectiveSheets(itemCode: string): PerspectiveSheetPair | null {
  const questionNo = itemCode.slice(0, 3);
  return PERSPECTIVE_SHEETS[questionNo] ?? null;
}

/**
 * 透視圖題目卷的區塊標題與欄位標籤（配置驅動，避免 JSX 內三元運算子）。
 */
export const PERSPECTIVE_SHEET_COPY = {
  sectionTitle: "題目區（題目卷正反面）",
  frontLabel: "題目卷正面",
  backLabel: "題目卷背面",
  frontAlt: "平面圖與甲乙丙透視方向標示",
  backAlt: "A／B1／C／D 立面圖與展示櫃三視圖",
} as const;

/**
 * 檢查某張透視圖試卷是否已建檔題目卷圖。
 */
export function hasPerspectiveSheets(item: ArchiveItem): boolean {
  return resolvePerspectiveSheets(item.code) !== null;
}
