/**
 * 備考知識庫型別定義
 * 對應 src/data/exam-notes.ts
 */

export type NoteType =
  | "formula"   // 比例公式
  | "procedure" // 步驟 SOP
  | "checklist" // 檢核清單
  | "table"     // 數據表
  | "note";     // 一般備考筆記

export interface ExamNote {
  id: string;
  /** 標題 */
  title: string;
  /** 筆記類型 */
  type: NoteType;
  /** 主要內容（純文字或 Markdown） */
  content: string;
  /** 補充說明 */
  detail?: string;
  /** 相關試卷標號 */
  relatedCodes?: string[];
  /** 標籤 */
  tags: string[];
}

export interface ExamNoteCategory {
  slug: string;
  title: string;
  description: string;
  icon: string;
  notes: ExamNote[];
}

export interface ScaleReference {
  scale: string;
  scaleLabel: string;
  recommendedUse: string;
  paperWidth40m: string;
  paperWidth80m: string;
  note: string;
}

export interface HeightProjectionFormula {
  name: string;
  formula: string;
  variables: Array<{ symbol: string; description: string }>;
  denominator: number;
  example: {
    description: string;
    calculation: string;
  };
}
