import { describe, expect, it, beforeEach, vi } from "vitest";
import { getLocalNote, getAllLocalNotes, setLocalSheetData } from "../user-data";

class MockLocalStorage {
  private store: Record<string, string> = {};

  get length() {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe("User Data 速記本要點徽章邏輯 (方案 A+)", () => {
  beforeEach(() => {
    const mockStorage = new MockLocalStorage();
    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("window", {
      localStorage: mockStorage,
      dispatchEvent: vi.fn(),
    });
  });

  it("無任何筆記時，getLocalNote 回傳空字串", () => {
    expect(getLocalNote("201A")).toBe("");
  });

  it("新版 CACHE_KEY 有筆記時，getLocalNote 正確讀出並去除前後空白", () => {
    setLocalSheetData({
      sheetCode: "208甲",
      scratchNote: "  展示櫃頂務必留 39cm 缺口！  ",
      teachingLinks: [],
    });

    expect(getLocalNote("208甲")).toBe("展示櫃頂務必留 39cm 缺口！");
  });

  it("legacy scratch:<code\> 有筆記時，getLocalNote 可成功降級回退讀取", () => {
    localStorage.setItem("scratch:207乙", JSON.stringify("玄關櫃深 40cm、大門留 90cm 動線"));

    expect(getLocalNote("207乙")).toBe("玄關櫃深 40cm、大門留 90cm 動線");
  });

  it("getAllLocalNotes 能正確彙整所有題目的非空速記要點", () => {
    setLocalSheetData({
      sheetCode: "208甲",
      scratchNote: "展櫃 39cm 缺口",
      teachingLinks: [],
    });
    setLocalSheetData({
      sheetCode: "201A",
      scratchNote: "  ", // 空白應被略過
      teachingLinks: [],
    });
    localStorage.setItem("scratch:221", JSON.stringify("門框節點上吊軌構造"));

    const all = getAllLocalNotes();
    expect(all["208甲"]).toBe("展櫃 39cm 缺口");
    expect(all["221"]).toBe("門框節點上吊軌構造");
    expect(all["201A"]).toBeUndefined();
  });
});
