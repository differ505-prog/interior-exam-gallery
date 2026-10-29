/**
 * question-note.test.ts
 *
 * 題型筆記單元測試（方案 A+）
 * 執行：npm test
 */

import { describe, it, expect } from "vitest";
import {
  QUESTION_NOTE_QUESTIONS,
  QUESTION_NOTE_VARIANTS,
  QUESTION_NOTE_CE_VIEWS,
  QUESTION_NOTE_KEY_PREFIX,
  buildQuestionNoteKey,
  parseQuestionNoteKey,
  extractQuestionNumber,
  isQuestionNoteQuestion,
  listQuestionNoteAffectedCodes,
  resolveQuestionNoteTarget,
} from "@/lib/question-note";

describe("題型筆記 key 建立與還原", () => {
  it("buildQuestionNoteKey 建立 qtype- 前綴 key", () => {
    expect(buildQuestionNoteKey("206")).toBe("qtype-206");
  });

  it("parseQuestionNoteKey 由 key 還原題號", () => {
    expect(parseQuestionNoteKey("qtype-206")).toBe("206");
  });

  it("parseQuestionNoteKey 對真實試卷 code 回傳 null", () => {
    expect(parseQuestionNoteKey("201A")).toBeNull();
  });

  it("parseQuestionNoteKey 對格式異常 key 回傳 null", () => {
    expect(parseQuestionNoteKey("qtype-20x")).toBeNull();
  });

  it("qtype- 為保留命名空間前綴，不與真實 code 相撞", () => {
    expect(QUESTION_NOTE_KEY_PREFIX).toBe("qtype-");
    const realCodes = [
      "201A",
      "206A客立",
      "208甲",
      "213",
      "213尺度",
    ];
    for (const code of realCodes) {
      expect(code.startsWith(QUESTION_NOTE_KEY_PREFIX)).toBe(false);
      expect(parseQuestionNoteKey(code)).toBeNull();
    }
  });
});

describe("extractQuestionNumber — 題號抽出", () => {
  it("從平面圖 code 抽出題號", () => {
    expect(extractQuestionNumber("206A")).toBe("206");
  });

  it("從天花立面 code 抽出題號", () => {
    expect(extractQuestionNumber("206A客立")).toBe("206");
  });

  it("透視圖 code 抽出 208", () => {
    expect(extractQuestionNumber("208甲")).toBe("208");
  });

  it("大樣圖 code 抽出 213", () => {
    expect(extractQuestionNumber("213")).toBe("213");
  });

  it("空字串回傳 null", () => {
    expect(extractQuestionNumber("")).toBeNull();
  });
});

describe("isQuestionNoteQuestion — 支援範圍", () => {
  it("201–206 為 true", () => {
    expect(isQuestionNoteQuestion("201")).toBe(true);
    expect(isQuestionNoteQuestion("206")).toBe(true);
  });

  it("208 / 213 為 false", () => {
    expect(isQuestionNoteQuestion("208")).toBe(false);
    expect(isQuestionNoteQuestion("213")).toBe(false);
  });

  it("支援清單為 6 個題號", () => {
    expect(QUESTION_NOTE_QUESTIONS).toHaveLength(6);
    expect([...QUESTION_NOTE_QUESTIONS]).toEqual([
      "201",
      "202",
      "203",
      "204",
      "205",
      "206",
    ]);
  });
});

describe("listQuestionNoteAffectedCodes — 同步範圍", () => {
  it("每題號受影響試卷數為 42", () => {
    expect(listQuestionNoteAffectedCodes("206")).toHaveLength(42);
  });

  it("前 6 筆為平面圖 A~F", () => {
    const codes = listQuestionNoteAffectedCodes("206");
    expect(codes.slice(0, 6)).toEqual([
      "206A",
      "206B",
      "206C",
      "206D",
      "206E",
      "206F",
    ]);
  });

  it("第 7 筆為 206A客立，最後一筆為 206F臥天（鎖定 view 順序）", () => {
    const codes = listQuestionNoteAffectedCodes("206");
    expect(codes[6]).toBe("206A客立");
    expect(codes[codes.length - 1]).toBe("206F臥天");
  });

  it("視角順序固定為 客立 / 餐立 / 臥立 / 客天 / 餐天 / 臥天", () => {
    expect([...QUESTION_NOTE_CE_VIEWS]).toEqual([
      "客立",
      "餐立",
      "臥立",
      "客天",
      "餐天",
      "臥天",
    ]);
    const codes = listQuestionNoteAffectedCodes("206");
    expect(codes.slice(6, 12)).toEqual([
      "206A客立",
      "206A餐立",
      "206A臥立",
      "206A客天",
      "206A餐天",
      "206A臥天",
    ]);
  });

  it("不包含任何 207 / 208 開頭的 code", () => {
    const codes = listQuestionNoteAffectedCodes("206");
    expect(codes.some((c) => c.startsWith("207"))).toBe(false);
    expect(codes.some((c) => c.startsWith("208"))).toBe(false);
  });

  it("版本字母為 A~F 共 6 個", () => {
    expect(QUESTION_NOTE_VARIANTS).toHaveLength(6);
  });
});

describe("resolveQuestionNoteTarget — 試卷解析", () => {
  it("同一題號的平面圖與天花立面試卷解析出同一個 key", () => {
    const plan = resolveQuestionNoteTarget("206C");
    const ceiling = resolveQuestionNoteTarget("206C客天");
    expect(plan).not.toBeNull();
    expect(ceiling).not.toBeNull();
    expect(plan?.key).toBe("qtype-206");
    expect(ceiling?.key).toBe(plan?.key);
    expect(ceiling?.question).toBe(plan?.question);
    expect(ceiling?.affectedCodes).toEqual(plan?.affectedCodes);
  });

  it("透視圖與大樣圖解析結果為 null", () => {
    expect(resolveQuestionNoteTarget("208甲")).toBeNull();
    expect(resolveQuestionNoteTarget("213")).toBeNull();
  });
});
