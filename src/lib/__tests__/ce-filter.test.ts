import { describe, it, expect } from "vitest";
import { examSections } from "@/data/exam-content";

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

  it("filters correctly by 客廳天花", () => {
    const items = ceSection.items.filter(
      (item) => item.code.startsWith("201") && (item.view === "客天" || item.code.endsWith("客天"))
    );
    expect(items.length).toBe(6); // 201A ~ 201F 客天
    expect(items.every((i) => i.code.endsWith("客天"))).toBe(true);
  });

  it("filters correctly by 餐廳天花", () => {
    const items = ceSection.items.filter(
      (item) => item.code.startsWith("201") && (item.view === "餐天" || item.code.endsWith("餐天"))
    );
    expect(items.length).toBe(6);
    expect(items.every((i) => i.code.endsWith("餐天"))).toBe(true);
  });

  it("filters correctly by 主臥天花", () => {
    const items = ceSection.items.filter(
      (item) => item.code.startsWith("201") && (item.view === "臥天" || item.code.endsWith("臥天"))
    );
    expect(items.length).toBe(6);
    expect(items.every((i) => i.code.endsWith("臥天"))).toBe(true);
  });

  it("filters correctly by 全部天花", () => {
    const items = ceSection.items.filter(
      (item) => item.code.startsWith("201") && (item.view?.endsWith("天") || item.code.endsWith("客天") || item.code.endsWith("餐天") || item.code.endsWith("臥天"))
    );
    expect(items.length).toBe(18); // 6 variants * 3 ceiling views
  });
});
