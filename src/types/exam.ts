export type ArchiveItem = {
  code: string;
  title: string;
  variants: string[];
  focus: string;
  notes: string;
  /** 試卷教學連結（由 Supabase 動態填入，目前 localStorage 階段性支援） */
  links?: string[];
};

export type ArchiveSection = {
  slug: string;
  eyebrow: string;
  title: string;
  summary: string;
  visualNote: string;
  items: ArchiveItem[];
};

export type UploadKind = "我的練習圖" | "他人作品參考";

export type UploadEntry = {
  id: string;
  title: string;
  category: string;
  sheetCode: string;
  /** 試卷所屬章節（plan / ceiling-elevation / perspective / detail），與 sheetCode 共同決定歸屬 */
  sectionSlug?: string;
  /** 主圖 URL（向後相容：單張上傳時仍使用此欄位） */
  imageUrl: string;
  /** 多張練習圖（僅「我的練習圖」類型支援），缺少時 fallback 至 imageUrl */
  imageUrls?: string[];
  kind: UploadKind;
  authorName: string;
  scoreNote: string;
  teacherComment: string;
  weaknesses: string[];
  createdAt: string;
};
