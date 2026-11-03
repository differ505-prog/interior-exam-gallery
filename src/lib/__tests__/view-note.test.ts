import { describe, expect, it } from "vitest";
import {
  VIEW_NOTE_TYPES,
  VIEW_NOTE_METAS,
  buildViewNoteKey,
  parseViewNoteKey,
  listAffectedSheetsByView,
  resolveViewNoteTarget,
} from "../view-note";
import { examNotes } from "@/data/exam-notes";

describe("view-note 單一事實來源", () => {
  it("應恰好定義 10 大工法專項視角", () => {
    expect(VIEW_NOTE_TYPES).toHaveLength(10);
    expect(VIEW_NOTE_TYPES).toEqual([
      "1vp-perspective",
      "2vp-perspective",
      "dining-ceiling",
      "living-ceiling",
      "bedroom-ceiling",
      "dining-elevation",
      "living-elevation",
      "bedroom-elevation",
      "detail-drawing",
      "plan-universal",
    ]);
  });

  it("每一種視角皆有完整的元資料定義，且 affectedCount 吻合", () => {
    for (const type of VIEW_NOTE_TYPES) {
      const meta = VIEW_NOTE_METAS[type];
      expect(meta).toBeDefined();
      expect(meta.title).toBeTruthy();
      expect(meta.shortLabel).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.placeholder).toBeTruthy();

      const affected = listAffectedSheetsByView(type);
      expect(affected).toHaveLength(meta.affectedCount);

      // 集合內不得有重複
      const uniqueCodes = new Set(affected);
      expect(uniqueCodes.size).toBe(meta.affectedCount);
    }
  });

  it("透視圖視角試卷張數恆等式：一消點 6 張 + 二消點 12 張 = 18 張", () => {
    const vp1 = listAffectedSheetsByView("1vp-perspective");
    const vp2 = listAffectedSheetsByView("2vp-perspective");

    expect(vp1).toEqual([
      "207甲",
      "208甲",
      "209甲",
      "210甲",
      "211甲",
      "212甲",
    ]);
    expect(vp2).toHaveLength(12);
    expect(vp2).toContain("207乙");
    expect(vp2).toContain("207丙");
    expect(vp2).toContain("212乙");
    expect(vp2).toContain("212丙");

    expect(vp1.length + vp2.length).toBe(18);
  });

  it("大樣圖工法專項試卷張數恆為 12 張（213–224）", () => {
    const detailList = listAffectedSheetsByView("detail-drawing");
    expect(detailList).toHaveLength(12);
    expect(detailList[0]).toBe("213");
    expect(detailList[detailList.length - 1]).toBe("224");
  });

  it("平面圖通用規範試卷張數恆為 36 張（201–206 A–F）", () => {
    const planList = listAffectedSheetsByView("plan-universal");
    expect(planList).toHaveLength(36);
    expect(planList[0]).toBe("201A");
    expect(planList[planList.length - 1]).toBe("206F");
  });

  it("天花板與立面圖各視角試卷張數恆為 36 張（6 題型 × 6 版型）", () => {
    const ceViews = [
      "dining-ceiling",
      "living-ceiling",
      "bedroom-ceiling",
      "dining-elevation",
      "living-elevation",
      "bedroom-elevation",
    ] as const;

    for (const v of ceViews) {
      const list = listAffectedSheetsByView(v);
      expect(list).toHaveLength(36);
      expect(list[0]).toMatch(/^201A/);
      expect(list[list.length - 1]).toMatch(/^206F/);
    }
  });

  it("buildViewNoteKey 與 parseViewNoteKey 滿足雙向還原不變式", () => {
    for (const type of VIEW_NOTE_TYPES) {
      const key = buildViewNoteKey(type);
      expect(key).toBe(`vnote-${type}`);
      const parsed = parseViewNoteKey(key);
      expect(parsed).toBe(type);
    }
    expect(parseViewNoteKey("invalid-key")).toBeNull();
    expect(parseViewNoteKey("vnote-unknown-view")).toBeNull();
  });

  describe("resolveViewNoteTarget 目標解析", () => {
    it("正確解析透視圖 1VP（甲向）與 2VP（乙/丙向）", () => {
      const target1 = resolveViewNoteTarget("208甲");
      expect(target1).not.toBeNull();
      expect(target1?.type).toBe("1vp-perspective");
      expect(target1?.affectedCodes).toHaveLength(6);

      const target2 = resolveViewNoteTarget("208乙");
      expect(target2).not.toBeNull();
      expect(target2?.type).toBe("2vp-perspective");
      expect(target2?.affectedCodes).toHaveLength(12);

      const target3 = resolveViewNoteTarget("210丙");
      expect(target3?.type).toBe("2vp-perspective");
    });

    it("正確解析天花板與立面 6 大視角", () => {
      expect(resolveViewNoteTarget("201A客天", "客天")?.type).toBe("living-ceiling");
      expect(resolveViewNoteTarget("206C餐天", "餐天")?.type).toBe("dining-ceiling");
      expect(resolveViewNoteTarget("204B臥天", "臥天")?.type).toBe("bedroom-ceiling");
      expect(resolveViewNoteTarget("202D客立", "客立")?.type).toBe("living-elevation");
      expect(resolveViewNoteTarget("205E餐立", "餐立")?.type).toBe("dining-elevation");
      expect(resolveViewNoteTarget("203F臥立", "臥立")?.type).toBe("bedroom-elevation");
    });

    it("即使未傳入 view 參數，也能從 code 後綴安全辨識", () => {
      expect(resolveViewNoteTarget("201A客天")?.type).toBe("living-ceiling");
      expect(resolveViewNoteTarget("205C餐立")?.type).toBe("dining-elevation");
    });

    it("正確解析大樣圖 213~224 全體 12 題共用 detail-drawing 專用筆記", () => {
      for (let q = 213; q <= 224; q++) {
        const target = resolveViewNoteTarget(String(q));
        expect(target).not.toBeNull();
        expect(target?.type).toBe("detail-drawing");
        expect(target?.affectedCodes).toHaveLength(12);
        expect(target?.affectedCodes).toContain("213");
        expect(target?.affectedCodes).toContain("224");
      }
      expect(resolveViewNoteTarget("detail-215")?.type).toBe("detail-drawing");
    });

    it("正確解析平面圖 201~206 A~F 全體 36 張共用 plan-universal 通用筆記", () => {
      const target1 = resolveViewNoteTarget("201A");
      expect(target1).not.toBeNull();
      expect(target1?.type).toBe("plan-universal");
      expect(target1?.affectedCodes).toHaveLength(36);
      expect(target1?.affectedCodes).toContain("201A");
      expect(target1?.affectedCodes).toContain("206F");

      const target2 = resolveViewNoteTarget("206F");
      expect(target2?.type).toBe("plan-universal");
      expect(resolveViewNoteTarget("plan-203C")?.type).toBe("plan-universal");
    });

    it("未知試卷代碼安全回傳 null", () => {
      expect(resolveViewNoteTarget("unknown")).toBeNull();
      expect(resolveViewNoteTarget("999X")).toBeNull();
    });
  });

  describe("examNotes 備考知識庫結構與純淨度", () => {
    it("透視圖不應包含未經考證的 AI 自創要領（1vp 與 2vp 已自知識庫移除，保留主權筆記）", () => {
      const vp1 = examNotes.find((c) => c.slug === "1vp-perspective");
      const vp2 = examNotes.find((c) => c.slug === "2vp-perspective");
      expect(vp1).toBeUndefined();
      expect(vp2).toBeUndefined();
    });

    it("比例尺實戰工具 scale-tactics 應完整保留以供尺規換算", () => {
      const scaleTool = examNotes.find((c) => c.slug === "scale-tactics");
      expect(scaleTool).toBeDefined();
      expect(scaleTool!.notes.length).toBeGreaterThanOrEqual(2);
    });
  });
});
