# Task — 題型筆記（方案 A+）實作清單

> 本檔案為本輪唯一待辦。舊任務已全數清空。
> 版本：v1.6 對應憲法 AGENTS.md 附錄 K
> 建立日期：2026-10-29
> 分支：`main`　遠端：`origin`（https://github.com/differ505-prog/interior-exam-gallery.git）

---

## 0. 目標（一句話）

新增「題型筆記」層：以**題號**（201–206）為單位，讓使用者寫一次 206 的筆記，同時在 206 的所有試卷（平面圖 6 張 + 天花板與立面 36 張，共 42 張）看得到並可編輯；同時在平面圖／天花立面區塊加入 201–206 六格總覽，讓使用者從區塊外就能發現「哪一題型有筆記」。

### 0.1 範圍決策（本輪已定案）

| 決策 | 結論 | 理由 |
|---|---|---|
| 筆記粒度 | 題號（201–206），非試卷 code、非版本字母 | 使用者原話：「206 的筆記可以同時顯示在 206 的 A~F 需求題」 |
| 共用範圍 | **跨區塊**：plan + ceiling-elevation 共用同一份 `206` 筆記 | 兩區塊共用同一張題目卷 `question-206.jpg` 與同一組需求單 `requirement-A~F.jpg`，題型條件完全相同 |
| 不涵蓋 | perspective（207–212）、detail（213–224） | 題號不在 201–206 內，題型語意不同，不共用 |
| 儲存 | 沿用 `public.user_data` 表，`sheet_code = "qtype-206"`，內容寫入 `scratch_note` 欄 | **零 migration**（遠端 Supabase 無法由本輪改 schema）；`qtype-*` 為保留命名空間，與任何真實試卷 code 不衝突 |
| 內容來源 | 使用者自寫（雲端同步），非官方備考內容 | 不涉及題庫內容鎖定，無臆造官方重點風險 |

### 0.2 既有程式碼事實（實作前須知道）

- 試卷 code 規則：plan = `206A`；ceiling-elevation = `206A客立` / `206A客天` 等 6 視角；perspective = `208甲`；detail = `213`。
- `src/lib/user-data.ts` 的 `getSheetData(sheetCode)` / `saveScratchNote(sheetCode, note)` 已具備 read-through cache（localStorage → Supabase → fallback）與 300ms 防抖，**本輪直接沿用，不重寫**。
- `src/app/page.tsx:99` 以 `cat.slug === section.slug` 過濾備考知識，但 `exam-notes.ts` 的 slug 是 `scale-tactics` / `208甲-detailed` / `208甲-coloring`，交集為空 → **備考知識面板目前全站不會渲染（本輪一併修復）**。
- 色彩 token 已於 `:root` 齊備（`--accent` / `--panel` / `--line` / `--muted` / `--space-*` / `--radius-*`），本輪**零新增 hex**。
- 標準斷點：`768px` / `1024px`（主）、`480px` / `1200px`（次）。本輪只用 `1024px` 與 `480px`。

### 0.3 全域禁令

- **禁止啟動任何本地 Web 伺服器**（`npm run dev` / `next dev` / `serve` / 任何佔用 Port 的指令）。驗證一律使用純靜態指令。
- `src/data/exam-content.ts` 的 `code` / `focus` / `notes` 一字不得改動（內容鎖定白名單）。
- 新增樣式一律使用 `var(--token)`，不得寫死 hex。
- `font-size` 寫死值 ≤ 6rem；`clamp()` 下限 ≥ 0.7rem。
- 不得新增標準斷點以外的 `@media`。

---

## 1. Step 依賴圖（嚴格依序執行，禁止跳步）

```
Step 0  Pre-flight 掃描
  ↓
Step 1  src/lib/question-note.ts + 測試          （純邏輯，無相依）
  ↓
Step 2  src/lib/user-data.ts                      （依賴 Step 1 的 key builder）
  ↓
Step 3  src/app/globals.css                       （依賴 Step 0 的 token 清單）
  ↓
Step 4  src/components/question-note-panel.tsx    （依賴 Step 2、3）
  ↓
Step 5  src/components/archive-detail-modal.tsx   （依賴 Step 4）
  ↓
Step 6  src/components/question-note-overview.tsx （依賴 Step 2、3）
  ↓
Step 7  src/components/archive-section-client.tsx （依賴 Step 6）
  ↓
Step 8  src/types/exam-note.ts + src/data/exam-notes.ts
  ↓
Step 9  src/app/page.tsx                          （依賴 Step 8）
  ↓
Step 10 AGENTS.md 修憲（附錄 C / G / K）
  ↓
Step 11 全域靜態驗收 + 最終 commit / push
```

---

## 2. Step 0 — Pre-flight 掃描（唯讀，不改檔）

**目標檔案**：無（唯讀指令）

**預期變更內容**：無變更。產出一份基準數字，供 Step 11 對比。

**執行指令**：

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/室內設計乙級"

# 1) 現有 token 用法基準
grep -rn "var(--" src/ | wc -l

# 2) 斷點清單（不得新增非標準值）
grep -rEho "@media \(max-width: [0-9]+px\)" src/ | sort | uniq -c | sort -rn

# 3) 寫死 hex 基準（本輪結束後此數字不得增加）
grep -rEn "color: #[0-9a-fA-F]{3,8}|background: #[0-9a-fA-F]{3,8}" src/ | wc -l

