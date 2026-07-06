export type ArchiveItem = {
  code: string;
  title: string;
  variants: string[];
  focus: string;
  notes: string;
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
  weaknesses: string[];
  createdAt: string;
};
