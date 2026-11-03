/**
 * view-note.ts
 *
 * 視角專用筆記（View-Scoped Note）單一事實來源（Single Source of Truth）。
 *
 * 設計背景：
 * 考生在練習特定工法視角時（例如「客廳立面圖」或「一消點透視圖」），
 * 所累積的人體工學尺寸（電視櫃高 45cm、吊燈離地 160cm）、放樣 SOP、
 * 容易扣分的通病，是跨試卷完全適用的共通工法知識。
 *
 * 本模組支援 8 大專項視角：
 * 1. 一消點透視圖（1vp-perspective）：207–212 甲向（6 張）
 * 2. 二消點透視圖（2vp-perspective）：207–212 乙/丙向（12 張）
 * 3. 餐廳天花板圖（dining-ceiling）：201–206 A~F 餐天（36 張）
 * 4. 客廳天花板圖（living-ceiling）：201–206 A~F 客天（36 張）
 * 5. 主臥天花板圖（bedroom-ceiling）：201–206 A~F 臥天（36 張）
 * 6. 餐廳立面圖（dining-elevation）：201–206 A~F 餐立（36 張）
 * 7. 客廳立面圖（living-elevation）：201–206 A~F 客立（36 張）
 * 8. 主臥立面圖（bedroom-elevation）：201–206 A~F 臥立（36 張）
 *
 * 純邏輯層：不得 import React / KV / Cloudinary / Supabase。
 */

import { CEView } from "@/types/exam";

export const VIEW_NOTE_TYPES = [
  "1vp-perspective",
  "2vp-perspective",
  "dining-ceiling",
  "living-ceiling",
  "bedroom-ceiling",
  "dining-elevation",
  "living-elevation",
  "bedroom-elevation",
] as const;

export type ViewNoteType = (typeof VIEW_NOTE_TYPES)[number];

export interface ViewNoteMeta {
  type: ViewNoteType;
  title: string;
  shortLabel: string;
  sectionSlug: "perspective" | "ceiling-elevation";
  description: string;
  placeholder: string;
  affectedCount: number;
}

export const VIEW_NOTE_METAS: Record<ViewNoteType, ViewNoteMeta> = {
  "1vp-perspective": {
    type: "1vp-perspective",
    title: "一消點透視專用筆記",
    shortLabel: "一消透視",
    sectionSlug: "perspective",
    description: "單一消失點（VP）空間透視、EL 眼平線定位與進深分割比例",
    placeholder:
      "在此記錄您個人的一消點透視作圖步驟、老師叮嚀或心得。在此輸入將自動同步至 207~212 甲向共 6 張試卷。",
    affectedCount: 6,
  },
  "2vp-perspective": {
    type: "2vp-perspective",
    title: "二消點透視專用筆記",
    shortLabel: "二消透視",
    sectionSlug: "perspective",
    description: "雙消失點（VPL / VPR）成角透視、真高線高度定位與景深層次",
    placeholder:
      "在此記錄您個人的二消點透視作圖步驟、老師叮嚀或心得。在此輸入將自動同步至 207~212 乙/丙向共 12 張試卷。",
    affectedCount: 12,
  },
  "dining-ceiling": {
    type: "dining-ceiling",
    title: "餐廳天花板專用筆記",
    shortLabel: "餐天",
    sectionSlug: "ceiling-elevation",
    description: "餐廳天花板平頂降板、餐桌吊燈中心定位、燈具迴路與出風口配置",
    placeholder:
      "記錄餐廳天花板共通規範：餐桌中心吊燈定位基準、出風口避讓吊燈 45~60cm、間接照明燈溝深度 10~12cm、CH 標高符號與獨立雙切迴路。寫一次，201~206 A~F 餐天 36 張試卷全部同步。",
    affectedCount: 36,
  },
  "living-ceiling": {
    type: "living-ceiling",
    title: "客廳天花板專用筆記",
    shortLabel: "客天",
    sectionSlug: "ceiling-elevation",
    description: "客廳天花間接照明層板、主燈/嵌燈配置、窗簾盒收邊與大樑包覆",
    placeholder:
      "記錄客廳天花板共通規範：大樑包覆降板尺寸、雙軌窗簾盒淨深 15~20cm、洗牆間照立板高度 8~10cm、冷氣吊隱檢修孔 45×45cm。寫一次，201~206 A~F 客天 36 張試卷全部同步。",
    affectedCount: 36,
  },
  "bedroom-ceiling": {
    type: "bedroom-ceiling",
    title: "主臥天花板專用筆記",
    shortLabel: "臥天",
    sectionSlug: "ceiling-elevation",
    description: "主臥床頭壓樑化解、間接氛圍照明、衣櫃上方封板與出風口方向",
    placeholder:
      "記錄主臥天花板共通規範：床頭壓樑造型斜板或降板收邊、衣櫃頂部封板尺寸、床頭雙切氛圍照明迴路、出風口避開直吹枕頭。寫一次，201~206 A~F 臥天 36 張試卷全部同步。",
    affectedCount: 36,
  },
  "dining-elevation": {
    type: "dining-elevation",
    title: "餐廳立面圖專用筆記",
    shortLabel: "餐立",
    sectionSlug: "ceiling-elevation",
    description: "餐邊櫃/電器櫃尺度、出風口線形投影、廚房推拉門與踢腳板收邊",
    placeholder:
      "記錄餐廳立面圖共通規範：餐邊矮櫃高 85~90cm、中段留空 45~55cm、吊櫃底離地 140cm、踢腳板高 8~10cm、推拉門軌道包框收邊。寫一次，201~206 A~F 餐立 36 張試卷全部同步。",
    affectedCount: 36,
  },
  "living-elevation": {
    type: "living-elevation",
    title: "客廳立面圖專用筆記",
    shortLabel: "客立",
    sectionSlug: "ceiling-elevation",
    description: "電視主牆設計、電視矮櫃深度、影音線管暗管、展示高櫃收邊",
    placeholder:
      "記錄客廳立面圖共通規範：電視矮櫃高 40~45cm/深 45~50cm、電視中心點離地 100~110cm、管線預埋管徑 50mm、展示櫃層板厚 6~8cm。寫一次，201~206 A~F 客立 36 張試卷全部同步。",
    affectedCount: 36,
  },
  "bedroom-elevation": {
    type: "bedroom-elevation",
    title: "主臥立面圖專用筆記",
    shortLabel: "臥立",
    sectionSlug: "ceiling-elevation",
    description: "主臥床頭造型牆、衣櫃內部吊桿抽屜分區、化妝桌與鏡面高度",
    placeholder:
      "記錄主臥立面圖共通規範：床頭背板高 90~110cm、壁燈離地 140cm、衣櫃深度 60cm/長衣區淨高 140cm/抽屜高 16~20cm、化妝桌檯面高 75cm。寫一次，201~206 A~F 臥立 36 張試卷全部同步。",
    affectedCount: 36,
  },
};