# 4) 元件清單（確認新檔名不重複）
ls src/components/ src/components/ui/

# 5) Git 基準
git status --short
git log --oneline -3
```

**本地驗證方式**：

```bash
npx tsc --noEmit          # 必須 exit 0
npm run lint              # 必須 exit 0（允許既有 warning，不得新增 error）
npm test                  # 必須 5 files / 51 tests 全綠
```

**完成後提交**：

```bash
git add -A
git commit -m "chore(preflight): 題型筆記實作前基準掃描" --allow-empty
git push origin main
```

---

## 3. Step 1 — 題型筆記純邏輯層

**目標檔案**：
- `src/lib/question-note.ts`（新建）
- `src/lib/__tests__/question-note.test.ts`（新建）

**預期變更內容**：

### 3.1 `src/lib/question-note.ts` 完整內容規格

純邏輯層，**不得 import React / KV / Cloudinary / Supabase**（比照 `src/lib/plan-variant.ts` 的既有規範）。

```ts
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
export const QUESTION_NOTE_QUESTIONS = ["201", "202", "203", "204", "205", "206"] as const;

export type QuestionNoteQuestion = (typeof QUESTION_NOTE_QUESTIONS)[number];

/** 平面圖需求單版本字母（A~F） */
export const QUESTION_NOTE_VARIANTS = ["A", "B", "C", "D", "E", "F"] as const;

/**
 * 天花板與立面圖的視角 suffix。
 * 順序比照 src/data/exam-content.ts 的生成順序：客立 / 餐立 / 臥立 / 客天 / 餐天 / 臥天。
 */
export const QUESTION_NOTE_CE_VIEWS = ["客立", "餐立", "臥立", "客天", "餐天", "臥天"] as const;

/** 題型筆記在 user_data.sheet_code 使用的保留命名空間前綴 */
export const QUESTION_NOTE_KEY_PREFIX = "qtype-";

/** 建立題型筆記的儲存 key："206" → "qtype-206" */
export function buildQuestionNoteKey(question: string): string;

/** 由儲存 key 還原題號："qtype-206" → "206"；不合法回 null */
export function parseQuestionNoteKey(sheetCode: string): string | null;

/** 由試卷 code 抽出題號："206A" → "206"；"206A客立" → "206"；"208甲" → "208"；"213" → "213" */
export function extractQuestionNumber(code: string): string | null;

/** 判斷題號是否落在題型筆記支援範圍（201–206） */
export function isQuestionNoteQuestion(question: string): boolean;

/** 列出某題號底下所有共用同一份題型筆記的試卷 code（平面圖 6 張 + 天花立面 36 張 = 42 張） */
export function listQuestionNoteAffectedCodes(question: string): string[];

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
export function resolveQuestionNoteTarget(code: string): QuestionNoteTarget | null;
```

**實作約束**：

- `extractQuestionNumber` 用 regex `/^(\d{3})/`，只取前三碼數字，不做任何字元清洗。
- `isQuestionNoteQuestion` 以 `QUESTION_NOTE_QUESTIONS.includes()` 判定。
- `listQuestionNoteAffectedCodes` 回傳順序固定：
  1. 平面圖：`${question}A` … `${question}F`（6 筆）
  2. 天花立面：外層 variant A→F，內層 view 依 `QUESTION_NOTE_CE_VIEWS` 順序（36 筆）
  3. 總計 42 筆，順序穩定不可變（測試會斷言）
- `resolveQuestionNoteTarget` 內部呼叫 `extractQuestionNumber` → `isQuestionNoteQuestion` → `buildQuestionNoteKey` → `listQuestionNoteAffectedCodes`。
- 不得在此檔案 import `@/data/exam-content`（避免資料層耦合，維護 code 為唯一來源）。

### 3.2 `src/lib/__tests__/question-note.test.ts` 測試規格

使用 `vitest`（既有設定，`globals: true`，別名 `@` 已設定）。至少 14 條測試：

| # | 斷言 |
|---|---|
| 1 | `buildQuestionNoteKey("206") === "qtype-206"` |
| 2 | `parseQuestionNoteKey("qtype-206") === "206"` |
| 3 | `parseQuestionNoteKey("201A") === null` |
| 4 | `parseQuestionNoteKey("qtype-20x") === null` |
| 5 | `extractQuestionNumber("206A") === "206"` |
| 6 | `extractQuestionNumber("206A客立") === "206"` |
| 7 | `extractQuestionNumber("208甲") === "208"` |
| 8 | `extractQuestionNumber("213") === "213"` |
| 9 | `extractQuestionNumber("") === null` |
| 10 | `isQuestionNoteQuestion("206") === true`；`isQuestionNoteQuestion("208") === false`；`isQuestionNoteQuestion("213") === false` |
| 11 | `listQuestionNoteAffectedCodes("206").length === 42` |
| 12 | 前 6 筆依序為 `206A,206B,206C,206D,206E,206F` |
| 13 | 第 7 筆為 `206A客立`；最後一筆為 `206F臥天`（鎖定 view 順序） |
| 14 | `resolveQuestionNoteTarget("206C")` 與 `resolveQuestionNoteTarget("206C客天")` 回傳**同一個 key**（`"qtype-206"`） |
| 15 | `resolveQuestionNoteTarget("208甲") === null`；`resolveQuestionNoteTarget("213") === null` |
| 16 | `listQuestionNoteAffectedCodes("206")` 不包含任何 `207` / `208` 開頭的 code |

**本地驗證方式**：

```bash
npx tsc --noEmit
npx vitest run src/lib/__tests__/question-note.test.ts
npm run lint
```

驗收標準：新增測試檔全綠（至少 16 passed）、`tsc --noEmit` exit 0、`npm run lint` exit 0。

**完成後提交**：

```bash
git add src/lib/question-note.ts src/lib/__tests__/question-note.test.ts
git commit -m "feat(question-note): 題型筆記純邏輯層與單元測試"
git push origin main
```

---

## 4. Step 2 — 題型筆記儲存層（沿用 user_data）

**目標檔案**：`src/lib/user-data.ts`（修改）

**前置依賴**：Step 1 完成（需 `buildQuestionNoteKey`）。

**預期變更內容**：

### 4.1 檔頭註解補上命名空間說明

在 `user-data.ts` 頂部既有註解塊之後補一段：

```ts
/**
 * 保留命名空間：
 * sheet_code 以 "qtype-<題號>"（例如 "qtype-206"）開頭的資料列，
 * 專供「題型筆記」使用（同一題號的所有試卷共用一份內容）。
 * 該命名空間與真實試卷 code（201A、206A客立…）不衝突。
 */
