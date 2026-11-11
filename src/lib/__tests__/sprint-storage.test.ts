import { describe, expect, it } from "vitest";
import {
  getInitialCompletedMap,
  calculateDaySprintStats,
  calculateOverallSprintStats,
} from "@/lib/sprint-storage";
import { SPRINT_TASKS } from "@/data/sprint-tasks";

describe("Sprint Storage — 考前 72 小時衝刺清單邏輯", () => {
  it("getInitialCompletedMap 包含預設完成的 221 首戰項目", () => {
    const initial = getInitialCompletedMap();
    expect(initial["task-1109-221"]).toBe(true);
    expect(initial["task-1109-brick1"]).toBeUndefined();
  });

  it("11/09 當日包含 1 筆首戰成就 ＋ 8 顆番茄磚 ＋ 1 筆外出中場", () => {
    const dayTasks = SPRINT_TASKS.filter((t) => t.day === "11/09");
    expect(dayTasks).toHaveLength(10);

    const bricks = dayTasks.filter((t) => typeof t.brickNumber === "number");
    expect(bricks).toHaveLength(8);
  });

  it("calculateDaySprintStats 正確計算 11/09 初始進度（221 已完成）", () => {
    const initial = getInitialCompletedMap();
    const stats = calculateDaySprintStats("11/09", SPRINT_TASKS, initial);

    expect(stats.totalTasks).toBe(10);
    expect(stats.completedTasks).toBe(1); // 221
    expect(stats.totalBricks).toBe(8);
    expect(stats.completedBricks).toBe(0);
    expect(stats.progressPercent).toBe(10); // 1 / 10 = 10%
  });

  it("勾選磚 1 與磚 2 後，進度百分比與磚數同步累加", () => {
    const map = {
      ...getInitialCompletedMap(),
      "task-1109-brick1": true,
      "task-1109-brick2": true,
    };
    const stats = calculateDaySprintStats("11/09", SPRINT_TASKS, map);

    expect(stats.completedTasks).toBe(3);
    expect(stats.completedBricks).toBe(2);
    expect(stats.progressPercent).toBe(30);
  });

  it("calculateOverallSprintStats 正確彙整 3 天總體任務與進度", () => {
    const map = getInitialCompletedMap();
    const overall = calculateOverallSprintStats(SPRINT_TASKS, map);

    expect(overall.totalTasks).toBe(SPRINT_TASKS.length);
    expect(overall.totalBricks).toBe(24); // 8 bricks * 3 days
    expect(overall.completedTasks).toBe(1);
  });

  it("11/12 考試當天包含晨間候考 3 動 ＋ 科目間午休 4 動，且具備止步邊界規範", () => {
    const dayTasks = SPRINT_TASKS.filter((t) => t.day === "11/12");
    expect(dayTasks).toHaveLength(7);
  });

  it("每個任務皆明確具備「止步邊界（不用做到底）」提醒，防止考前過度細化", () => {
    SPRINT_TASKS.forEach((task) => {
      expect(task.stopBoundary).toBeDefined();
      expect(task.stopBoundary.trim().length).toBeGreaterThan(10);
    });
  });

  it("每個任務皆明確具備「要不要標尺寸（dimensionRule）」規範", () => {
    SPRINT_TASKS.forEach((task) => {
      expect(task.dimensionRule).toBeDefined();
      expect(task.dimensionRule.trim().length).toBeGreaterThan(2);
    });
  });
});

