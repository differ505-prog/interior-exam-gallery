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
} from "@/lib/plan-variant";
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
