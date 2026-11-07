import { describe, expect, it } from "vitest";
import {
  extractCEView,
  calcCEViewCounts,
  selectBestCEItem,
  CE_VIEWS,
} from "@/lib/ce-matrix";
import { examSections } from "@/data/exam-content";

const allCeItems =
  examSections.find((s) => s.slug === "ceiling-elevation")?.items ?? [];

describe("CE Matrix — 天花/立面視角平衡單一事實來源", () => {
  it("CE_VIEWS 涵蓋客/餐/臥之天花與立面共 6 視角", () => {
    expect(CE_VIEWS).toEqual([
      "客天",
      "餐天",
      "臥天",
      "客立",
      "餐立",
      "臥立",
    ]);
  });

  it("extractCEView 精確解析各類後綴", () => {
    expect(extractCEView("201A客天")).toBe("客天");
    expect(extractCEView("203C餐天")).toBe("餐天");
    expect(extractCEView("205E臥天")).toBe("臥天");
    expect(extractCEView("202B客立")).toBe("客立");
    expect(extractCEView("204D餐立")).toBe("餐立");
    expect(extractCEView("206F臥立")).toBe("臥立");
    expect(extractCEView("201A")).toBeNull();
  });

  it("calcCEViewCounts 跨題號精確累計全題庫視角次數", () => {
    const practiceMap: Record<string, number> = {
      "201A臥天": 1,
      "202B臥天": 2,
      "203C餐天": 1,
      "204D客立": 3,
    };

    const counts = calcCEViewCounts(allCeItems, practiceMap);
    expect(counts["臥天"]).toBe(3);
    expect(counts["餐天"]).toBe(1);
    expect(counts["客天"]).toBe(0);
    expect(counts["客立"]).toBe(3);
    expect(counts["餐立"]).toBe(0);
    expect(counts["臥立"]).toBe(0);
  });

  it("【核心使用者痛點復現】當主臥天花與餐廳天花已練、客天為0時，新題必抽客廳天花", () => {
    // 模擬使用者的真實狀態：曾練過臥天(1)與餐天(1)，全庫客天為 0
    const practiceMap: Record<string, number> = {
      "201A臥天": 1,
      "202B餐天": 1,
    };

    // 本次平面圖抽中 203C，候選 6 張 CE 試卷（在當題皆為 0 次）
    const matching203C = allCeItems.filter((i) => i.code.startsWith("203C"));
    expect(matching203C).toHaveLength(6);

    // 強制輪到天花板（targetCategory: "ceiling"）
    const result = selectBestCEItem({
      matchingCeItems: matching203C,
      allCeItems,
      practiceCountMap: practiceMap,
      targetCategory: "ceiling",
    });

    expect(result).not.toBeNull();
    // 絕不能抽到已練過的臥天或餐天，必須精準抽出客天！
    expect(result!.item.code).toBe("203C客天");
    expect(result!.reason).toContain("客廳天花");
    expect(result!.reason).toContain("全庫僅練 0 次");
  });

  it("全庫視角皆為 0 平手時，天花依教學序優先抽客天", () => {
    const practiceMap: Record<string, number> = {};
    const matching201A = allCeItems.filter((i) => i.code.startsWith("201A"));

    const result = selectBestCEItem({
      matchingCeItems: matching201A,
      allCeItems,
      practiceCountMap: practiceMap,
      targetCategory: "ceiling",
    });

    expect(result).not.toBeNull();
    expect(result!.item.code).toBe("201A客天");
    expect(result!.reason).toContain("客廳天花");
  });

  it("當輪到立面圖時，生疏立面優先", () => {
    const practiceMap: Record<string, number> = {
      "201A客立": 2,
      "201A餐立": 1,
    };
    const matching202B = allCeItems.filter((i) => i.code.startsWith("202B"));

    const result = selectBestCEItem({
      matchingCeItems: matching202B,
      allCeItems,
      practiceCountMap: practiceMap,
      targetCategory: "elevation",
    });

    expect(result).not.toBeNull();
    expect(result!.item.code).toBe("202B臥立");
    expect(result!.reason).toContain("主臥立面");
  });

  it("auto 模式下，總量落後的池別自動被選為目標池", () => {
    // 天花共練 3 次，立面共練 1 次 -> 必補立面
    const practiceMap: Record<string, number> = {
      "201A客天": 1,
      "201A餐天": 1,
      "201A臥天": 1,
      "201A客立": 1,
    };
    const matching203C = allCeItems.filter((i) => i.code.startsWith("203C"));

    const result = selectBestCEItem({
      matchingCeItems: matching203C,
      allCeItems,
      practiceCountMap: practiceMap,
      targetCategory: "auto",
    });

    expect(result).not.toBeNull();
    expect(result!.item.code.endsWith("立")).toBe(true);
    expect(result!.reason).toContain("立面圖落後補強");
  });
});
