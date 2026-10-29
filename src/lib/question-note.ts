/**
 * question-note.ts
 *
 * 題型筆記（Question Type Note）單一事實來源（Single Source of Truth）。
 *
 * 設計背景：
 * 速記本（scratch note）以「試卷 code」為 key（201A、206F 各有一份）。
 * 但 201–206 題型的題目卷（question-2xx.jpg）與需求單（requirement-A~F.jpg）
 * 在同一題號的 A~F 版本之間完全相同，使用者若把「206 題型的共通提醒」
 * 分別寫進 6 份速記本，會出現內容漂移與維護負擔。
 *
 * 本模組建立「題型筆記」層：以題號（201–206）為 key，
 * 同一題號底下全部試卷共用同一份筆記。
 *
 * 純邏輯層：不得 import React / KV / Cloudinary / Supabase。
 */

/** 支援題型筆記的題號清單（與 plan / ceiling-elevation 的題號空間一致） */
export const QUESTION_NOTE_QUESTIONS = [
  "201",
  "202",
  "203",
  "204",
  "205",
  "206",
] as const;

export type QuestionNoteQuestion = (typeof QUESTION_NOTE_QUESTIONS)[number];

/** 平面圖需求單版本字母（A~F） */
export const QUESTION_NOTE_VARIANTS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
] as const;

/**
 * 天花板與立面圖的視角 suffix。
 * 順序比照 src/data/exam-content.ts 的生成順序：客立 / 餐立 / 臥立 / 客天 / 餐天 / 臥天。
 */
export const QUESTION_NOTE_CE_VIEWS = [
  "客立",
  "餐立",
  "臥立",
  "客天",
  "餐天",
  "臥天",
] as const;

/** 題型筆記在 user_data.sheet_code 使用的保留命名空間前綴 */
export const QUESTION_NOTE_KEY_PREFIX = "qtype-";

/** 建立題型筆記的儲存 key："206" → "qtype-206" */
export function buildQuestionNoteKey(question: string): string {
  return `${QUESTION_NOTE_KEY_PREFIX}${question}`;
}

/** 由儲存 key 還原題號："qtype-206" → "206"；不合法回 null */
export function parseQuestionNoteKey(sheetCode: string): string | null {
  if (!sheetCode.startsWith(QUESTION_NOTE_KEY_PREFIX)) return null;
  const question = sheetCode.slice(QUESTION_NOTE_KEY_PREFIX.length);
  if (!/^\d{3}$/.test(question)) return null;
  return question;
}

/** 由試卷 code 抽出題號："206A" → "206"；"206A客立" → "206"；"208甲" → "208"；"213" → "213" */
export function extractQuestionNumber(code: string): string | null {
  const match = code.match(/^(\d{3})/);
  return match ? match[1] : null;
}

/** 判斷題號是否落在題型筆記支援範圍（201–206） */
export function isQuestionNoteQuestion(question: string): boolean {
  return (
    (QUESTION_NOTE_QUESTIONS as readonly string[]).includes(question)
  );
}

/**
 * 列出某題號底下所有共用同一份題型筆記的試卷 code
 * （平面圖 6 張 + 天花立面 36 張 = 42 張）。
 */
export function listQuestionNoteAffectedCodes(question: string): string[] {
  const codes: string[] = [];

  // 1. 平面圖：${question}A … ${question}F
  for (const variant of QUESTION_NOTE_VARIANTS) {
    codes.push(`${question}${variant}`);
  }

  // 2. 天花板與立面圖：外層 variant A→F，內層 view 依固定順序
  for (const variant of QUESTION_NOTE_VARIANTS) {
    for (const view of QUESTION_NOTE_CE_VIEWS) {
      codes.push(`${question}${variant}${view}`);
    }
  }

  return codes;
}

/** 題型筆記解析結果 */
export type QuestionNoteTarget = {
  /** 題號，例如 "206" */
  question: string;
  /** 儲存 key，例如 "qtype-206" */
  key: string;
  /** 受影響的試卷 code 清單（42 筆） */
  affectedCodes: string[];
};

/**
 * 由試卷 code 解析題型筆記目標。
 * 該試卷不屬於 201–206（perspective / detail）或 code 格式異常時回 null。
 */
export function resolveQuestionNoteTarget(
  code: string
): QuestionNoteTarget | null {
  const question = extractQuestionNumber(code);
  if (!question) return null;
  if (!isQuestionNoteQuestion(question)) return null;

  return {
    question,
    key: buildQuestionNoteKey(question),
    affectedCodes: listQuestionNoteAffectedCodes(question),
  };
}