```

### 4.2 新增兩個匯出函式（放在 `saveScratchNote` 之後）

```ts
/**
 * 讀取題型筆記。
 * 以 "qtype-<題號>" 為 key 走既有 read-through cache（localStorage → Supabase → fallback）。
 *
 * @param question 題號，例如 "206"
 */
export async function getQuestionNote(question: string): Promise<string>;

/**
 * 寫入題型筆記。
 * 沿用既有 saveScratchNote 的「先寫 localStorage、再背景寫 Supabase」流程。
 * 題型筆記列不使用 teaching_links，固定寫入 []。
 *
 * @param question 題號，例如 "206"
 * @param note 筆記內容
 */
export async function saveQuestionNote(question: string, note: string): Promise<void>;
```

**實作約束**：

- 兩者皆以 `buildQuestionNoteKey(question)` 產生 key，需 `import { buildQuestionNoteKey } from "@/lib/question-note";`。
- `getQuestionNote` 內部呼叫既有 `getSheetData(key)`，取回 `.scratchNote`。
- `saveQuestionNote` 內部呼叫既有 `saveScratchNote(key, note)`。
- **不得**修改 `getSheetData` / `saveScratchNote` / `saveRemoteSheetData` 既有邏輯。
- `getQuestionNote` 必須容忍 Supabase 未設定（`isSupabaseConfigured === false`）→ 回傳空字串，不拋錯。

**本地驗證方式**：

```bash
npx tsc --noEmit
npm run lint
npm test
```

驗收標準：`tsc --noEmit` exit 0、`npm run lint` exit 0 且未新增 warning、`npm test` 全綠（既有 51 + Step 1 的 16 = 至少 67 passed）。

**完成後提交**：

```bash
git add src/lib/user-data.ts
git commit -m "feat(user-data): 新增題型筆記讀寫（qtype- 命名空間）"
git push origin main
```

---

## 5. Step 3 — 題型筆記樣式（Design Token 複用）

**目標檔案**：`src/app/globals.css`（修改）

**前置依賴**：Step 0 的 token 清單。

**預期變更內容**：

於既有 `.variant-cell` 相關區塊之後（或 `.scratch-pad` 區塊之後）新增兩組 class，**全部使用 `var(--token)`，零新增 hex**：

### 5.1 面板樣式（Modal 內）

```css
/* 題型筆記（跨版本共用，201–206） */
.qnote-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.qnote-panel__title {
  margin: 0;
}

.qnote-panel__scope {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  color: var(--muted);
  background: var(--accent-soft);
  border-radius: var(--radius-pill);
  padding: 3px 10px;
}

.qnote-panel__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.qnote-panel__input {
  width: 100%;
  min-height: 96px;
  padding: var(--space-3);
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--text);
  resize: vertical;
  transition: border-color var(--duration-fast) var(--ease-out);
}

.qnote-panel__input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.qnote-panel__meta {
  font-size: 0.75rem;
  color: var(--muted);
  text-align: right;
  margin: 0;
}

.qnote-panel__scope-list {
  margin-top: var(--space-2);
  font-size: 0.75rem;
  color: var(--muted);
}

.qnote-panel__scope-list > summary {
  cursor: pointer;
  letter-spacing: 0.02em;
}

.qnote-panel__scope-codes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-2);
  margin-top: var(--space-2);
}

.qnote-panel__scope-code {
  font-size: 0.7rem;
  letter-spacing: 0.02em;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  padding: 1px 8px;
}
```

### 5.2 總覽樣式（區塊六格）

```css
/* 題型筆記總覽（201–206 六格） */
.qnote-overview {
  margin-top: var(--space-4);
}

.qnote-overview__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.qnote-overview__title {
  margin: 0;
  font-size: 0.82rem;
  letter-spacing: 0.02em;
  color: var(--muted);
  text-transform: none;
}

.qnote-overview__grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--space-3);
}

