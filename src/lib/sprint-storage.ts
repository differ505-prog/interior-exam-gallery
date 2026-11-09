import { SprintTask, SprintDay } from "@/types/sprint";
import { SPRINT_TASKS } from "@/data/sprint-tasks";

export const SPRINT_STORAGE_KEY = "sprint_completed_tasks_v1";

/**
 * 取得初始已完成狀態表（包含 SPRINT_TASKS 中自帶 defaultCompleted 者）
 */
export function getInitialCompletedMap(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const t of SPRINT_TASKS) {
    if (t.defaultCompleted) {
      map[t.id] = true;
    }
  }
  return map;
}

/**
 * 從 localStorage 載入已完成任務表（瀏覽器環境防禦）
 */
export function loadCompletedTasks(): Record<string, boolean> {
  if (typeof window === "undefined") {
    return getInitialCompletedMap();
  }

  try {
    const raw = localStorage.getItem(SPRINT_STORAGE_KEY);
    if (!raw) {
      const initial = getInitialCompletedMap();
      localStorage.setItem(SPRINT_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      // 確保至少包含 defaultCompleted
      const initial = getInitialCompletedMap();
      return { ...initial, ...parsed };
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[sprint-storage] 讀取 localStorage 失敗，降級初始值", e);
  }

  return getInitialCompletedMap();
}

/**
 * 切換某任務完成狀態並寫入 localStorage
 */
export function toggleTaskInStorage(taskId: string): Record<string, boolean> {
  const current = loadCompletedTasks();
  const nextValue = !current[taskId];
  const updated = { ...current, [taskId]: nextValue };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SPRINT_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[sprint-storage] 寫入 localStorage 失敗", e);
    }
  }

  return updated;
}

export interface DaySprintStats {
  totalTasks: number;
  completedTasks: number;
  totalBricks: number;
  completedBricks: number;
  progressPercent: number;
}

/**
 * 計算指定日期的衝刺進度統計
 */
export function calculateDaySprintStats(
  day: SprintDay,
  tasks: SprintTask[],
  completedMap: Record<string, boolean>
): DaySprintStats {
  const dayTasks = tasks.filter((t) => t.day === day);
  const totalTasks = dayTasks.length;
  const completedTasks = dayTasks.filter((t) => !!completedMap[t.id]).length;

  // 番茄磚統計（brickNumber 有值者）
  const brickTasks = dayTasks.filter((t) => typeof t.brickNumber === "number");
  const totalBricks = brickTasks.length;
  const completedBricks = brickTasks.filter((t) => !!completedMap[t.id]).length;

  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalTasks,
    completedTasks,
    totalBricks,
    completedBricks,
    progressPercent,
  };
}

export interface OverallSprintStats {
  totalTasks: number;
  completedTasks: number;
  totalBricks: number;
  completedBricks: number;
  progressPercent: number;
}

/**
 * 計算三天整體的衝刺進度統計
 */
export function calculateOverallSprintStats(
  tasks: SprintTask[],
  completedMap: Record<string, boolean>
): OverallSprintStats {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => !!completedMap[t.id]).length;

  const brickTasks = tasks.filter((t) => typeof t.brickNumber === "number");
  const totalBricks = brickTasks.length;
  const completedBricks = brickTasks.filter((t) => !!completedMap[t.id]).length;

  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalTasks,
    completedTasks,
    totalBricks,
    completedBricks,
    progressPercent,
  };
}

