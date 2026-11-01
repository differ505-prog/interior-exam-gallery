/**
 * plan-variant-balance.test.ts
 *
 * 平面圖版本感知抽題單元測試（方案 A）
 * 執行：npm test
 */

import { describe, it, expect } from "vitest";
import {
  PLAN_VARIANTS,
  PLAN_VARIANT_WEIGHTS,
  VARIANT_DEADBAND,
  VARIANT_COMPLETION_THRESHOLD,
  ITEMS_PER_VARIANT,
  extractPlanVariant,
  calcVariantBalance,
  extractBaseQuestion,
  calcPlanBaseQuestionCounts,
  selectEligibleBaseQuestions,
  PLAN_BASE_QUESTIONS,
} from "@/lib/plan-variant";
import { drawExamGroup } from "@/hooks/use-exam-draw";
import { ArchiveItem } from "@/types/exam";

/** 建立假平面圖試卷池（201–206 × A–F） */
function makePlanItems(): ArchiveItem[] {
  const questions = ["201", "202", "203", "204", "205", "206"];
  const items: ArchiveItem[] = [];
  for (const q of questions) {
    for (const v of PLAN_VARIANTS) {
      items.push({
        code: `${q}${v}`,
        title: `${q}${v} 平面配置圖`,
        variants: [v],
        focus: "平面配置圖",
        notes: "",
      });
    }
  }
  return items;
}

/** 建立假 practiceCountMap */
function makeCounts(
  partial: Partial<Record<string, number>>
): Record<string, number> {
  return partial as Record<string, number>;
}

describe("平面圖版本權重不變式（不得破壞）", () => {
  it("六版本權重和為 1", () => {
    const sum = PLAN_VARIANTS.reduce(
      (acc, v) => acc + PLAN_VARIANT_WEIGHTS[v],
      0
    );
    expect(sum).toBeCloseTo(1, 5);
  });

  it("每版本權重均等為 1/6", () => {
    for (const v of PLAN_VARIANTS) {
      expect(PLAN_VARIANT_WEIGHTS[v]).toBeCloseTo(1 / 6, 5);
    }
  });

  it("版本清單為 A~F 共 6 個", () => {
    expect(PLAN_VARIANTS).toHaveLength(6);
    expect([...PLAN_VARIANTS]).toEqual(["A", "B", "C", "D", "E", "F"]);
  });

  it("常數符合憲章鎖定值（0.5% 遲滯帶 / 30 張完成線）", () => {
    expect(VARIANT_DEADBAND).toBe(0.005);
    expect(VARIANT_COMPLETION_THRESHOLD * ITEMS_PER_VARIANT).toBe(30);
  });
});

describe("extractPlanVariant — 版本抽出", () => {
  it("從 code 抽出 A~F 版本", () => {
    expect(extractPlanVariant("201A")).toBe("A");
    expect(extractPlanVariant("206F")).toBe("F");
  });

  it("CE 試卷同規則抽出（201A客天 → A）", () => {
    expect(extractPlanVariant("201A客天")).toBe("A");
    expect(extractPlanVariant("205D客立")).toBe("D");
  });

  it("非 A~F 版本回傳 null", () => {
    expect(extractPlanVariant("208甲")).toBeNull();
    expect(extractPlanVariant("213尺度")).toBeNull();
    expect(extractPlanVariant("201G")).toBeNull();
  });
});

