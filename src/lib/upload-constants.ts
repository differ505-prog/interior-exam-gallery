/**
 * upload-constants.ts
 * 上傳系統單一事實來源（Single Source of Truth）。
 * 所有 kind、category 字串值皆集中於此，杜絕不同模組之間 hardcode 不同字串導致篩選失效。
 *
 * 修改流程：只准許在此檔案新增值 → 隨即更新所有引用處。
 * 嚴禁在 route.ts / upload-studio.tsx / archive-detail-modal.tsx 各自 hardcode。
 */

// ─── kind 值（圖像類型）──────────────────────────────────────
export const UPLOAD_KINDS = {
  MY_PRACTICE: "我的練習圖",
  OTHERS_REFERENCE: "他人作品參考",
} as const;

export type UploadKindValue = (typeof UPLOAD_KINDS)[keyof typeof UPLOAD_KINDS];

// ─── category 值（類別）────────────────────────────────────
export const UPLOAD_CATEGORIES = {
  PLAN: "平面圖 201-206",
  CEILING_ELEVATION: "天花板圖 / 立面圖",
  PERSPECTIVE: "透視圖 207-212",
  DETAIL: "大樣圖 213-224",
} as const;

export type UploadCategoryValue = (typeof UPLOAD_CATEGORIES)[keyof typeof UPLOAD_CATEGORIES];

/** 章節 slug 與 category 的雙向映射，作為資料鎖死層，避免 category 字串被竄改 */
export const SECTION_SLUG_TO_CATEGORY: Record<string, UploadCategoryValue> = {
  plan: UPLOAD_CATEGORIES.PLAN,
  "ceiling-elevation": UPLOAD_CATEGORIES.CEILING_ELEVATION,
  perspective: UPLOAD_CATEGORIES.PERSPECTIVE,
  detail: UPLOAD_CATEGORIES.DETAIL,
};

export function resolveCategoryBySectionSlug(slug: string): UploadCategoryValue | null {
  return SECTION_SLUG_TO_CATEGORY[slug] ?? null;
}

// ─── 驗證工具（供 API 與表單使用）────────────────────────────
export const UPLOAD_KIND_OPTIONS = Object.values(UPLOAD_KINDS) as [UploadKindValue, UploadKindValue];
export const UPLOAD_CATEGORY_OPTIONS = Object.values(UPLOAD_CATEGORIES) as [
  UploadCategoryValue,
  UploadCategoryValue,
  UploadCategoryValue,
  UploadCategoryValue,
];
