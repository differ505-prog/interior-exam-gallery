/**
 * practice-stats.test.ts
 *
 * 透視圖抽題邏輯單元測試（v2）
 * 執行：npm test
 */

import { describe, it, expect } from "vitest";
import {
  PERSPECTIVE_DIRECTION_WEIGHTS,
  DIRECTION_VP_MAP,
  VP_TARGET_RATIO,
  extractPerspectiveDirection,
  calcPerspectiveBalance,
  PerspectiveDirection,
} from "@/hooks/use-exam-draw";
import { countPracticePerItem } from "@/lib/practice-stats";
import { ArchiveItem } from "@/types/exam";
import { UPLOAD_KINDS } from "@/lib/upload-constants";

describe("透視圖方向權重不變式（不得破壞）", () => {
  it("三向權重和為 1", () => {
    const sum =
      PERSPECTIVE_DIRECTION_WEIGHTS.甲 +
      PERSPECTIVE_DIRECTION_WEIGHTS.乙 +
      PERSPECTIVE_DIRECTION_WEIGHTS.丙;
    expect(sum).toBeCloseTo(1, 5);
  });

  it("二消點佔比 = 1 − 一消點佔比（考場比例 1:2）", () => {
    const oneVP = VP_TARGET_RATIO["1VP"];
    const twoVP = VP_TARGET_RATIO["2VP"];
    expect(oneVP + twoVP).toBeCloseTo(1, 5);
    expect(twoVP / oneVP).toBeCloseTo(2, 2); // 二消點 : 一消點 = 2 : 1
  });

  it("甲向 = 一消點，乙丙向 = 二消點", () => {
    expect(DIRECTION_VP_MAP.甲).toBe("1VP");
    expect(DIRECTION_VP_MAP.乙).toBe("2VP");
    expect(DIRECTION_VP_MAP.丙).toBe("2VP");
  });
});

describe("extractPerspectiveDirection — 方向抽出", () => {
  it("從 code 末字抽出方向", () => {
    expect(extractPerspectiveDirection("208甲")).toBe("甲");
    expect(extractPerspectiveDirection("212乙")).toBe("乙");
    expect(extractPerspectiveDirection("207丙")).toBe("丙");
  });

  it("非透視題回傳 null", () => {
    expect(extractPerspectiveDirection("201A")).toBeNull();
    expect(extractPerspectiveDirection("213尺度")).toBeNull();
  });
});

describe("countPracticePerItem — 圖片張數統計", () => {
  it("同一題上傳 2 張圖，回傳 2（非去重後的 1）", () => {
    const items: ArchiveItem[] = [
      { code: "208甲", title: "", variants: [], focus: "", notes: "" },
    ];
    const uploads = [
      {
        id: "1",
        sheetCode: "208甲",
        kind: UPLOAD_KINDS.MY_PRACTICE,
        imageUrl: "a.jpg",
        imageUrls: ["a.jpg", "b.jpg"],
        title: "",
        category: "",
        authorName: "",
        scoreNote: "",
        teacherComment: "",
        weaknesses: [],
        createdAt: "",
      } as any,
    ];
    const result = countPracticePerItem(items, uploads);
    expect(result["208甲"]).toBe(2);
  });

  it("無 imageUrls 時以 imageUrl 為 1 張", () => {
    const items: ArchiveItem[] = [
      { code: "207乙", title: "", variants: [], focus: "", notes: "" },
    ];
    const uploads = [
      {
        id: "2",
        sheetCode: "207乙",
        kind: UPLOAD_KINDS.MY_PRACTICE,
        imageUrl: "c.jpg",
        imageUrls: undefined,
        title: "",
        category: "",
        authorName: "",
        scoreNote: "",
        teacherComment: "",
        weaknesses: [],
        createdAt: "",
      } as any,
    ];
    const result = countPracticePerItem(items, uploads);
    expect(result["207乙"]).toBe(1);
  });
});

describe("calcPerspectiveBalance — 方向平衡計算", () => {
  it("三向皆為 0 時，回傳 balanced", () => {
    const items: ArchiveItem[] = [
      { code: "207甲", title: "", variants: [], focus: "", notes: "" },
      { code: "207乙", title: "", variants: [], focus: "", notes: "" },
      { code: "207丙", title: "", variants: [], focus: "", notes: "" },
    ];
    const balance = calcPerspectiveBalance(items, []);
    expect(balance.lean).toBe("balanced");
    expect(balance.totalCount).toBe(0);
    expect(balance.directionCounts.甲).toBe(0);
    expect(balance.directionCounts.乙).toBe(0);
    expect(balance.directionCounts.丙).toBe(0);
  });

  it("甲向 50 張、乙丙各 0 張時，lean 為乙或丙（deficit 最大）", () => {
    const items: ArchiveItem[] = [
      { code: "207甲", title: "", variants: [], focus: "", notes: "" },
      { code: "207乙", title: "", variants: [], focus: "", notes: "" },
      { code: "207丙", title: "", variants: [], focus: "", notes: "" },
    ];
    const uploads = [
      {
        id: "1",
        sheetCode: "207甲",
        kind: UPLOAD_KINDS.MY_PRACTICE,
        imageUrl: "x.jpg",
        imageUrls: Array.from({ length: 50 }, (_, i) => `${i}.jpg`),
        title: "",
        category: "",
        authorName: "",
        scoreNote: "",
        teacherComment: "",
        weaknesses: [],
        createdAt: "",
      } as any,
    ];
    const balance = calcPerspectiveBalance(items, uploads);
    expect(balance.lean).not.toBe("甲");
    expect(balance.directionCounts.甲).toBe(50);
    expect(balance.directionCounts.乙).toBe(0);
    expect(balance.directionCounts.丙).toBe(0);
    expect(balance.totalCount).toBe(50);
  });

  it("甲向已達完成門檻（30 張）時，自動排除", () => {
    const items: ArchiveItem[] = [
      { code: "207甲", title: "", variants: [], focus: "", notes: "" },
      { code: "207乙", title: "", variants: [], focus: "", notes: "" },
      { code: "207丙", title: "", variants: [], focus: "", notes: "" },
    ];
    const uploads = [
      {
        id: "1",
        sheetCode: "207甲",
        kind: UPLOAD_KINDS.MY_PRACTICE,
        imageUrl: "x.jpg",
        imageUrls: Array.from({ length: 30 }, (_, i) => `${i}.jpg`),
        title: "",
        category: "",
        authorName: "",
        scoreNote: "",
        teacherComment: "",
        weaknesses: [],
        createdAt: "",
      } as any,
    ];
    const balance = calcPerspectiveBalance(items, uploads);
    expect(balance.completedDirections).toContain("甲");
    expect(balance.lean).not.toBe("甲");
  });
});
