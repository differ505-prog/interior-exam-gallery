import { describe, expect, it } from "vitest";
import { buildSheetDoc, getSectionCoverage } from "@/lib/sheet-reader";
import { resolveRequirementImageUrl } from "@/lib/requirement-resolver";
import type { ArchiveItem, UploadEntry } from "@/types/exam";
import type { SheetRegistry } from "@/types/sheet-registry";

function mockItem(code: string): ArchiveItem {
  return {
    code,
    title: `測試試卷 ${code}`,
    variants: ["A", "B", "C", "D", "E", "F"],
    focus: "測試重點",
    notes: "測試扣分點",
  };
}

function mockUpload(overrides: Partial<UploadEntry> & { sheetCode: string; imageUrl: string; kind: UploadEntry["kind"] }): UploadEntry {
  return {
    id: "mock-id",
    title: "測試圖面",
    category: "平面圖 201-206",
    sectionSlug: "plan",
    authorName: "管理員",
    scoreNote: "",
    teacherComment: "",
    weaknesses: [],
    createdAt: "2026-10-28T12:00:00Z",
    ...overrides,
  };
}

describe("SheetReader - buildSheetDoc", () => {
  it("平面圖 206C 傳入 answerUrl 時必須具備 2 頁且包含『需求單 C』", () => {
    const item = mockItem("206C");
    const doc = buildSheetDoc(item, "plan", "/images/plan/requirement-C.jpg");

    expect(doc).not.toBeNull();
    expect(doc?.code).toBe("206C");
    expect(doc?.pages).toHaveLength(2);
    expect(doc?.pages[0]).toEqual({
      url: "/images/plan/question-206.jpg",
      label: "題目圖",
      alt: "206C 題目圖",
    });
    expect(doc?.pages[1]).toEqual({
      url: "/images/plan/requirement-C.jpg",
      label: "需求單 C",
      alt: "206C 需求單 C",
      isAnswer: true,
    });
  });

  it("天花板與立面圖 201A客天 傳入 answerUrl 時標籤為『需求單 A』", () => {
    const item = mockItem("201A客天");
    const doc = buildSheetDoc(item, "ceiling-elevation", "/images/plan/requirement-A.jpg");

    expect(doc).not.toBeNull();
    expect(doc?.pages).toHaveLength(2);
    expect(doc?.pages[1].label).toBe("需求單 A");
    expect(doc?.pages[1].url).toBe("/images/plan/requirement-A.jpg");
  });

  it("大樣圖 214 傳入 answerUrl 時標籤為『官方答案圖』", () => {
    const item = mockItem("214");
    const doc = buildSheetDoc(item, "detail", "/images/214/214-answer.jpg");

    expect(doc).not.toBeNull();
    expect(doc?.pages).toHaveLength(2);
    expect(doc?.pages[1].label).toBe("官方答案圖");
  });

  it("建檔中心 registry 有值時，優先採用 registry 內容", () => {
    const item = mockItem("206C");
    const registry: SheetRegistry = {
      "plan:206C:question": {
        sectionSlug: "plan",
        code: "206C",
        slot: "question",
        url: "https://cloudinary.com/custom-question-206.jpg",
        prevUrl: null,
        prevAt: null,
        stagedUrl: null,
        stagedAt: null,
        updatedAt: "2026-10-28T12:00:00Z",
      },
      "plan:206C:answer": {
        sectionSlug: "plan",
        code: "206C",
        slot: "answer",
        url: "https://cloudinary.com/custom-requirement-c.jpg",
        prevUrl: null,
        prevAt: null,
        stagedUrl: null,
        stagedAt: null,
        updatedAt: "2026-10-28T12:00:00Z",
      },
    };

    const doc = buildSheetDoc(item, "plan", "/images/plan/requirement-C.jpg", registry);

    expect(doc?.pages[0].url).toBe("https://cloudinary.com/custom-question-206.jpg");
    expect(doc?.pages[1].url).toBe("https://cloudinary.com/custom-requirement-c.jpg");
  });

  it("若未提供 answerUrl 且 registry 無答案，平面圖僅回傳題目圖單頁", () => {
    const item = mockItem("206C");
    const doc = buildSheetDoc(item, "plan", null);

    expect(doc?.pages).toHaveLength(1);
    expect(doc?.pages[0].url).toBe("/images/plan/question-206.jpg");
  });

  it("各章節收錄進度總數不變性", () => {
    expect(getSectionCoverage("plan").total).toBe(36);
    expect(getSectionCoverage("ceiling-elevation").total).toBe(216);
    expect(getSectionCoverage("perspective").total).toBe(18);
    expect(getSectionCoverage("detail").total).toBe(12);
  });
});

describe("RequirementResolver - resolveRequirementImageUrl", () => {
  it("無任何覆寫上傳時，206C 正確 fallback 至 /images/plan/requirement-C.jpg", () => {
    const result = resolveRequirementImageUrl("plan", "206C", []);
    expect(result.url).toBe("/images/plan/requirement-C.jpg");
    expect(result.isOverride).toBe(false);
  });

  it("無任何覆寫上傳時，205A 正確 fallback 至 /images/plan/requirement-A.jpg（非 205 題目圖）", () => {
    const result = resolveRequirementImageUrl("plan", "205A", []);
    expect(result.url).toBe("/images/plan/requirement-A.jpg");
    expect(result.isOverride).toBe(false);
  });

  it("有共用需求圖上傳（plan-C）時，206C 優先採用該覆寫圖", () => {
    const overrideUpload = mockUpload({
      id: "shared-c-1",
      title: "C 版本共用需求圖",
      sheetCode: "plan-C",
      imageUrl: "https://cloudinary.com/shared-plan-c.jpg",
      kind: "標記試卷",
    });

    const result = resolveRequirementImageUrl("plan", "206C", [overrideUpload]);
    expect(result.url).toBe("https://cloudinary.com/shared-plan-c.jpg");
    expect(result.isOverride).toBe(true);
  });

  it("有專屬題號標記試卷（206C）時，優先於共用需求圖採用專屬圖", () => {
    const sharedUpload = mockUpload({
      id: "shared-c-1",
      title: "C 版本共用需求圖",
      sheetCode: "plan-C",
      imageUrl: "https://cloudinary.com/shared-plan-c.jpg",
      kind: "標記試卷",
    });
    const specificUpload = mockUpload({
      id: "spec-206c-1",
      title: "206C 專屬標記圖",
      sheetCode: "206C",
      imageUrl: "https://cloudinary.com/specific-206c.jpg",
      kind: "標記試卷",
    });

    const result = resolveRequirementImageUrl("plan", "206C", [sharedUpload, specificUpload]);
    expect(result.url).toBe("https://cloudinary.com/specific-206c.jpg");
    expect(result.isOverride).toBe(true);
  });
});
