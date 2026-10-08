/**
 * sheet-reader.ts
 *
 * 試卷閱讀器（Sheet Reader）的 URL 解析邏輯。
 * 單一事實來源：給定 sectionSlug + item.code，回傳 SheetDoc。
 *
 * 舊模型（bug）：
 *   questionImageUrl + finalRequirementUrl，兩欄並排，裁切問題、無法對照同位置
 *
 * 新模型（正確）：
 *   SheetDoc { code, pages[] }，分頁閱讀，自動裁邊，正反面可快速翻
 */

import { ArchiveItem } from "@/types/exam";
import { SheetDoc, SheetPage } from "@/types/sheet";
import { resolvePerspectiveSheets } from "./perspective-sheets";

/** 透視圖題目卷的圖說（配置驅動） */
const PERSP_PAGE_COPY: Record<"front" | "back", { label: string; alt: string }> = {
  front: {
    label: "題目卷正面",
    alt: "平面圖與甲乙丙透視方向標示",
  },
  back: {
    label: "題目卷背面",
    alt: "A／B1／C／D 立面圖與展示櫃三視圖",
  },
};

/**
 * 從 ArchiveItem + sectionSlug 建構 SheetDoc。
 *
 * 優先順序：
 * 1. 透視圖：使用 resolvePerspectiveSheets（僅 208 有圖）
 * 2. 大樣圖：題目圖 + 官方答案圖
 * 3. 平面圖 / 天花板與立面圖：題目圖
 *
 * 未建檔時回傳 null，讓 UI 顯示誠實佔位狀態。
 */
export function buildSheetDoc(
  item: ArchiveItem,
  sectionSlug: string,
  answerUrl?: string | null,
): SheetDoc | null {
  if (sectionSlug === "perspective") {
    return buildPerspectiveSheetDoc(item);
  }

  if (sectionSlug === "detail") {
    const questionUrl = `/images/${item.code}/${item.code}-question.jpg`;
    const pages: SheetPage[] = [
      { url: questionUrl, label: "題目圖", alt: `${item.code} 大樣圖題目` },
    ];
    if (answerUrl) {
      pages.push({ url: answerUrl, label: "官方答案圖", alt: `${item.code} 官方答案`, isAnswer: true });
    }
    return { code: item.code, sectionSlug, pages };
  }

  if (sectionSlug === "plan" || sectionSlug === "ceiling-elevation") {
    const numPart = item.code.slice(0, 3);
    if (!/^\d{3}$/.test(numPart)) return null;
    const questionUrl = `/images/plan/question-${numPart}.jpg`;
    const pages: SheetPage[] = [
      { url: questionUrl, label: "題目圖", alt: `${item.code} 題目圖` },
    ];
    if (answerUrl) {
      pages.push({ url: answerUrl, label: "需求圖", alt: `${item.code} 需求圖`, isAnswer: true });
    }
    return { code: item.code, sectionSlug, pages };
  }

  return null;
}

/** 透視圖專用建構 */
function buildPerspectiveSheetDoc(item: ArchiveItem): SheetDoc | null {
  const pair = resolvePerspectiveSheets(item.code);
  if (!pair) return null;

  return {
    code: item.code,
    sectionSlug: "perspective",
    coverage: "透視圖 207-212 共 6 題",
    pages: [
      { url: pair.front, label: PERSP_PAGE_COPY.front.label, alt: `${item.code.slice(0,3)} 題目卷正面：${PERSP_PAGE_COPY.front.alt}` },
      { url: pair.back, label: PERSP_PAGE_COPY.back.label, alt: `${item.code.slice(0,3)} 題目卷背面：${PERSP_PAGE_COPY.back.alt}`, isAnswer: true },
    ],
  };
}

/**
 * 取得區塊的試卷收錄進度摘要。
 * 用於誠實空狀態：告知使用者總題數與已收錄題數。
 */
export function getSectionCoverage(sectionSlug: string): { total: number; archived: number; description: string } {
  switch (sectionSlug) {
    case "plan":
      return { total: 36, archived: 6, description: "平面圖 201-206" };
    case "ceiling-elevation":
      return { total: 216, archived: 6, description: "天花板與立面圖" };
    case "perspective":
      return { total: 18, archived: 6, description: "透視圖 207-212" };
    case "detail":
      return { total: 12, archived: 12, description: "大樣圖 213-224" };
    default:
      return { total: 0, archived: 0, description: "" };
  }
}