.qnote-overview__cell {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  text-align: left;
  min-width: 0;
  padding: var(--space-4);
  background: var(--panel-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.qnote-overview__cell:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.qnote-overview__cell--active {
  border-color: var(--accent);
  background: var(--panel);
}

.qnote-overview__num {
  font-family: var(--font-display);
  font-size: 1.25rem;
  line-height: 1.25;
  color: var(--text-strong);
  letter-spacing: 0.01em;
}

.qnote-overview__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  color: var(--muted);
}

.qnote-overview__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--line-strong);
}

.qnote-overview__dot--filled {
  background: var(--accent);
}

.qnote-overview__preview {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.6;
  color: var(--muted);
  min-height: 3.2em; /* 鎖定 2 行高度，避免六格棋盤式錯位 */
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.qnote-overview__empty {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.6;
  color: var(--muted);
  min-height: 3.2em;
}

@media (max-width: 1024px) {
  .qnote-overview__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .qnote-overview__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)); /* §12：統計卡 ≤480px 改雙欄 */
  }
}
```

**實作約束**：

- 不得出現任何 `#hex`（Step 11 會以 grep 驗證 hex 數量未增加）。
- 不得新增 `@media` 以外的斷點值；只用 `1024px` 與 `480px`。
- `font-size` 最大值 `1.25rem`，遠低於 6rem 上限；`letter-spacing` 全部 ≤ 0.02em。
- `.qnote-overview__preview` 必須有 `min-height` 鎖定（§12-A 條文 3：並排 ≥3 張卡片標題行數不同會棋盤式錯位）。

**本地驗證方式**：

```bash
npx tsc --noEmit
npm run lint

# 斷點合規：結果只允許出現既有值
grep -rEho "@media \(max-width: [0-9]+px\)" src/ | sort | uniq -c | sort -rn

# hex 未增加（數字須與 Step 0 基準一致）
grep -rEn "color: #[0-9a-fA-F]{3,8}|background: #[0-9a-fA-F]{3,8}" src/ | wc -l

# 新樣式全部走 token
grep -n "qnote-" src/app/globals.css | wc -l
```

驗收標準：hex 數量與 Step 0 基準**相同**（未增加）、斷點清單未出現新值、`tsc` 與 `lint` exit 0。

**完成後提交**：

```bash
git add src/app/globals.css
git commit -m "feat(globals): 題型筆記面板與六格總覽樣式"
git push origin main
```

---

## 6. Step 4 — 題型筆記面板元件（Modal 內）

**目標檔案**：`src/components/question-note-panel.tsx`（新建）

**前置依賴**：Step 2（`getQuestionNote` / `saveQuestionNote`）、Step 3（class 已存在）。

**預期變更內容**：

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getQuestionNote, saveQuestionNote } from "@/lib/user-data";

type QuestionNotePanelProps = {
  /** 題號，例如 "206" */
  question: string;
  /** 受影響的試卷 code 清單（42 筆），用於展開同步範圍 */
  affectedCodes: string[];
};

/**
 * QuestionNotePanel
 * 題型筆記面板：以題號（201–206）為單位的共用筆記。
 * 同一題號的所有試卷（平面圖 6 張 + 天花板與立面 36 張）共用同一份內容。
 */
