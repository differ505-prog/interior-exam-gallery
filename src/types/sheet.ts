/**
 * types/sheet.ts
 *
 * 試卷閱讀器的資料模型。
 * 取代「兩個 URL 欄位」的舊模型，確保題號→頁面的映射只有一個真相來源。
 */

export type SheetPage = {
  /** 圖檔 URL */
  url: string;
  /** 頁面標籤（正面/背面 或 第1頁/第2頁） */
  label: string;
  /** 替換文字敘述（用於無障礙） */
  alt: string;
  /** 是否為參考答案頁（預設 false） */
  isAnswer?: boolean;
};

/** 試卷文件：包含題號 + 所有圖頁 + 題組覆蓋率 */
export type SheetDoc = {
  /** 試卷編號，如 "208甲" */
  code: string;
  /** 所屬區塊 slug */
  sectionSlug: string;
  /** 所有圖頁（通常 1-2 張） */
  pages: SheetPage[];
  /** 此試卷的題組覆蓋率敘述（如 "透視圖 207-212 共 6 題"） */
  coverage?: string;
};
