/**
 * sprint.ts
 * 考前 72 小時衝刺清單型別定義
 */

export type SprintDay = "11/09" | "11/10" | "11/11";

export type SprintCategory =
  | "立面圖"
  | "大樣圖"
  | "透視圖"
  | "平面圖"
  | "考前整備"
  | "文具/拜文昌";

export interface SprintTask {
  id: string;
  day: SprintDay;
  brickNumber?: number; // 番茄磚序號 1~8
  isErrand?: boolean; // 是否為中場休息外出任務（如補文具、拜文昌）
  isMilestone?: boolean; // 今日額外加開戰果（如 221）
  title: string;
  duration: string; // 例如 "25m", "60m"
  category: SprintCategory;
  sheetCode?: string; // 關聯試卷代號，例如 "203D臥立", "221", "212乙"
  description: string;
  stopBoundary: string; // 止步邊界提醒：哪些項目不用做到底，防過度細化
  defaultCompleted?: boolean;
}

export interface DaySprintMeta {
  day: SprintDay;
  weekday: string;
  countdown: string; // 例如 "D-3"
  focus: string;
  badge: string;
}

