import { describe, expect, it } from "vitest";
import { summarizeCardUploads } from "@/lib/upload-summary";
import type { UploadEntry } from "@/types/exam";

function mockUpload(overrides: Partial<UploadEntry>): UploadEntry {
  return {
    id: "test-1",
    title: "練習稿",
    category: "透視圖 207-212",
    sheetCode: "207乙",
    imageUrl: "https://example.com/a.jpg",
    kind: "我的練習圖",
    authorName: "Wade",
    scoreNote: "",
    teacherComment: "",
    weaknesses: [],
    createdAt: "2026-11-11T10:00:00.000Z",
    ...overrides,
  };
}

describe("summarizeCardUploads — 試卷卡上傳標注重構摘要", () => {
  it("空陣列回傳 hasUpload = false 與零值", () => {
    const res = summarizeCardUploads([]);
    expect(res.hasUpload).toBe(false);
    expect(res.hasMyPractice).toBe(false);
    expect(res.totalImageCount).toBe(0);
    expect(res.previewImageUrl).toBeNull();
  });

  it("正確計算「我的練習圖」多圖張數並優先選為縮圖", () => {
    const res = summarizeCardUploads([
      mockUpload({
        id: "ref-1",
        kind: "他人作品參考",
        title: "老師示範",
        imageUrl: "https://example.com/ref.jpg",
      }),
      mockUpload({
        id: "mine-1",
        kind: "我的練習圖",
        title: "207乙首戰線稿",
        imageUrl: "https://example.com/1.jpg",
        imageUrls: ["https://example.com/1.jpg", "https://example.com/2.jpg"],
      }),
    ]);

    expect(res.hasUpload).toBe(true);
    expect(res.hasMyPractice).toBe(true);
    expect(res.myEntryCount).toBe(1);
    expect(res.myImageCount).toBe(2);
    expect(res.refEntryCount).toBe(1);
    expect(res.refImageCount).toBe(1);
    expect(res.totalImageCount).toBe(3);
    expect(res.previewImageUrl).toBe("https://example.com/1.jpg");
    expect(res.latestTitle).toBe("207乙首戰線稿");
  });

  it("僅有「他人作品參考」或「標記試卷」時，hasMyPractice 為 false 但 hasUpload 為 true", () => {
    const res = summarizeCardUploads([
      mockUpload({
        kind: "標記試卷",
        title: "標記重點",
        imageUrl: "https://example.com/marked.jpg",
      }),
    ]);

    expect(res.hasUpload).toBe(true);
    expect(res.hasMyPractice).toBe(false);
    expect(res.myImageCount).toBe(0);
    expect(res.refImageCount).toBe(1);
    expect(res.previewImageUrl).toBe("https://example.com/marked.jpg");
  });
});
