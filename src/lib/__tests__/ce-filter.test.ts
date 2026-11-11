import { describe, it, expect } from "vitest";
import { examSections } from "@/data/exam-content";
import {
  CE_QUICK_ZONE_PRESETS,
  filterCeilingElevationItems,
} from "@/lib/ce-filter";

describe("Ceiling & Elevation space filter logic", () => {
  const ceSection = examSections.find((s) => s.slug === "ceiling-elevation")!;

  it("CE section has exactly 216 items", () => {
    expect(ceSection.items.length).toBe(216);
  });

  it("each variant has exactly 6 items: 客天, 餐天, 臥天, 客立, 餐立, 臥立", () => {
    const items201A = ceSection.items.filter((i) => i.code.startsWith("201A"));
    expect(items201A.length).toBe(6);

    const codes = items201A.map((i) => i.code);
    expect(codes).toContain("201A客天");
    expect(codes).toContain("201A餐天");
    expect(codes).toContain("201A臥天");
    expect(codes).toContain("201A客立");
    expect(codes).toContain("201A餐立");
    expect(codes).toContain("201A臥立");
  });

  it("單題篩選（201）：客廳天花/餐廳天花/主臥天花各 6 張、全部天花 18 張", () => {
    expect(filterCeilingElevationItems(ceSection.items, "201", "客廳天花")).toHaveLength(6);
    expect(filterCeilingElevationItems(ceSection.items, "201", "餐廳天花")).toHaveLength(6);
    expect(filterCeilingElevationItems(ceSection.items, "201", "主臥天花")).toHaveLength(6);
    expect(filterCeilingElevationItems(ceSection.items, "201", "全部天花")).toHaveLength(18);
  });

  it("跨題全庫篩選（全部題號）：各特定區域天花板或立面皆剛好 36 張", () => {
    const livingCeiling = filterCeilingElevationItems(ceSection.items, "全部", "客廳天花");
    expect(livingCeiling).toHaveLength(36);
    expect(livingCeiling.every((i) => i.view === "客天")).toBe(true);

    const diningCeiling = filterCeilingElevationItems(ceSection.items, "全部", "餐廳天花");
    expect(diningCeiling).toHaveLength(36);
    expect(diningCeiling.every((i) => i.view === "餐天")).toBe(true);

    const bedroomCeiling = filterCeilingElevationItems(ceSection.items, "全部", "主臥天花");
    expect(bedroomCeiling).toHaveLength(36);
    expect(bedroomCeiling.every((i) => i.view === "臥天")).toBe(true);

    const livingElevation = filterCeilingElevationItems(ceSection.items, "全部", "客廳立面");
    expect(livingElevation).toHaveLength(36);
    expect(livingElevation.every((i) => i.view === "客立")).toBe(true);

    const diningElevation = filterCeilingElevationItems(ceSection.items, "全部", "餐廳立面");
    expect(diningElevation).toHaveLength(36);
    expect(diningElevation.every((i) => i.view === "餐立")).toBe(true);

    const bedroomElevation = filterCeilingElevationItems(ceSection.items, "全部", "主臥立面");
    expect(bedroomElevation).toHaveLength(36);
    expect(bedroomElevation.every((i) => i.view === "臥立")).toBe(true);
  });

  it("跨題全庫篩選（全部題號）：全庫所有天花與所有立面各 108 張、全覽 216 張", () => {
    expect(filterCeilingElevationItems(ceSection.items, "全部", "全部天花")).toHaveLength(108);
    expect(filterCeilingElevationItems(ceSection.items, "全部", "全部立面")).toHaveLength(108);
    expect(filterCeilingElevationItems(ceSection.items, "全部", "全部")).toHaveLength(216);
  });

  it("CE_QUICK_ZONE_PRESETS 每一組預設捷徑與實際篩選筆數完全吻合", () => {
    for (const preset of CE_QUICK_ZONE_PRESETS) {
      const matched = filterCeilingElevationItems(
        ceSection.items,
        preset.question,
        preset.type
      );
      expect(matched).toHaveLength(preset.expectedCount);
    }
  });
});