/** 視角專用筆記儲存 key 保留前綴 */
export const VIEW_NOTE_KEY_PREFIX = "vnote-";

/** 建立儲存 key："living-elevation" → "vnote-living-elevation" */
export function buildViewNoteKey(type: ViewNoteType): string {
  return `${VIEW_NOTE_KEY_PREFIX}${type}`;
}

/** 由儲存 key 解析類型："vnote-living-elevation" → "living-elevation" */
export function parseViewNoteKey(key: string): ViewNoteType | null {
  if (!key.startsWith(VIEW_NOTE_KEY_PREFIX)) return null;
  const rawType = key.slice(VIEW_NOTE_KEY_PREFIX.length);
  return (VIEW_NOTE_TYPES as readonly string[]).includes(rawType)
    ? (rawType as ViewNoteType)
    : null;
}

const CE_QUESTIONS = ["201", "202", "203", "204", "205", "206"] as const;
const CE_VARIANTS = ["A", "B", "C", "D", "E", "F"] as const;
const PERSPECTIVE_QUESTIONS = ["207", "208", "209", "210", "211", "212"] as const;

/**
 * 列出某視角類型底下所有共用筆記的試卷 code
 */
export function listAffectedSheetsByView(type: ViewNoteType): string[] {
  switch (type) {
    case "1vp-perspective":
      return PERSPECTIVE_QUESTIONS.map((q) => `${q}甲`);
    case "2vp-perspective": {
      const codes: string[] = [];
      for (const q of PERSPECTIVE_QUESTIONS) {
        codes.push(`${q}乙`, `${q}丙`);
      }
      return codes;
    }
    case "dining-ceiling":
      return generateCeCodes("餐天");
    case "living-ceiling":
      return generateCeCodes("客天");
    case "bedroom-ceiling":
      return generateCeCodes("臥天");
    case "dining-elevation":
      return generateCeCodes("餐立");
    case "living-elevation":
      return generateCeCodes("客立");
    case "bedroom-elevation":
      return generateCeCodes("臥立");
  }
}

function generateCeCodes(suffix: string): string[] {
  const codes: string[] = [];
  for (const q of CE_QUESTIONS) {
    for (const v of CE_VARIANTS) {
      codes.push(`${q}${v}${suffix}`);
    }
  }
  return codes;
}

export interface ViewNoteTarget {
  type: ViewNoteType;
  key: string;
  meta: ViewNoteMeta;
  affectedCodes: string[];
}

/**
 * 由試卷代碼與視角標籤解析所屬視角專項筆記目標
 * 若該試卷不屬於 8 大專用視角（例如平面圖 201~206、大樣圖 213~224）則回傳 null
 */
export function resolveViewNoteTarget(
  code: string,
  view?: CEView | string
): ViewNoteTarget | null {
  // 1. 優先判斷 CEView 標籤或代碼後綴
  const viewStr = view || (code.length >= 2 ? code.slice(-2) : "");
  if (viewStr === "客天") return makeTarget("living-ceiling");
  if (viewStr === "餐天") return makeTarget("dining-ceiling");
  if (viewStr === "臥天") return makeTarget("bedroom-ceiling");
  if (viewStr === "客立") return makeTarget("living-elevation");
  if (viewStr === "餐立") return makeTarget("dining-elevation");
  if (viewStr === "臥立") return makeTarget("bedroom-elevation");

  // 2. 判斷透視圖 207~212
  const persMatch = code.match(/^2(0[7-9]|1[0-2])([甲乙丙])$/);
  if (persMatch) {
    const dir = persMatch[2];
    if (dir === "甲") return makeTarget("1vp-perspective");
    if (dir === "乙" || dir === "丙") return makeTarget("2vp-perspective");
  }

  return null;
}

function makeTarget(type: ViewNoteType): ViewNoteTarget {
  return {
    type,
    key: buildViewNoteKey(type),
    meta: VIEW_NOTE_METAS[type],
    affectedCodes: listAffectedSheetsByView(type),
  };
}

