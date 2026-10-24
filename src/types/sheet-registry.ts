/**
 * sheet-registry.ts
 *
 * 建檔中心（Sheet Registry）的型別定義。
 * 前台、建檔中心 UI、API 端點共用同一組型別，確保三態
 * （草稿 / 待核准 / 生效）的欄位語意一致。
 */

/** 試卷圖檔的兩個頁面槽位：題目頁 / 答案頁 */
export type SheetSlot = "question" | "answer";

/** 單一槽位的建檔記錄（registry 的一個 field） */
export type SheetRecord = {
  sectionSlug: string;
  code: string;
  slot: SheetSlot;
  /** 生效 URL：前台唯一讀取的欄位 */
  url: string | null;
  /** 上一版 URL（回滾來源） */
  prevUrl: string | null;
  /** 上一版的生效時間 */
  prevAt: string | null;
  /** 待核准 URL：前台絕不讀取 */
  stagedUrl: string | null;
  /** 待核准時間 */
  stagedAt: string | null;
  /** 最後一次變更時間 */
  updatedAt: string;
};

/** key = `${sectionSlug}:${code}:${slot}` */
export type SheetRegistry = Record<string, SheetRecord>;

/**
 * 槽位狀態：
 * - missing：完全沒有圖（生效與待核准皆為空）
 * - live：有生效圖，且無上一版
 * - pending：有生效圖且另有待核准圖待處理
 * - rollback-ready：有生效圖，且保留上一版可回滾
 */
export type SheetSlotState = "missing" | "live" | "pending" | "rollback-ready";

export type SheetSlotStatus = {
  slot: SheetSlot;
  state: SheetSlotState;
  liveUrl: string | null;
  pendingUrl: string | null;
  canApprove: boolean;
  canRollback: boolean;
};

export type SectionCoverage = {
  sectionSlug: string;
  totalCodes: number;
  questionReady: number;
  answerReady: number;
  pendingCount: number;
  missingCodes: string[];
};