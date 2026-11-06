import { describe, expect, it } from "vitest";
import {
  ZOOM_LEVELS,
  ZOOM_SCALE_OPTIONS,
  cycleZoomLevel,
  getNextZoomActionTitle,
  getNextZoomLevel,
  getPrevZoomLevel,
  getZoomTitle,
  normalizeZoomLevel,
} from "@/lib/zoom-scale";

describe("zoom-scale 單一事實來源", () => {
  it("縮放等級必須包含 fit 與 5 個數值檔位，共 6 階", () => {
    expect(ZOOM_LEVELS).toEqual(["fit", "1000", "1200", "1400", "1800", "2200"]);
    expect(ZOOM_SCALE_OPTIONS).toHaveLength(6);
  });

  it("數值尺寸檔位必須嚴格遞增", () => {
    const numericWidths = ZOOM_SCALE_OPTIONS.filter((o) => typeof o.width === "number").map((o) => o.width!);
    expect(numericWidths).toEqual([1000, 1200, 1400, 1800, 2200]);
    for (let i = 1; i < numericWidths.length; i++) {
      expect(numericWidths[i]).toBeGreaterThan(numericWidths[i - 1]);
    }
  });

  it("getNextZoomLevel 必須依序放大，到達 2200 時維持 2200", () => {
    expect(getNextZoomLevel("fit")).toBe("1000");
    expect(getNextZoomLevel("1000")).toBe("1200");
    expect(getNextZoomLevel("1200")).toBe("1400");
    expect(getNextZoomLevel("1400")).toBe("1800");
    expect(getNextZoomLevel("1800")).toBe("2200");
    expect(getNextZoomLevel("2200")).toBe("2200");
  });

  it("getPrevZoomLevel 必須依序縮小，到達 fit 時維持 fit", () => {
    expect(getPrevZoomLevel("2200")).toBe("1800");
    expect(getPrevZoomLevel("1800")).toBe("1400");
    expect(getPrevZoomLevel("1400")).toBe("1200");
    expect(getPrevZoomLevel("1200")).toBe("1000");
    expect(getPrevZoomLevel("1000")).toBe("fit");
    expect(getPrevZoomLevel("fit")).toBe("fit");
  });

  it("cycleZoomLevel 循環步進，到底時自動折返回 fit", () => {
    expect(cycleZoomLevel("fit")).toBe("1000");
    expect(cycleZoomLevel("1000")).toBe("1200");
    expect(cycleZoomLevel("1200")).toBe("1400");
    expect(cycleZoomLevel("1400")).toBe("1800");
    expect(cycleZoomLevel("1800")).toBe("2200");
    expect(cycleZoomLevel("2200")).toBe("fit");
  });

  it("normalizeZoomLevel 正確相容舊版 medium/large 與非法值", () => {
    expect(normalizeZoomLevel("medium")).toBe("1400");
    expect(normalizeZoomLevel("large")).toBe("2200");
    expect(normalizeZoomLevel("1200")).toBe("1200");
    expect(normalizeZoomLevel("unknown")).toBe("fit");
    expect(normalizeZoomLevel(null)).toBe("fit");
  });

  it("getZoomTitle 與 getNextZoomActionTitle 產出合規引導文案", () => {
    expect(getZoomTitle("1200")).toContain("1200px");
    expect(getZoomTitle("1200")).toContain("甜蜜點");
    expect(getNextZoomActionTitle("1200")).toBe("點擊放大至 1400px");
    expect(getNextZoomActionTitle("2200")).toBe("點擊恢復符合視窗");
  });
});

