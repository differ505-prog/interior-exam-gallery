import { describe, expect, it } from "vitest";
import {
  PERSPECTIVE_BASE_QUESTIONS,
  extractPerspectiveBaseQuestion,
  calcPerspectiveBaseQuestionCounts,
  selectEligiblePerspectiveBaseQuestions,
} from "@/lib/perspective-matrix";
import { drawExamGroup } from "@/hooks/use-exam-draw";
import type { ArchiveItem } from "@/types/exam";

function mockPerspectiveItem(code: string): ArchiveItem {
  return {
    code,
    title: `透視圖 ${code}`,
    focus: "透視放樣重點",
    notes: "扣分點",
  };
}

describe("Perspective Matrix — 透視圖空間格局單一事實來源", () => {
  it("PERSPECTIVE_BASE_QUESTIONS 必須完整涵蓋 207–212 六個題號", () => {
    expect(PERSPECTIVE_BASE_QUESTIONS).toEqual([
      "207",
      "208",
      "209",
      "210",
      "211",
      "212",
    ]);
    expect(PERSPECTIVE_BASE_QUESTIONS).toHaveLength(6);
  });

  it("extractPerspectiveBaseQuestion 正確解析透視題號，非透視題回傳 null", () => {
    expect(extractPerspectiveBaseQuestion("207甲")).toBe("207");
    expect(extractPerspectiveBaseQuestion("208乙")).toBe("208");
    expect(extractPerspectiveBaseQuestion("212丙")).toBe("212");
    expect(extractPerspectiveBaseQuestion("201A")).toBeNull();
    expect(extractPerspectiveBaseQuestion("214")).toBeNull();
    expect(extractPerspectiveBaseQuestion("abc")).toBeNull();
  });

  it("calcPerspectiveBaseQuestionCounts 跨甲乙丙三向累計題號總次數", () => {
    const items: ArchiveItem[] = [
      mockPerspectiveItem("208甲"),
      mockPerspectiveItem("208乙"),
      mockPerspectiveItem("208丙"),
      mockPerspectiveItem("207甲"),
      mockPerspectiveItem("211乙"),
    ];

    const practiceCountMap: Record<string, number> = {
      "208甲": 2,
      "208乙": 1,
      "208丙": 3,
      "207甲": 4,
      "211乙": 5,
    };

    const counts = calcPerspectiveBaseQuestionCounts(items, practiceCountMap);
    expect(counts["208"]).toBe(6); // 2 + 1 + 3
    expect(counts["207"]).toBe(4);
    expect(counts["211"]).toBe(5);
    expect(counts["209"]).toBe(0);
    expect(counts["210"]).toBe(0);
    expect(counts["212"]).toBe(0);
  });

  it("selectEligiblePerspectiveBaseQuestions 挑選最少練習的題號", () => {
    const counts = {
      "207": 3,
      "208": 5,
      "209": 1,
      "210": 1,
      "211": 4,
      "212": 2,
    };

    const eligible = selectEligiblePerspectiveBaseQuestions(counts);
    expect(eligible).toEqual(["209", "210"]);
  });

  it("selectEligiblePerspectiveBaseQuestions 支援最近練習冷卻避讓", () => {
    const counts = {
      "207": 0,
      "208": 0,
      "209": 0,
      "210": 0,
      "211": 0,
      "212": 0,
    };

    // 剛練過 208，在同為 0 次平手時應避開 208
    const eligibleWithCooldown = selectEligiblePerspectiveBaseQuestions(
      counts,
      "208"
    );
    expect(eligibleWithCooldown).not.toContain("208");
    expect(eligibleWithCooldown).toHaveLength(5);
    expect(eligibleWithCooldown).toEqual(["207", "209", "210", "211", "212"]);
  });

  it("當最少練習題號僅剩 1 個時，即使等於 recentBase 也不得被冷卻過濾", () => {
    const counts = {
      "207": 2,
      "208": 0,
      "209": 2,
      "210": 2,
      "211": 2,
      "212": 2,
    };

    const eligible = selectEligiblePerspectiveBaseQuestions(counts, "208");
    expect(eligible).toEqual(["208"]);
  });
});

describe("Perspective Matrix 整合抽題驗證", () => {
  it("若某題號已在各向大量練習，系統必優先抽取生疏題號", () => {
    // 模擬 208 練過多次，其餘題號皆為 0
    const practiceMap: Record<string, number> = {
      "208甲": 2,
      "208乙": 2,
      "208丙": 2,
    };

    for (let i = 0; i < 20; i++) {
      const results = drawExamGroup("perspective-detail", practiceMap);
      const perspResult = results.find((r) =>
        r.item.code.startsWith("2") && r.item.code.match(/[甲乙丙]$/)
      );
      expect(perspResult).toBeDefined();
      // 抽出的題目絕對不能是已練 6 次的 208，必須為生疏題號 207, 209, 210, 211, 212 之一
      expect(perspResult!.item.code.startsWith("208")).toBe(false);
      expect(perspResult!.directionReason).toContain("優先補強生疏題號");
    }
  });

  it("各向完全平手時（如甲=2、乙=2、丙=2），系統必強制優先抽取甲向", () => {
    // 模擬使用者的實際情境：甲2、乙2、丙2 完全平手
    const practiceMap: Record<string, number> = {
      "208甲": 2,
      "208乙": 2,
      "208丙": 2,
    };

    for (let i = 0; i < 20; i++) {
      const results = drawExamGroup("perspective-detail", practiceMap);
      const perspResult = results.find((r) =>
        r.item.code.startsWith("2") && r.item.code.match(/[甲乙丙]$/)
      );
      expect(perspResult).toBeDefined();
      // 在平手時，必然抽甲向（不會抽到乙或丙）
      expect(perspResult!.item.code.endsWith("甲")).toBe(true);
      expect(perspResult!.directionReason).toContain("優先由甲向起步");
    }
  });
});