export function QuestionNotePanel({ question, affectedCodes }: QuestionNotePanelProps) {
  const [note, setNote] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionRef = useRef(question);
  questionRef.current = question;

  // 載入題型筆記
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const text = await getQuestionNote(question);
      if (cancelled) return;
      setNote(text);
    })();
    return () => { cancelled = true; };
  }, [question]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    setSaveStatus("saving");

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await saveQuestionNote(questionRef.current, val);
      setSaveStatus("saved");
      window.dispatchEvent(
        new CustomEvent("question-note-changed", { detail: questionRef.current })
      );
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <section className="modal-section modal-section--notes">
      <div className="qnote-panel__head">
        <h3 className="section-title qnote-panel__title">題型筆記（{question}）</h3>
        <span className="qnote-panel__scope">跨版本共用 · {affectedCodes.length} 張試卷同步</span>
      </div>

      <div className="qnote-panel__body">
        <textarea
          className="qnote-panel__input"
          value={note}
          onChange={handleChange}
          rows={4}
          aria-label={`${question} 題型筆記`}
          placeholder={`${question} 題型的共通提醒：空間條件、尺寸基準、尺寸鏈、易錯處。寫一次，${question}A~${question}F 與天花立面 ${question} 系列全部同步。`}
        />
        {saveStatus === "saving" ? (
          <p className="qnote-panel__meta">儲存中…</p>
        ) : saveStatus === "saved" ? (
          <p className="qnote-panel__meta">已自動暫存並同步至同題型試卷</p>
        ) : note ? (
          <p className="qnote-panel__meta">輸入時自動儲存</p>
        ) : null}
      </div>

      <details className="qnote-panel__scope-list">
        <summary>查看同步範圍（{affectedCodes.length} 張）</summary>
        <div className="qnote-panel__scope-codes">
          {affectedCodes.map((code) => (
            <span className="qnote-panel__scope-code" key={code}>{code}</span>
          ))}
        </div>
      </details>
    </section>
  );
}
```

**實作約束**：

- 沿用 `archive-detail-modal.tsx` 既有速記本的防抖與狀態機寫法（300ms、idle / saving / saved、2 秒回 idle），**不得改寫既有 `saveScratchNote` 語意**。
- 儲存成功後 dispatch `window` 事件 `question-note-changed`（detail = 題號），供 Step 6 的總覽即時刷新。
- `<textarea>` 必須有 `aria-label`；`<details>` / `<summary>` 使用原生元素，不引入新依賴。
- 本元件**不 import** `@/data/exam-content`，僅吃 props。
- 不得使用 `next lint` 不支援的 hook 規則（`useEffect` 依賴陣列須完整）。

**本地驗證方式**：

```bash
npx tsc --noEmit
npm run lint
npm test
```

驗收標準：三者全綠；`npm run lint` 不得出現本檔案的新 warning（`react-hooks/exhaustive-deps` 尤須檢查）。

**完成後提交**：

```bash
git add src/components/question-note-panel.tsx
git commit -m "feat(question-note): 題型筆記面板元件"
git push origin main
```

---

## 7. Step 5 — Modal 整合

**目標檔案**：`src/components/archive-detail-modal.tsx`（修改）

**前置依賴**：Step 4。

**預期變更內容**：

### 7.1 新增 import（放在既有 import 區，`@/lib/question-note` 與 `@/components/question-note-panel` 各一行）

```ts
import { resolveQuestionNoteTarget } from "@/lib/question-note";
import { QuestionNotePanel } from "@/components/question-note-panel";
```

### 7.2 在元件內新增衍生值（放在 `const [mounted, setMounted] = useState(false);` 區塊之後）

```ts
// 題型筆記目標：201–206 題號的試卷共用同一份筆記；perspective / detail 為 null
const questionNoteTarget = useMemo(
  () => resolveQuestionNoteTarget(item.code),
  [item.code]
);
```

（`useMemo` 已在該檔第 3 行 import，無需新增 import。）

### 7.3 插入面板（位置：**速記本區塊之前**，即 `{/* 速記本：作圖時自由記錄，之後彙整 */}` 註解上方）

```tsx
{/* 題型筆記：201–206 題號共用，跨版本同步 */}
{questionNoteTarget && (
  <QuestionNotePanel
    question={questionNoteTarget.question}
    affectedCodes={questionNoteTarget.affectedCodes}
  />
)}
```

**實作約束**：

- **不得**改動既有速記本區塊、標記試卷區塊、上傳區塊、备考知識區塊、教學資源區塊的任何一行。
- **不得**改動 `item.notes` / `item.focus` / `item.code` 的呈現方式。
- `questionNoteTarget` 為 `null`（perspective `208甲`、detail `213`）時，Modal **完全不出現**題型筆記區塊，不留空容器。
- 語意階層：本元件以 `<section className="modal-section modal-section--notes">` 承載，內含 `<h3 className="section-title">`，與 Modal 既有 h3 層級一致（不得引入 h4 以下語意標題）。

**本地驗證方式**：

```bash
npx tsc --noEmit
npm run lint
npm test

