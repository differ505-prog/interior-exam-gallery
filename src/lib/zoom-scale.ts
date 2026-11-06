/**
 * lib/zoom-scale.ts
 *
 * 試卷題目圖預覽尺寸單一事實來源（Single Source of Truth）。
 *
 * 設計理念（UI/UX 總監 9+ 分級方案）：
 * - 解除原先 fit -> 1400 -> 2200 斷層過大的痛點（「1400 很剛好，有時候又太寬」）
 * - 引入 1000px（筆電全景）與 1200px（黃金甜蜜點，文字清晰不爆框）
 * - 提供 1800px（細節標註）與 2200px（超清檢驗）
 * - 支援階梯前進、後退、循環步進與安全正規化
 */

export type ZoomLevel = "fit" | "1000" | "1200" | "1400" | "1800" | "2200";

export interface ZoomScaleOption {
  level: ZoomLevel;
  label: string;
  width?: number;
  title: string;
  description: string;
}

export const ZOOM_SCALE_OPTIONS: readonly ZoomScaleOption[] = [
  {
    level: "fit",
    label: "符合",
    title: "符合視窗",
    description: "全圖俯瞰，依視窗自動縮放",
  },
  {
    level: "1000",
    label: "1000",
    width: 1000,
    title: "1000px · 筆電全景",
    description: "輕量放大，適合 13-14 吋筆電免頻繁滑動",
  },
  {
    level: "1200",
    label: "1200",
    width: 1200,
    title: "1200px · 舒適閱覽 (甜蜜點)",
    description: "解決 1400 太寬痛點，文字標註清晰且版面不爆框",
  },
  {
    level: "1400",
    label: "1400",
    width: 1400,
    title: "1400px · 標準深研",
    description: "大螢幕標準閱覽尺度，清晰研讀平面標註與符號",
  },
  {
    level: "1800",
    label: "1800",
    width: 1800,
    title: "1800px · 精細放樣",
    description: "專注剖面、天花標高、水電出線與構造層次",
  },
  {
    level: "2200",
    label: "2200",
    width: 2200,
    title: "2200px · 原圖超清",
    description: "1:1 原解析度極限檢驗，微小尺寸與引線零失真",
  },
] as const;

export const ZOOM_LEVELS: readonly ZoomLevel[] = ZOOM_SCALE_OPTIONS.map((o) => o.level);

/**
 * 取得下一階縮放（放大一階，到底維持 2200）
 */
export function getNextZoomLevel(current: ZoomLevel): ZoomLevel {
  const idx = ZOOM_LEVELS.indexOf(current);
  if (idx === -1 || idx >= ZOOM_LEVELS.length - 1) return "2200";
  return ZOOM_LEVELS[idx + 1];
}

/**
 * 取得上一階縮放（縮小一階，到頂維持 fit）
 */
export function getPrevZoomLevel(current: ZoomLevel): ZoomLevel {
  const idx = ZOOM_LEVELS.indexOf(current);
  if (idx <= 0) return "fit";
  return ZOOM_LEVELS[idx - 1];
}

/**
 * 點擊圖片時的循環縮放階梯（步進放大，到底時回 fit）
 */
export function cycleZoomLevel(current: ZoomLevel): ZoomLevel {
  const idx = ZOOM_LEVELS.indexOf(current);
  if (idx === -1 || idx >= ZOOM_LEVELS.length - 1) return "fit";
  return ZOOM_LEVELS[idx + 1];
}

/**
 * 取得該等級的說明標題（用於 tooltip 或 title）
 */
export function getZoomTitle(level: ZoomLevel): string {
  const option = ZOOM_SCALE_OPTIONS.find((o) => o.level === level);
  return option ? `${option.title} · ${option.description}` : "";
}

/**
 * 取得點擊圖片時下一個尺度的引導文字
 */
export function getNextZoomActionTitle(current: ZoomLevel): string {
  const next = cycleZoomLevel(current);
  if (next === "fit") return "點擊恢復符合視窗";
  return `點擊放大至 ${next}px`;
}

/**
 * 安全正規化縮放等級（相容舊版 "medium" 與 "large" 遺留值）
 */
export function normalizeZoomLevel(raw: unknown): ZoomLevel {
  if (raw === "medium") return "1400";
  if (raw === "large") return "2200";
  if (typeof raw === "string" && (ZOOM_LEVELS as readonly string[]).includes(raw)) {
    return raw as ZoomLevel;
  }
  return "fit";
}