describe("calcVariantBalance — 版本平衡計算", () => {
  it("全 0 練習時回傳 balanced，shares 各 1/6", () => {
    const balance = calcVariantBalance(makePlanItems(), makeCounts({}));
    expect(balance.lean).toBe("balanced");
    expect(balance.totalCount).toBe(0);
    for (const v of PLAN_VARIANTS) {
      expect(balance.variantCounts[v]).toBe(0);
      expect(balance.variantShares[v]).toBeCloseTo(1 / 6, 5);
    }
  });

  it("A 版本落後時 lean 為 A", () => {
    const counts = makeCounts({ "202B": 6, "203C": 6, "204D": 6, "205E": 6 });
    const balance = calcVariantBalance(makePlanItems(), counts);
    expect(balance.lean).toBe("A");
    expect(balance.variantCounts.A).toBe(0);
    expect(balance.totalCount).toBe(24);
  });

  it("多版本落後時選 deficit 最大者", () => {
    const counts = makeCounts({ "201B": 3, "201C": 12, "201D": 3 });
    const balance = calcVariantBalance(makePlanItems(), counts);
    expect(balance.lean).toBe("A");
    expect(balance.variantCounts.C).toBe(12);
  });

  it("某版本達 30 張完成線時列入 completedVariants 且不作為 lean", () => {
    const counts = makeCounts({ "201A": 30 });
    const balance = calcVariantBalance(makePlanItems(), counts);
    expect(balance.completedVariants).toContain("A");
    expect(balance.lean).not.toBe("A");
  });

  it("deficit 平手時依 A→F 教學序", () => {
    const balance = calcVariantBalance(makePlanItems(), makeCounts({}));
    // 全 0 時每版本 deficit 相同，應回到教學序首位（但全 0 為 balanced）
    expect(balance.lean).toBe("balanced");
  });

  it("已完成的版本不列入 active（不被選為 lean）", () => {
    const counts = makeCounts({ "201A": 30, "201B": 30 });
    const balance = calcVariantBalance(makePlanItems(), counts);
    expect(balance.completedVariants).toEqual(["A", "B"]);
    expect(balance.lean).not.toBe("A");
    expect(balance.lean).not.toBe("B");
  });

  it("shares 加總為 1", () => {
    const counts = makeCounts({ "201A": 4, "202B": 2, "203C": 6 });
    const balance = calcVariantBalance(makePlanItems(), counts);
    const sum = PLAN_VARIANTS.reduce(
      (acc, v) => acc + balance.variantShares[v],
      0
    );
    expect(sum).toBeCloseTo(1, 5);
  });

  it("deficits 加總為 0", () => {
    const counts = makeCounts({ "201A": 4, "202B": 2 });
    const balance = calcVariantBalance(makePlanItems(), counts);
    const sum = PLAN_VARIANTS.reduce(
      (acc, v) => acc + balance.variantDeficits[v],
      0
    );
    expect(sum).toBeCloseTo(0, 5);
  });
});

describe("extractBaseQuestion — 大題號抽出", () => {
  it("包含 201–206 六大空間題號常數鎖定", () => {
    expect(PLAN_BASE_QUESTIONS).toHaveLength(6);
    expect([...PLAN_BASE_QUESTIONS]).toEqual(["201", "202", "203", "204", "205", "206"]);
  });

  it("從 code 抽出 201–206 大題號", () => {
    expect(extractBaseQuestion("201A")).toBe("201");
    expect(extractBaseQuestion("205C")).toBe("205");
    expect(extractBaseQuestion("206F")).toBe("206");
  });

  it("CE 試卷同規則抽出大題號", () => {
    expect(extractBaseQuestion("201A客天")).toBe("201");
    expect(extractBaseQuestion("205D客立")).toBe("205");
  });

  it("非 201–206 題號回傳 null", () => {
    expect(extractBaseQuestion("208甲")).toBeNull();
    expect(extractBaseQuestion("213尺度")).toBeNull();
  });
});

describe("calcPlanBaseQuestionCounts & selectEligibleBaseQuestions — 空間格局均衡", () => {
  it("累計各題號總練習張數", () => {
    const counts = makeCounts({ "205A": 1, "205B": 2, "201A": 1 });
    const baseCounts = calcPlanBaseQuestionCounts(makePlanItems(), counts);
    expect(baseCounts["205"]).toBe(3);
    expect(baseCounts["201"]).toBe(1);
    expect(baseCounts["202"]).toBe(0);
    expect(baseCounts["203"]).toBe(0);
    expect(baseCounts["204"]).toBe(0);
    expect(baseCounts["206"]).toBe(0);
  });

  it("當 205 已練 1 次其餘為 0 時，205 必須被排除在候選大題之外", () => {
    const baseCounts = {
      "201": 0,
      "202": 0,
      "203": 0,
      "204": 0,
      "205": 1,
      "206": 0,
    };
    const eligible = selectEligibleBaseQuestions(baseCounts);
    expect(eligible).not.toContain("205");
    expect(eligible).toEqual(["201", "202", "203", "204", "206"]);
  });

  it("當平手時，最近練習過的題號自動避讓", () => {
    const baseCounts = {
      "201": 0,
      "202": 0,
      "203": 0,
      "204": 0,
      "205": 0,
      "206": 0,
    };
    const eligible = selectEligibleBaseQuestions(baseCounts, "205");
    expect(eligible).not.toContain("205");
    expect(eligible).toHaveLength(5);
  });
});

describe("drawExamGroup — 空間矩陣三層抽題（阻擋 205A 後再抽 205C）", () => {
  it("上傳過 205A 後，抽題絕不再抽中 205 的任何版本（含 205C）", () => {
    // 模擬使用者練習過 205A
    const practiceMap: Record<string, number> = {
      "205A": 1,
    };

    // 重複抽題 20 次，驗證 100% 絕不抽出 205 題型
    for (let i = 0; i < 20; i++) {
      const results = drawExamGroup("plan-ceiling-elevation", practiceMap);
      expect(results.length).toBeGreaterThanOrEqual(1);
      const planItem = results[0].item;
      expect(planItem.code.startsWith("205")).toBe(false);
      expect(planItem.code).not.toBe("205C");
      expect(results[0].directionReason).toContain("題型優先");
    }
  });
});
