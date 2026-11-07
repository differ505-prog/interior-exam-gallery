import { describe, expect, it } from "vitest";
import {
  hasPerspectiveSheets,
  resolvePerspectiveSheets,
} from "../perspective-sheets";

describe("perspective-sheets", () => {
  it("210 回傳正反面各一張（正面＝210-平面、背面＝210-立面）", () => {
    const pair = resolvePerspectiveSheets("210甲");
    expect(pair).not.toBeNull();
    expect(pair?.front).toBe("/images/210/210-平面.JPG");
    expect(pair?.back).toBe("/images/210/210-立面.JPG");
  });

  it("210 甲乙丙三向共用同一組題目卷", () => {
    expect(resolvePerspectiveSheets("210乙")).toEqual(
      resolvePerspectiveSheets("210甲"),
    );
    expect(resolvePerspectiveSheets("210丙")).toEqual(
      resolvePerspectiveSheets("210甲"),
    );
  });

  it("209 回傳正反面各一張（正面＝209-平面、背面＝209-立面）", () => {
    const pair = resolvePerspectiveSheets("209甲");
    expect(pair).not.toBeNull();
    expect(pair?.front).toBe("/images/209/209-平面.JPG");
    expect(pair?.back).toBe("/images/209/209-立面.JPG");
  });

  it("209 甲乙丙三向共用同一組題目卷", () => {
    expect(resolvePerspectiveSheets("209乙")).toEqual(
      resolvePerspectiveSheets("209甲"),
    );
    expect(resolvePerspectiveSheets("209丙")).toEqual(
      resolvePerspectiveSheets("209甲"),
    );
  });

  it("207 回傳正反面各一張（正面＝207-平面、背面＝207-立面）", () => {
    const pair = resolvePerspectiveSheets("207甲");
    expect(pair).not.toBeNull();
    expect(pair?.front).toBe("/images/207/207-平面.JPG");
    expect(pair?.back).toBe("/images/207/207-立面.JPG");
  });

  it("207 甲乙丙三向共用同一組題目卷", () => {
    expect(resolvePerspectiveSheets("207乙")).toEqual(
      resolvePerspectiveSheets("207甲"),
    );
    expect(resolvePerspectiveSheets("207丙")).toEqual(
      resolvePerspectiveSheets("207甲"),
    );
  });

  it("未建檔題號仍回傳 null（212）", () => {
    expect(resolvePerspectiveSheets("212甲")).toBeNull();
    expect(resolvePerspectiveSheets("212丙")).toBeNull();
    expect(hasPerspectiveSheets({ code: "212甲" } as never)).toBe(false);
  });
});
