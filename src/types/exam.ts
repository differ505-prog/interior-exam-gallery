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

export type UploadKind = "我的練習圖" | "他人範例圖" | "他人作品參考";

export type UploadEntry = {
  id: string;
  title: string;
  category: string;
  sheetCode: string;
  imageUrl: string;
  kind: UploadKind;
  authorName: string;
  scoreNote: string;
  teacherComment: string;
  weaknesses: string[];
  createdAt: string;
};