# 確認只新增 3 行、沒有破壞既有結構
git diff --stat src/components/archive-detail-modal.tsx
```

驗收標準：三者全綠；`git diff --stat` 顯示此檔變更行數 ≤ 15 行（2 行 import + 5 行 useMemo + 8 行 JSX）。

**完成後提交**：

```bash
git add src/components/archive-detail-modal.tsx
git commit -m "feat(modal): 試卷詳情整合題型筆記面板"
git push origin main
```

---

## 8. Step 6 — 題型筆記總覽元件（六格）

**目標檔案**：`src/components/question-note-overview.tsx`（新建）

**前置依賴**：Step 2（`getQuestionNote`）、Step 3（class 已存在）。

**預期變更內容**：

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { getQuestionNote } from "@/lib/user-data";
import { QUESTION_NOTE_QUESTIONS } from "@/lib/question-note";

type QuestionNoteOverviewProps = {
  /** 目前選取的題號，用於標示 highlight（aria-current） */
  activeQuestion?: string;
  /** 點擊某一格時切換題號篩選 */
  onSelectQuestion?: (question: string) => void;
};

/**
 * QuestionNoteOverview
 * 201–206 六格總覽：讓使用者不必開任何 Modal 就知道哪一題型已經寫過筆記。
 * 資料來源為題型筆記儲存層（qtype- 命名空間），與 Modal 面板同一份內容。
 */
export function QuestionNoteOverview({ activeQuestion, onSelectQuestion }: QuestionNoteOverviewProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const entries = await Promise.all(
      QUESTION_NOTE_QUESTIONS.map(async (q) => [q, await getQuestionNote(q)] as const)
    );
    setNotes(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    void load();
    const handler = () => { void load(); };
    window.addEventListener("question-note-changed", handler);
    return () => window.removeEventListener("question-note-changed", handler);
  }, [load]);

  return (
    <div className="qnote-overview">
      <div className="qnote-overview__head">
        <p className="qnote-overview__title">題型筆記（201–206 題號共用）</p>
        <p className="qnote-overview__title">點選題號可切換上方篩選</p>
      </div>

      <div className="qnote-overview__grid">
        {QUESTION_NOTE_QUESTIONS.map((question) => {
          const text = (notes[question] ?? "").trim();
          const hasNote = text.length > 0;
          const isActive = activeQuestion === question;
          return (
            <button
              key={question}
              type="button"
              className={`qnote-overview__cell${isActive ? " qnote-overview__cell--active" : ""}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => onSelectQuestion?.(question)}
            >
              <span className="qnote-overview__num">{question}</span>
              <span className="qnote-overview__status">
                <span className={`qnote-overview__dot${hasNote ? " qnote-overview__dot--filled" : ""}`} aria-hidden="true" />
                {hasNote ? `已記錄 ${text.length} 字` : "尚未記錄"}
              </span>
              {hasNote ? (
                <p className="qnote-overview__preview">{text}</p>
              ) : (
                <p className="qnote-overview__empty">點試卷卡的詳情開始記錄</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

**實作約束**：

- 六格視覺權重必須一致（§12-A 條文 2）；`--active` 僅代表「當前焦點」，用 `aria-current="true"` 標註語意，且底色差異維持低對比（`--panel` vs `--panel-soft`），**不得**改用全飽和 `--accent`。
- 每格至少 3 個資訊層級：題號 + 狀態（點/字數）+ 預覽文字（§12-B 條文 2）。
- 預覽文字不得使用 `dangerouslySetInnerHTML`。
- 監聽 `question-note-changed` 事件以即時刷新；元件卸載時必須移除 listener。
- 不得 import `@/data/exam-content`；題號清單由 `@/lib/question-note` 提供。

**本地驗證方式**：

```bash
npx tsc --noEmit
npm run lint
npm test
```

驗收標準：三者全綠；lint 不得出現本檔新 warning。

**完成後提交**：

```bash
git add src/components/question-note-overview.tsx
git commit -m "feat(question-note): 201–206 六格題型筆記總覽"
git push origin main
```

---

## 9. Step 7 — 區塊整合（平面圖 + 天花板與立面圖）

**目標檔案**：`src/components/archive-section-client.tsx`（修改）

**前置依賴**：Step 6。

**預期變更內容**：

### 9.1 新增 import

```ts
import { QuestionNoteOverview } from "@/components/question-note-overview";
```

### 9.2 平面圖區塊（`{isPlan && isExpanded && (...)}` 內）

位置：`</div>`（archive-filters 結束）之後、`{/* 使用引導：標記試卷上傳流程 */}` 之前，插入：

```tsx
<QuestionNoteOverview
  activeQuestion={selectedPlanQuestion}
  onSelectQuestion={(q) => setSelectedPlanQuestion(q)}
/>
```

### 9.3 天花板與立面圖區塊（`{isCeilingElevation && isExpanded && (...)}` 內）

位置：該區塊內**所有 filter-group 之後**（即 `空間立面` filter-group 結束後）、區塊 `</div>` 之前，插入：

```tsx
<QuestionNoteOverview
  activeQuestion={selectedQuestion}
  onSelectQuestion={(q) => setSelectedQuestion(q)}
/>
```

**實作約束**：

- 兩區塊使用**同一個元件**（DRY，憲法第六條）；只傳不同的 `activeQuestion` / `onSelectQuestion`。
- **不得**改動既有篩選邏輯（`filteredItems`）、上傳統計（`myUploads` / `completedKeys`）、卡片渲染迴圈。
- perspective / detail 區塊**不得**插入本元件（題號不在 201–206 範圍）。
- `onSelectQuestion` 僅切換既有 state，不得自行實作篩選。

**本地驗證方式**：

```bash
npx tsc --noEmit
npm run lint
npm test

git diff --stat src/components/archive-section-client.tsx
```

驗收標準：三者全綠；`git diff --stat` 顯示此檔變更 ≤ 12 行。

**完成後提交**：

```bash
git add src/components/archive-section-client.tsx
git commit -m "feat(archive): 平面圖與天花立面區塊接入題型筆記總覽"
git push origin main
```

---

## 10. Step 8 — 修復備考知識面板（slug 過濾 bug）

**目標檔案**：
- `src/types/exam-note.ts`（修改）
- `src/data/exam-notes.ts`（修改）

**前置依賴**：無（可與 Step 1–7 併行，但本清單要求依序執行）。

**背景**：`src/app/page.tsx` 以 `cat.slug === section.slug` 過濾備考知識分類，但分類 slug 為 `scale-tactics` / `208甲-detailed` / `208甲-coloring`，與 section slug（`plan` / `ceiling-elevation` / `perspective` / `detail`）交集為空 → 備考知識面板全站不渲染。本步驟改以「分類適用的 section」比對，並讓 208 甲的筆記只出現在 208 甲。

### 10.1 `src/types/exam-note.ts`

在 `ExamNoteCategory` 介面新增欄位（**既有欄位一律不得刪除或改型別**）：

```ts
export interface ExamNoteCategory {
  slug: string;
  title: string;
  description: string;
  icon: string;
  /** 本分類適用的章節 slug（plan / ceiling-elevation / perspective / detail）；未指定視為不適用任何章節 */
  sections?: string[];
  notes: ExamNote[];
}
```

### 10.2 `src/data/exam-notes.ts`

三個分類物件各補一行 `sections`：

| 分類 slug | 新增欄位 |
|---|---|
| `scale-tactics` | `sections: ["perspective"]` |
| `208甲-detailed` | `sections: ["perspective"]` |
| `208甲-coloring` | `sections: ["perspective"]` |

同時為 `208甲-detailed` 與 `208甲-coloring` 分類內的**所有筆記**補上 `relatedCodes: ["208甲"]`（既有欄位無損新增，不改動任何 `title` / `content` / `detail` / `tags` 文字）。

`scale-tactics` 的兩條筆記**不得**加 `relatedCodes`（比例尺為通用工具，需在所有透視圖題號可見）。

**實作約束**：

- **嚴禁**修改 `src/data/exam-notes.ts` 內任何既有文字內容（`title` / `content` / `detail` / `tags` / `description` / `icon`）。
- 只允許「新增 `sections` 欄位」與「新增 `relatedCodes` 欄位」兩種操作。
- 不得修改 `ExamNote` 介面中任何既有欄位。

**本地驗證方式**：

```bash
npx tsc --noEmit
npm run lint
npm test

# 確認只是新增欄位，沒有刪改既有文字
git diff --stat src/data/exam-notes.ts src/types/exam-note.ts
git diff src/data/exam-notes.ts | grep "^-" | grep -v "^---"   # 應只有被取代的同名行（- 舊行 + 新行），不得出現文字內容被刪
```

驗收標準：三者全綠；diff 僅呈現欄位新增。

**完成後提交**：

```bash
git add src/types/exam-note.ts src/data/exam-notes.ts
git commit -m "fix(exam-notes): 備考知識分類補 sections 與 208甲 relatedCodes"
git push origin main
```

---

## 11. Step 9 — 過濾邏輯修正

**目標檔案**：`src/app/page.tsx`（修改）

**前置依賴**：Step 8。

**預期變更內容**：

現行（第 99 行）：

```ts
const sectionExamNotes = examNotes.filter((cat) => cat.slug === section.slug);
```

改為：

```ts
const sectionExamNotes = examNotes.filter(
  (cat) => cat.sections?.includes(section.slug) ?? false
);
```

**實作約束**：

- **不得**改動 `page.tsx` 其他任何一行（含 `export const dynamic = "force-dynamic"`、`examSections.map` 的 JSX 結構、`Hero` 區塊）。
- 不得新增 import（`examSections` / `examNotes` 已存在）。
- 過濾後若為空陣列，`ArchiveDetailModal` 既有條件 `{examNotes && examNotes.length > 0 && (...)}` 會自動不渲染備考知識區塊 —— 此行為正確，不需另加防護。

**本地驗證方式**：

```bash
npx tsc --noEmit
npm run lint
npm test
git diff --stat src/app/page.tsx   # 應為 1 行修改
```

驗收標準：三者全綠；diff 僅 1 行。

**完成後提交**：

```bash
git add src/app/page.tsx
git commit -m "fix(page): 備考知識改以 sections 過濾章節"
git push origin main
```

---

## 12. Step 10 — 憲法修憲（AGENTS.md）

**目標檔案**：`AGENTS.md`（修改）

**前置依賴**：Step 1–9 全部完成（需先有實際實作結果再寫修憲記錄）。

**預期變更內容**：

### 12.1 版本號更新

檔頭版本行改為：

```
> 版本：v1.6（v1.1 整合 Gemini 分享內容，v1.2 整合 CE 對稱化，v1.3 整合透視圖方向感知抽題，v1.4 整合試卷閱讀器，v1.5 整合平面圖版本感知抽題，v1.6 整合題型筆記）
```

### 12.2 附錄 C 品牌詞庫新增一列

| 正確詞組 | 禁用替換 |
|---|---|
| 題型筆記 | 題型備註、共用筆記、共享筆記 |
| 速記本 | 備忘錄、草稿 |

### 12.3 附錄 G 檔案結構總覽新增四列

| 檔案 | 性質 | 說明 |
|---|---|---|
| `src/lib/question-note.ts` | 題型筆記單一事實來源 | 題號 ↔ 受影響試卷解析、`qtype-` key builder（v1.6 新增） |
| `src/lib/__tests__/question-note.test.ts` | 單元測試 | 16 條測試，含 42 筆同步範圍與 key 一致性不變式（v1.6 新增） |
| `src/components/question-note-panel.tsx` | Modal 內題型筆記面板 | 跨版本共用輸入框 + 同步範圍清單（v1.6 新增） |
| `src/components/question-note-overview.tsx` | 201–206 六格總覽 | 區塊級可發現性補丁（v1.6 新增） |

### 12.4 新增附錄 K

附錄 K 內容須包含：

- **更新日期**：2026-10-29
- **核心變更**：速記本（試卷級）之上新增題型筆記（題號級）層；同一題號 42 張試卷共用一份內容
- **範圍**：plan + ceiling-elevation，題號 201–206；perspective / detail 不適用
- **儲存**：`public.user_data` 之 `sheet_code = "qtype-<題號>"`，內容寫入 `scratch_note`，零 migration；`qtype-` 為保留命名空間
- **受影響檔案**：逐一列出 Step 1–9 觸及的全部檔案
- **不變式測試（阻擋迴歸）**：
  1. 同一題號的 plan 與 ceiling-elevation 試卷解析出**同一個** key
  2. 每題號受影響試卷數 === 42
  3. `qtype-` 命名空間不得與任何真實試卷 code 相撞
  4. perspective / detail 的 code 解析結果為 `null`
- **設計權重評估表**：沿用附錄 I 格式（資訊準確度 / 圖面可讀度 / 資訊層級 / RWD 穩健度 / 維護成本 / 跨 section 一致性 / 加權總分）

**實作約束**：

- 不得刪除或改寫既有附錄 A–J 的內容。
- 附錄 K 的「受影響檔案」清單必須與實際 git diff 一致（Step 11 會核對）。
- 附錄 D 信任錨點中的試卷總數 **不得** 因本輪變動（本輪未增刪任何試卷）。

**本地驗證方式**：

```bash
# 附錄完整性：K 必須存在
grep -n "附錄 K" AGENTS.md
grep -n "題型筆記" AGENTS.md | wc -l

# 既有附錄未遭破壞
grep -c "^# 附錄" AGENTS.md     # 應為 11（A~K）
```

驗收標準：`grep -n "附錄 K" AGENTS.md` 有輸出；附錄標題數為 11。

**完成後提交**：

```bash
git add AGENTS.md
git commit -m "docs(agents): 附錄 K 題型筆記與品牌詞庫同步"
git push origin main
```

---

## 13. Step 11 — 全域靜態驗收 + 最終交付

**目標檔案**：無新檔案（唯讀驗收）；必要時修正 Step 1–10 產出的瑕疵。

**驗收指令（全部純靜態，禁止啟動伺服器）**：

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/室內設計乙級"

# 1) 型別
npx tsc --noEmit

# 2) Lint
npm run lint

# 3) 單元測試（含 Step 1 新增 16 條）
npm test

# 4) 斷點合規（不得出現 1024 / 480 以外的新值）
grep -rEho "@media \(max-width: [0-9]+px\)" src/ | sort | uniq -c | sort -rn

# 5) hex 未增加（與 Step 0 基準一致）
grep -rEn "color: #[0-9a-fA-F]{3,8}|background: #[0-9a-fA-F]{3,8}" src/ | wc -l

# 6) 字級與字距合規
grep -rn "font-size:" src/app/globals.css | grep -E "font-size: [1-9][0-9]rem|font-size: [0-9]+\.[5-9]rem"
grep -rn "letter-spacing:" src/ | awk '$NF ~ /[0-9.]+em/ && $NF+0 > 0.05'

# 7) 題庫內容鎖定未被更動
git diff origin/main -- src/data/exam-content.ts   # 應為空

# 8) 變更檔案總覽
git diff --stat origin/main
git status --short
```

**驗收標準（全數必達）**：

| # | 項目 | 標準 |
|---|---|---|
| 1 | `npx tsc --noEmit` | exit 0 |
| 2 | `npm run lint` | exit 0，且本輪新檔案零 warning |
| 3 | `npm test` | 全綠，且至少 67 passed（既有 51 + 新增 16） |
| 4 | 斷點 | 未出現標準值以外的新 `@media (max-width: Npx)` |
| 5 | hex | 數量與 Step 0 基準一致（未增加） |
| 6 | 字級 / 字距 | 兩條 grep 均無輸出 |
| 7 | `exam-content.ts` | `git diff` 為空 |
| 8 | 工作區 | `git status --short` 僅剩 `task.md`（本檔案）或其他已提交項 |

**最終提交**：

```bash
git add -A
git commit -m "chore(release): 題型筆記方案 A+ 全域靜態驗收通過" --allow-empty
git push origin main
git log --oneline -12
```

---

## 14. 風險與回退

| 風險 | 影響 | 緩解 |
|---|---|---|
| `user_data` 的 `sheet_code` 寫入 `qtype-206` 與既有列衝突 | 使用者既有速記本遺失 | key 前綴 `qtype-` 與所有真實 code（`201A` / `206A客立` / `208甲` / `213`）不重疊；`user_data` 唯一鍵為 `(user_id, sheet_code)`，新命名空間獨立成列 |
| `saveScratchNote` 寫入時會帶 `teaching_links: []` | 該列的教學連結被清空 | 題型筆記列從不使用 teaching_links，且不與任何真實試卷 code 同列 |
| 備考知識過濾修正後出現空面板 | 透視圖以外章節不顯示備考知識 | Step 9 的 `sections` 過濾結果為空陣列時，Modal 既有條件已自動不渲染該區塊 |
| 六格總覽在 42 筆 code 展開時造成版面膨脹 | 資訊密度過高 | 同步範圍以 `<details>` 收合，預設收起；總覽只顯示每題前 2 行（`-webkit-line-clamp: 2`） |
| `qtype-` 列在 `user_data` 內數量無上限 | 長期使用後列數增長 | 僅 6 種題號（201–206），上限 6 列／使用者 |
| 中途失敗 | 半成品 | 每步驟皆已 commit + push，可逐步 `git revert` 或 `git reset --hard origin/main~1` 回退 |

---

## 15. 完成定義（DoD）

- [ ] Step 0–11 全部依序執行完畢，無跳步
- [ ] `npx tsc --noEmit` exit 0
- [ ] `npm run lint` exit 0，新檔案零 warning
- [ ] `npm test` 至少 67 passed
- [ ] 題庫 `src/data/exam-content.ts` diff 為空
- [ ] 新增 hex 數量為 0
- [ ] 新增斷點僅 `1024px` / `480px`
- [ ] `AGENTS.md` 附錄 K 完成，附錄數 11
- [ ] 每一步驟皆有對應 commit 並已 `git push origin main`
- [ ] `git status` 乾淨（除 task.md 外無未提交變更）
