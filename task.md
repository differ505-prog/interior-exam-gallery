# 方案 S — 建檔中心（Sheet Registry）

> 版本：v1.0　目標分數：**9.1 / 10**　生效日期：2026-10-22
> **本文件完全取代前一份 `task.md`（方案 E 試卷閱讀器）。** 舊任務與過期紀錄已全部抹除。
> 前提：方案 E 已於 commit `7bee5a0` 落地，SheetReader 為現存且可複用元件，本方案建構於其上。

---

## 0. 給執行模型的三條硬規則

1. **不得修改 `src/data/exam-content.ts` 的 `code` / `focus` / `notes` 欄位**（憲法第六條）。本方案完全不碰這個檔案。
2. **不得臆測 CSS 變數名稱**（SOP 9）。可用的 token 僅限 §3.3 白名單，其餘一律視為不存在。
3. **每一個 Phase 結束前必須跑該 Phase 的驗證指令**，輸出不符合「預期」就停下回報，不可跳過往下做。

---

## 1. 方案分數拆解

| 軸 | 分數 | 權重 | 說明 |
|---|---|---|---|
| 每次入檔速度 | 10 | 25% | 瀏覽器直傳，不開 IDE、不等部署 |
| 開發成本 | 7 | 20% | 1 頁面 + 3 端點 + 1 hash，複用 6 個既有元件 |
| 內容治理 | 10 | 20% | 三態變更單 + curator 閘，覆寫需明確核准 |
| 可追溯 / 回滾 | 9 | 15% | 保留上一版 + 一鍵回滾 + 稽核欄位 |
| 長期維護 | 9 | 20% | registry 成為「缺圖」單一事實來源 |
| **加權總分** | **9.1** | | |

**為什麼不是 10**：KV 沒有 Git 級別不可竄改紀錄（回滾靠自建欄位）；且多了一個後台頁與 token 設定需要維護。

---

## 2. 現況盤點（2026-10-22 已用 `ls` 驗證，非記憶）

### 2.1 圖檔實際存在清單

```
public/images/plan/     question-202.jpg  question-205.jpg  requirement-A.jpg  requirement-B.jpg
                        （各另有 .trim.jpg）
public/images/208/      2021021722093353239 (2).jpg  2021021722093353239 (1).jpg
public/images/211/      211-平面.JPG  211-立面.JPG
public/images/213/      213-question.jpg  213-answer.jpg  213-official-answer.jpg
public/images/222/      222-question.jpg  222-answer.jpg
public/images/224/      224-question.jpg  224-answer.jpg
```

### 2.2 待建檔清單（本方案要解決的缺口）

| 區塊 | 缺什麼 | 缺幾張 |
|---|---|---|
| 平面圖題目圖 | 201、203、204、206（`question-{num}.jpg`） | 4 |
| 共用需求圖 | requirement-C / D / E / F | 4 |
| 透視圖題目卷 | 207、209、210、212（每題正反兩面） | 8 |
| 大樣圖 | 214–221、223（每題題目 + 答案） | 18 |
| **合計** | | **34 張 / 17 個題號** |

> 已建檔但未接線者：**無**。`src/lib/perspective-sheets.ts` 已含 208 與 211（commit `1593831`）。

### 2.3 兩個既有地雷（必須處理，不可略過）

**地雷 A — 不得沿用 `practice_entries`。**
`src/lib/kv-store.ts` 的 `kvPushEntry` 在 List 長度超過 `MAX_ENTRIES = 200` 時會 `LPOP` 丟棄最舊一筆。若把試卷建檔塞進同一個 List，276 張 × 2 頁 = 552 筆，會**靜默吃掉使用者的練習紀錄**。本方案改用 **Hash** `sheet_registry`，不設上限。

**地雷 B — 共用需求圖上傳無寫入閘。**
`src/app/api/uploads/route.ts` 的覆寫分支 `if (confirmOverride && parsedKey)` 沒有任何身分驗證，任何訪客都能覆寫官方需求圖。本方案在 Phase 10 補上 curator token 驗證。

---

## 3. 設計決策與資料模型

### 3.1 KV 結構

| 項目 | 值 |
|---|---|
| KV Key | `sheet_registry`（Hash，非 List） |
| Field key | `${sectionSlug}:${code}:${slot}`，例：`plan:201A:question` |
| 單筆上限 | 無（Hash 不會 LPOP） |
| 讀取 | `HGETALL` → 轉 `SheetRecord[]` |

### 3.2 三態變更單（核心機制）

| 狀態 | 欄位 | 意義 | 前台是否可見 |
|---|---|---|---|
| 草稿（客戶端） | — | 使用者選好檔案、尚未上傳 | 否 |
| 待核准 | `stagedUrl` | 已上傳 Cloudinary，等待 curator 核准 | **否** |
| 生效 | `url` | 前台唯一讀取的欄位 | 是 |
| 上一版 | `prevUrl` / `prevAt` | 回滾來源 | 否 |

**不變式**：`resolveSlotUrl()` 只讀 `url`，永遠不讀 `stagedUrl`。這就是治理分的來源——待核准的圖在物理上不可能出現在前台。

### 3.3 CSS Token 白名單（`globals.css` `:root` 實際定義，禁臆測）

```
色彩  --bg  --bg-deep  --panel  --panel-soft  --line  --line-strong
      --text  --text-strong  --muted  --on-accent
      --accent  --accent-soft  --accent-strong
      --danger  --danger-soft
      --overlay-deep  --surface-frosted
陰影  --shadow  --shadow-sm
半徑  --radius-lg  --radius-md  --radius-sm  --radius-pill
間距  --space-1  --space-2  --space-3  --space-4  --space-5
      --space-6  --space-8  --space-10  --space-12  --space-16
      ⚠️ 不存在 --space-7 / --space-9 / --space-11
字體  --font-sans  --font-display
字距  --tracking-tight  --tracking-snug  --tracking-wide
動態  --ease-out  --duration-fast  --duration-base
容器  --container  --container-tight
```

### 3.4 可複用的既有元件（不要重寫）

| 元件／模組 | 位置 | 用途 |
|---|---|---|
| `SheetReader` | `src/components/sheet-reader.tsx` | 建檔中心預覽試卷 |
| `SafeImage` | `src/components/ui/safe-image.tsx` | 縮圖 + 載入失敗 fallback |
| `SurfacePanel` `EmptyState` `SkeletonGrid` `Eyebrow` | `src/components/ui/primitives.tsx` | 版面骨架與空狀態 |
| `buildSheetDoc` | `src/lib/sheet-reader.ts` | 題號 → URL 單一事實來源 |
| `cloudinary` `cloudinaryFolder` `hasCloudinaryEnv` | `src/lib/cloudinary.ts` | 圖床上傳 |
| `hasKvEnv` | `src/lib/kv-store.ts` | KV 可用性檢查 |

---

## 4. Phase 0 — 基線確認

### Step 4.1　處理既有未提交改動（重要，勿略過）

2026-10-22 收工時工作區有**未提交的改動**，內容是「SheetReader 縮放檢視」功能：

```
 M src/app/globals.css                    （+21 行 zoomed 樣式）
 M src/components/archive-detail-modal.tsx (+5 行 點擊循環切換 zoom 層級)
 M src/components/sheet-reader.tsx        （+43/-8 holdTimer → useRef、長按僅兩頁生效、handleClick 與長按互斥）
 M src/components/ui/safe-image.tsx       （+3/-2 aspectRatio 改為可選）
 M tsconfig.tsbuildinfo
```

已驗證：`npx tsc --noEmit` 通過、`npm test` 10 條全綠。此為**獨立且完整**的功能，應先獨立提交，不要與建檔中心混在同一個 commit。

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/室內設計乙級"
git diff --stat                     # 確認與上表一致
git add src/app/globals.css src/components/archive-detail-modal.tsx \
        src/components/sheet-reader.tsx src/components/ui/safe-image.tsx
git commit -m "feat(sheet-reader): 新增點擊縮放檢視（fit → medium → large 循環）"
```

**預期**：commit 成功，`git status --short` 只剩 `tsconfig.tsbuildinfo`。

> 若 `git diff --stat` 與上表**不一致**，**停止執行**並回報差異，不得自行合併或丟棄。

### Step 4.2　建立分支

```bash
git checkout -b feat/sheet-registry
git status --short
```

**預期**：分支建立成功，且工作區乾淨（僅 `tsconfig.tsbuildinfo`）。若 `src/` 下仍有改動，**停止並回報**。

---

## 5. Phase 1 — 型別與 token 存取

### Step 1.1　新建 `src/types/sheet-registry.ts`

```ts
/** 試卷圖檔的兩個頁面槽位：題目頁 / 答案頁 */
export type SheetSlot = "question" | "answer";

/** 單一槽位的建檔記錄（registry 的一個 field） */
export type SheetRecord = {
  sectionSlug: string;
  code: string;
  slot: SheetSlot;
  /** 生效 URL：前台唯一讀取的欄位 */
  url: string | null;
  /** 上一版 URL（回滾來源） */
  prevUrl: string | null;
  /** 上一版的生效時間 */
  prevAt: string | null;
  /** 待核准 URL：前台絕不讀取 */
  stagedUrl: string | null;
  /** 待核准時間 */
  stagedAt: string | null;
  /** 最後一次變更時間 */
  updatedAt: string;
};

/** key = `${sectionSlug}:${code}:${slot}` */
export type SheetRegistry = Record<string, SheetRecord>;

export type SheetSlotState = "missing" | "live" | "pending" | "rollback-ready";

export type SheetSlotStatus = {
  slot: SheetSlot;
  state: SheetSlotState;
  liveUrl: string | null;
  pendingUrl: string | null;
  canApprove: boolean;
  canRollback: boolean;
};

export type SectionCoverage = {
  sectionSlug: string;
  totalCodes: number;
  questionReady: number;
  answerReady: number;
  pendingCount: number;
  missingCodes: string[];
};
```

### Step 1.2　新建 `src/lib/curator-token.ts`

```ts
/** curator token 的瀏覽器端儲存 key（sessionStorage，關閉分頁即失效） */
export const CURATOR_TOKEN_STORAGE_KEY = "sheet_registry_token";

export function getCuratorToken(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(CURATOR_TOKEN_STORAGE_KEY) ?? "";
}

export function setCuratorToken(token: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CURATOR_TOKEN_STORAGE_KEY, token);
}

export function clearCuratorToken(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CURATOR_TOKEN_STORAGE_KEY);
}
```

**驗證**：

```bash
npx tsc --noEmit 2>&1 | head -20
```

**預期**：無 Error。

---

## 6. Phase 2 — 純邏輯層（含狀態機 reducer）

### Step 2.1　新建 `src/lib/sheet-registry.ts`

```ts
/**
 * sheet-registry.ts
 *
 * 建檔中心的純邏輯層：key 建構、狀態機 reducer、覆蓋率計算。
 * 本檔案不得 import KV、Cloudinary、React（保持可單元測試）。
 */

import type { ArchiveItem } from "@/types/exam";
import type {
  SectionCoverage,
  SheetRecord,
  SheetRegistry,
  SheetSlot,
  SheetSlotStatus,
} from "@/types/sheet-registry";

/** KV Hash key（單一事實來源，API 與 UI 皆引用此常數） */
export const REGISTRY_KV_KEY = "sheet_registry";

/** 支援的四個區塊（與 examSections 對齊） */
export const REGISTRY_SECTIONS = [
  { slug: "plan", label: "平面圖 201-206" },
  { slug: "ceiling-elevation", label: "天花板與立面圖" },
  { slug: "perspective", label: "透視圖 207-212" },
  { slug: "detail", label: "大樣圖 213-224" },
] as const;

/** 建立 field key */
export function buildRegistryKey(
  sectionSlug: string,
  code: string,
  slot: SheetSlot,
): string {
  return `${sectionSlug}:${code}:${slot}`;
}

/** 解析 field key；格式不符回傳 null */
export function parseRegistryKey(key: string): {
  sectionSlug: string;
  code: string;
  slot: SheetSlot;
} | null {
  const parts = key.split(":");
  if (parts.length !== 3) return null;
  const [sectionSlug, code, slot] = parts;
  if (!sectionSlug || !code) return null;
  if (slot !== "question" && slot !== "answer") return null;
  return { sectionSlug, code, slot };
}

/** 建立一筆全新的記錄 */
export function createRecord(
  sectionSlug: string,
  code: string,
  slot: SheetSlot,
  at: string,
): SheetRecord {
  return {
    sectionSlug,
    code,
    slot,
    url: null,
    prevUrl: null,
    prevAt: null,
    stagedUrl: null,
    stagedAt: null,
    updatedAt: at,
  };
}

/** 上傳新圖 → 進入「待核准」。若已有待核准圖，舊的待核准圖被取代。 */
export function applyStage(
  record: SheetRecord,
  url: string,
  at: string,
): SheetRecord {
  return { ...record, stagedUrl: url, stagedAt: at, updatedAt: at };
}

/** 核准：生效欄位 ← 待核准欄位；舊生效欄位降級為上一版。 */
export function applyApprove(record: SheetRecord, at: string): SheetRecord {
  if (!record.stagedUrl) return record;
  return {
    ...record,
    url: record.stagedUrl,
    prevUrl: record.url,
    prevAt: record.updatedAt,
    stagedUrl: null,
    stagedAt: null,
    updatedAt: at,
  };
}

/** 撤銷：丟棄待核准圖，不影響生效與上一版。 */
export function applyDiscard(record: SheetRecord, at: string): SheetRecord {
  if (!record.stagedUrl) return record;
  return { ...record, stagedUrl: null, stagedAt: null, updatedAt: at };
}

/**
 * 回滾：生效與上一版互換。
 * 互換而非清空，讓「回滾」本身也可以再被核准還原（單一按鈕即可復原誤操作）。
 */
export function applyRollback(record: SheetRecord, at: string): SheetRecord {
  if (!record.prevUrl) return record;
  const current = record.url;
  return {
    ...record,
    url: record.prevUrl,
    prevUrl: current,
    prevAt: record.updatedAt,
    updatedAt: at,
  };
}

/** 前台唯一讀取入口：只認生效欄位。 */
export function resolveSlotUrl(record: SheetRecord | undefined): string | null {
  return record?.url ?? null;
}

/** 槽位狀態燈（供建檔中心 UI 使用） */
export function buildSlotStatus(
  record: SheetRecord | undefined,
  slot: SheetSlot,
): SheetSlotStatus {
  const liveUrl = resolveSlotUrl(record);
  const pendingUrl = record?.stagedUrl ?? null;
  const state: SheetSlotStatus["state"] = pendingUrl
    ? "pending"
    : liveUrl
      ? record?.prevUrl
        ? "rollback-ready"
        : "live"
      : "missing";

  return {
    slot,
    state,
    liveUrl,
    pendingUrl,
    canApprove: Boolean(pendingUrl),
    canRollback: Boolean(record?.prevUrl),
  };
}

/** 取得某區塊所有不重複題號（保留題庫順序） */
export function uniqueCodes(items: readonly ArchiveItem[]): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const item of items) {
    if (seen.has(item.code)) continue;
    seen.add(item.code);
    codes.push(item.code);
  }
  return codes;
}

/**
 * 計算某區塊的建檔覆蓋率。
 * 「已備妥」= registry 有生效 URL，或 staticProbe 確認磁碟上有靜態圖。
 */
export function buildSectionCoverage(
  sectionSlug: string,
  items: readonly ArchiveItem[],
  registry: SheetRegistry,
  staticProbe?: Record<string, boolean>,
): SectionCoverage {
  const codes = uniqueCodes(items);
  let questionReady = 0;
  let answerReady = 0;
  let pendingCount = 0;
  const missingCodes: string[] = [];

  for (const code of codes) {
    const question = registry[buildRegistryKey(sectionSlug, code, "question")];
    const answer = registry[buildRegistryKey(sectionSlug, code, "answer")];

    if (question?.stagedUrl) pendingCount += 1;
    if (answer?.stagedUrl) pendingCount += 1;

    const questionOnDisk = staticProbe?.[buildRegistryKey(sectionSlug, code, "question")] !== false;
    const answerOnDisk = staticProbe?.[buildRegistryKey(sectionSlug, code, "answer")] !== false;

    if (question?.url || questionOnDisk) {
      questionReady += 1;
    } else {
      missingCodes.push(code);
    }
    if (answer?.url || answerOnDisk) answerReady += 1;
  }

  return {
    sectionSlug,
    totalCodes: codes.length,
    questionReady,
    answerReady,
    pendingCount,
    missingCodes,
  };
}
```

### Step 2.2　新建 `src/lib/__tests__/sheet-registry.test.ts`

```ts
import { describe, expect, it } from "vitest";
import {
  applyApprove,
  applyDiscard,
  applyRollback,
  applyStage,
  buildRegistryKey,
  buildSectionCoverage,
  createRecord,
  parseRegistryKey,
  resolveSlotUrl,
} from "@/lib/sheet-registry";
import type { ArchiveItem } from "@/types/exam";

const NOW = "2026-10-22T12:00:00.000Z";
const LATER = "2026-10-22T13:00:00.000Z";

function item(code: string): ArchiveItem {
  return {
    code,
    title: code,
    variants: [],
    focus: "",
    notes: "",
  };
}

describe("registry key", () => {
  it("組裝與解析互為逆運算", () => {
    const key = buildRegistryKey("plan", "201A", "question");
    expect(key).toBe("plan:201A:question");
    expect(parseRegistryKey(key)).toEqual({
      sectionSlug: "plan",
      code: "201A",
      slot: "question",
    });
  });

  it("非法 slot 回傳 null", () => {
    expect(parseRegistryKey("plan:201A:answer2")).toBeNull();
    expect(parseRegistryKey("plan-201A")).toBeNull();
  });
});

describe("狀態機", () => {
  it("待核准不會變成生效（治理不變式）", () => {
    const staged = applyStage(createRecord("plan", "201A", "question", NOW), "u1", NOW);
    expect(staged.stagedUrl).toBe("u1");
    expect(resolveSlotUrl(staged)).toBeNull();
  });

  it("核准後生效，舊生效降級為上一版", () => {
    const first = applyApprove(
      applyStage(createRecord("plan", "201A", "question", NOW), "u1", NOW),
      NOW,
    );
    const second = applyApprove(applyStage(first, "u2", LATER), LATER);
    expect(resolveSlotUrl(second)).toBe("u2");
    expect(second.prevUrl).toBe("u1");
    expect(second.stagedUrl).toBeNull();
  });

  it("撤銷不影響生效版本", () => {
    const live = applyApprove(
      applyStage(createRecord("plan", "201A", "question", NOW), "u1", NOW),
      NOW,
    );
    const discarded = applyDiscard(applyStage(live, "u2", LATER), LATER);
    expect(discarded.stagedUrl).toBeNull();
    expect(resolveSlotUrl(discarded)).toBe("u1");
  });

  it("回滾為互換，可再核准還原", () => {
    const live = applyApprove(
      applyStage(createRecord("plan", "201A", "question", NOW), "u1", NOW),
      NOW,
    );
    const newer = applyApprove(applyStage(live, "u2", LATER), LATER);
    const rolled = applyRollback(newer, LATER);
    expect(resolveSlotUrl(rolled)).toBe("u1");
    expect(rolled.prevUrl).toBe("u2");
  });

  it("無上一版時回滾為 no-op", () => {
    const live = applyApprove(
      applyStage(createRecord("plan", "201A", "question", NOW), "u1", NOW),
      NOW,
    );
    expect(applyRollback(live, LATER)).toEqual(live);
  });
});

describe("覆蓋率", () => {
  it("無任何圖檔時全數列入缺圖", () => {
    const registry = {};
    const probe = {};
    const coverage = buildSectionCoverage("detail", [item("214"), item("215")], registry, probe);
    expect(coverage.totalCodes).toBe(2);
    expect(coverage.missingCodes).toEqual(["214", "215"]);
  });

  it("磁碟探測為 false 才算缺圖（不會誤報）", () => {
    const registry = {};
    const probe = {
      "detail:214:question": false,
      "detail:214:answer": false,
      "detail:215:question": true,
      "detail:215:answer": true,
    };
    const coverage = buildSectionCoverage("detail", [item("214"), item("215")], registry, probe);
    expect(coverage.missingCodes).toEqual(["214"]);
  });

  it("待核准數量正確計入", () => {
    const registry = {
      "detail:214:question": applyStage(createRecord("detail", "214", "question", NOW), "u1", NOW),
    };
    const coverage = buildSectionCoverage("detail", [item("214")], registry, {});
    expect(coverage.pendingCount).toBe(1);
  });
});
```

**驗證**：

```bash
npm test 2>&1 | tail -20
```

**預期**：全部測試通過（本檔案 11 條，原有 10 條不受影響）。

---

## 7. Phase 3 — KV 存取層

### Step 3.1　新建 `src/lib/sheet-registry-kv.ts`

```ts
/**
 * sheet-registry-kv.ts
 *
 * Vercel KV Hash 存取層。使用 Hash（而非 List）以避開
 * kv-store.ts 的 200 筆 LPOP 上限，避免吃掉練習紀錄。
 */

import { kv } from "@vercel/kv";
import { hasKvEnv } from "@/lib/kv-store";
import { buildRegistryKey, REGISTRY_KV_KEY } from "@/lib/sheet-registry";
import type { SheetRecord, SheetSlot } from "@/types/sheet-registry";

function isSlot(value: unknown): value is SheetSlot {
  return value === "question" || value === "answer";
}

/** 防衛性解析：欄位型別不符或缺 key 一律丟棄，不讓壞資料進入 UI */
function mapRecord(raw: unknown): SheetRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const sectionSlug = typeof r.sectionSlug === "string" ? r.sectionSlug.trim() : "";
  const code = typeof r.code === "string" ? r.code.trim() : "";
  if (!sectionSlug || !code || !isSlot(r.slot)) return null;

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

  return {
    sectionSlug,
    code,
    slot: r.slot,
    url: str(r.url),
    prevUrl: str(r.prevUrl),
    prevAt: str(r.prevAt),
    stagedUrl: str(r.stagedUrl),
    stagedAt: str(r.stagedAt),
    updatedAt: str(r.updatedAt) ?? new Date(0).toISOString(),
  };
}

export function hasSheetRegistryEnv(): boolean {
  return hasKvEnv();
}

/** 讀取全部建檔記錄；KV 未設定或讀取失敗時回傳空陣列（降級不中斷前台） */
export async function kvGetSheetRecords(): Promise<SheetRecord[]> {
  if (!hasKvEnv()) return [];
  try {
    const raw = await kv.hgetall(REGISTRY_KV_KEY);
    return Object.values(raw)
      .map((v) => {
        try {
          return typeof v === "string" ? (JSON.parse(v) as unknown) : v;
        } catch {
          return null;
        }
      })
      .map(mapRecord)
      .filter((r): r is SheetRecord => r !== null);
  } catch (error) {
    console.error("[sheet-registry] KV 讀取失敗:", error);
    return [];
  }
}

/** 寫入單筆記錄 */
export async function kvSetSheetRecord(record: SheetRecord): Promise<void> {
  const key = buildRegistryKey(record.sectionSlug, record.code, record.slot);
  await kv.hset(REGISTRY_KV_KEY, key, JSON.stringify(record));
}
```

**驗證**：

```bash
npx tsc --noEmit 2>&1 | head -20 && npm test 2>&1 | tail -6
```

**預期**：無 Error，測試通過。

---

## 8. Phase 4 — 限流工具與 API 端點

### Step 4.1　新建 `src/lib/rate-limit.ts`

```ts
/**
 * rate-limit.ts
 *
 * 極簡記憶體限流（單一 instance 適用，Serverless 每實例獨立計數）。
 *
 * 注意：本輪僅供 /api/sheets 使用。
 * /api/uploads 既有實作本輪不重構，避免改動核心商業邏輯（憲法第十一條）。
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit(
  scope: string,
  ip: string,
  max: number,
  windowMs: number,
): { allowed: boolean; retryAfter: number } {
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfter: 0 };
}
```

### Step 4.2　新建 `src/app/api/sheets/route.ts`

```ts
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { cloudinary, cloudinaryFolder, hasCloudinaryEnv } from "@/lib/cloudinary";
import { hasSheetRegistryEnv, kvGetSheetRecords, kvSetSheetRecord } from "@/lib/sheet-registry-kv";
import {
  applyApprove,
  applyDiscard,
  applyRollback,
  applyStage,
  buildRegistryKey,
  createRecord,
} from "@/lib/sheet-registry";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { SheetRecord, SheetSlot } from "@/types/sheet-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 10 * 1024 * 1024;
const allowedSections = new Set(["plan", "ceiling-elevation", "perspective", "detail"]);

/** curator 驗證：token 僅存在 server-side env，前端只在 request header 傳送 */
function isCurator(request: Request): boolean {
  const expected = process.env.CURATOR_TOKEN;
  if (!expected) return false;
  const received = request.headers.get("x-curator-token");
  return typeof received === "string" && received === expected;
}

function unauthorized() {
  return NextResponse.json({ message: "需要管理權限才能變更官方圖檔。" }, { status: 401 });
}

function serverNotReady(message: string) {
  return NextResponse.json({ message }, { status: 503 });
}

function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

/** 靜態圖磁碟探測：讓「缺圖」是真實結果，不是推測 */
function probeStatic(url: string | null): boolean {
  if (!url || !url.startsWith("/images/")) return false;
  const relative = url.replace(/^\/images\//, "");
  if (relative.includes("..")) return false;
  return existsSync(path.join(process.cwd(), "public", "images", relative));
}

/**
 * GET /api/sheets?probe=1
 * 回傳全部建檔記錄；probe=1 時額外回傳靜態圖存在與否（僅 curator 可取）
 */
export async function GET(request: Request) {
  const records = await kvGetSheetRecords();

  const probeParam = new URL(request.url).searchParams.get("probe");
  if (probeParam !== "1") {
    return NextResponse.json({ records });
  }

  if (!isCurator(request)) return unauthorized();

  const { buildSectionCoverage } = await import("@/lib/sheet-registry");
  const { examSections } = await import("@/data/exam-content");
  const probe: Record<string, boolean> = {};

  for (const section of examSections) {
    for (const item of section.items) {
      for (const slot of ["question", "answer"] as SheetSlot[]) {
        const key = buildRegistryKey(section.slug, item.code, slot);
        const record = records.find(
          (r) => buildRegistryKey(r.sectionSlug, r.code, r.slot) === key,
        );
        if (record?.url) continue;
        probe[key] = probeStatic(buildStaticUrl(section.slug, item.code, slot));
      }
    }
  }

  void buildSectionCoverage;
  return NextResponse.json({ records, probe });
}

/** 靜態圖路徑規則（與 sheet-reader.ts 保持一致，僅供探測用） */
function buildStaticUrl(sectionSlug: string, code: string, slot: SheetSlot): string {
  const questionNo = code.slice(0, 3);
  if (sectionSlug === "detail") {
    return slot === "question" ? `/images/${code}/${code}-question.jpg` : `/images/${code}/${code}-answer.jpg`;
  }
  if (sectionSlug === "perspective") return "";
  return slot === "question" ? `/images/plan/question-${questionNo}.jpg` : "";
}

/**
 * POST /api/sheets  — 上傳新圖並置為「待核准」
 * formData: image, sectionSlug, code, slot
 */
export async function POST(request: Request) {
  if (!process.env.CURATOR_TOKEN) {
    return serverNotReady("尚未設定 CURATOR_TOKEN，無法建檔。");
  }
  if (!isCurator(request)) return unauthorized();
  if (!hasSheetRegistryEnv()) return serverNotReady("尚未連接 Vercel KV。");
  if (!hasCloudinaryEnv) return serverNotReady("尚未連接 Cloudinary。上傳暫停。");

  const limit = checkRateLimit("sheets", getClientIp(request), 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `操作過於頻繁。${limit.retryAfter} 秒後再試。` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("無法解析表單資料。");
  }

  const image = formData.get("image");
  const sectionSlug = String(formData.get("sectionSlug") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().slice(0, 40);
  const slot = String(formData.get("slot") ?? "").trim();

  if (!allowedSections.has(sectionSlug)) return badRequest("章節參數無效。");
  if (slot !== "question" && slot !== "answer") return badRequest("頁面槽位無效。");
  if (!/^[\w\u4e00-\u9fa5-]{1,40}$/.test(code)) return badRequest("題號格式無效。");
  if (!(image instanceof File) || image.size === 0) return badRequest("請選擇圖片。");
  if (!allowedMimeTypes.has(image.type)) return badRequest("僅支援 JPG、PNG、WEBP。");
  if (image.size > maxFileSize) return badRequest("單張圖片不可超過 10MB。");

  const buffer = Buffer.from(await image.arrayBuffer());
  let url: string;
  try {
    url = await new Promise<string>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `${cloudinaryFolder}/registry/${sectionSlug}`,
            public_id: `${Date.now()}-${randomUUID()}`,
            resource_type: "image",
          },
          (error, result) => {
            if (error || !result) return reject(error ?? new Error("upload failed"));
            resolve(result.secure_url);
          },
        )
        .end(buffer);
    });
  } catch (error) {
    console.error("[sheets] Cloudinary 上傳失敗:", error);
    return NextResponse.json({ message: "圖片上傳失敗，請稍後再試。" }, { status: 502 });
  }

  const now = new Date().toISOString();
  const existing = (await kvGetSheetRecords()).find(
    (r) => buildRegistryKey(r.sectionSlug, r.code, r.slot) === buildRegistryKey(sectionSlug, code, slot),
  );
  const record: SheetRecord = applyStage(
    existing ?? createRecord(sectionSlug, code, slot, now),
    url,
    now,
  );

  await kvSetSheetRecord(record);
  return NextResponse.json({ message: "已上傳，等待核准。", record });
}

/**
 * PATCH /api/sheets — 核准 / 撤銷 / 回滾
 * body: { sectionSlug, code, slot, action: "approve" | "discard" | "rollback" }
 */
export async function PATCH(request: Request) {
  if (!process.env.CURATOR_TOKEN) {
    return serverNotReady("尚未設定 CURATOR_TOKEN，無法建檔。");
  }
  if (!isCurator(request)) return unauthorized();
  if (!hasSheetRegistryEnv()) return serverNotReady("尚未連接 Vercel KV。");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("無法解析請求內容。");
  }

  const sectionSlug = String(body.sectionSlug ?? "").trim();
  const code = String(body.code ?? "").trim().slice(0, 40);
  const slot = String(body.slot ?? "").trim();
  const action = String(body.action ?? "").trim();

  if (!allowedSections.has(sectionSlug)) return badRequest("章節參數無效。");
  if (slot !== "question" && slot !== "answer") return badRequest("頁面槽位無效。");

  const records = await kvGetSheetRecords();
  const existing = records.find(
    (r) => buildRegistryKey(r.sectionSlug, r.code, r.slot) === buildRegistryKey(sectionSlug, code, slot),
  );
  if (!existing) return badRequest("找不到這筆建檔記錄。");

  const now = new Date().toISOString();
  const next =
    action === "approve" ? applyApprove(existing, now)
    : action === "discard" ? applyDiscard(existing, now)
    : action === "rollback" ? applyRollback(existing, now)
    : null;

  if (!next) return badRequest("動作無效。");
  if (next === existing) return badRequest("此動作不適用於目前狀態。");

  await kvSetSheetRecord(next);
  return NextResponse.json({ message: "已更新。", record: next });
}
```

> **程式碼註記**：`GET` 中的 `buildSectionCoverage` 為動態 import 且未被使用（`void` 佔位）——低階模型**請刪除該兩行**（`const { buildSectionCoverage } = await import(...)` 與 `void buildSectionCoverage;`），覆蓋率由前端元件計算，API 只負責回傳 `probe`。

**驗證**：

```bash
npx tsc --noEmit 2>&1 | head -20
```

**預期**：無 Error。

---

## 9. Phase 5 — 客戶端圖片壓縮

### Step 5.1　新建 `src/lib/image-compress.ts`

```ts
/**
 * image-compress.ts
 *
 * 瀏覽器端壓縮：解決手機 4K 掃描檔超過 API 10MB 上限而被擋的問題。
 * 純函式 + Canvas，無第三方依賴。
 */

export type CompressResult = {
  blob: Blob;
  width: number;
  height: number;
  originalBytes: number;
  outputBytes: number;
  /** true 表示壓縮後反而更大或無需壓縮，已沿用原檔 */
  skipped: boolean;
};

const DEFAULTS = { maxEdge: 3000, quality: 0.85, targetType: "image/webp" };

export async function compressImage(
  file: File,
  options: { maxEdge?: number; quality?: number; targetType?: string } = {},
): Promise<CompressResult> {
  const { maxEdge, quality, targetType } = { ...DEFAULTS, ...options };

  const fallback = (reason: string): CompressResult => {
    console.warn(`[compress] 略過壓縮（${reason}），沿用原檔`);
    return {
      blob: file,
      width: 0,
      height: 0,
      originalBytes: file.size,
      outputBytes: file.size,
      skipped: true,
    };
  };

  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return fallback("瀏覽器不支援 createImageBitmap");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return fallback("圖片解碼失敗");
  }

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return fallback("無法取得 canvas context");
  }

  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, targetType, quality));

  if (!blob || blob.size >= file.size) {
    return fallback("壓縮後未變小");
  }

  return {
    blob,
    width,
    height,
    originalBytes: file.size,
    outputBytes: blob.size,
    skipped: false,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
```

---

## 10. Phase 6 — 建檔中心 UI

### Step 6.1　新建 `src/components/admin/sheet-registry-panel.tsx`

```tsx
"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, RotateCcw, Upload, X, Lock } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { EmptyState, Eyebrow, Heading, SkeletonGrid, SurfacePanel } from "@/components/ui/primitives";
import { SheetReader } from "@/components/sheet-reader";
import { compressImage, formatBytes } from "@/lib/image-compress";
import { clearCuratorToken, getCuratorToken, setCuratorToken } from "@/lib/curator-token";
import {
  buildRegistryKey,
  buildSectionCoverage,
  buildSlotStatus,
  REGISTRY_SECTIONS,
} from "@/lib/sheet-registry";
import type { SheetRecord, SheetRegistry, SheetSlot, SheetSlotStatus } from "@/types/sheet-registry";
import { examSections } from "@/data/exam-content";

const TOKEN_PROBE_KEY = "registry";

function toRegistry(records: SheetRecord[]): SheetRegistry {
  const registry: SheetRegistry = {};
  for (const record of records) {
    registry[buildRegistryKey(record.sectionSlug, record.code, record.slot)] = record;
  }
  return registry;
}

export function SheetRegistryPanel() {
  const [token, setToken] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [sectionSlug, setSectionSlug] = useState<string>(REGISTRY_SECTIONS[0].slug);
  const [registry, setRegistry] = useState<SheetRegistry>({});
  const [probe, setProbe] = useState<Record<string, boolean>>({});
  const [records, setRecords] = useState<SheetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<SheetDocPreview | null>(null);

  const authHeaders = useCallback(
    () => ({ "x-curator-token": getCuratorToken() }),
    [],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sheets?probe=1`, { headers: authHeaders() });
      if (response.status === 401) {
        setIsAuthed(false);
        return;
      }
      const data = (await response.json()) as { records?: SheetRecord[]; probe?: Record<string, boolean> };
      const nextRecords = data.records ?? [];
      setRecords(nextRecords);
      setRegistry(toRegistry(nextRecords));
      setProbe(data.probe ?? {});
      setIsAuthed(true);
    } catch {
      setMessage("讀取建檔資料失敗，請確認網路與 KV 連線。");
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    setToken(getCuratorToken());
    if (getCuratorToken()) void load();
    else setIsLoading(false);
  }, [load]);

  const items = useMemo(
    () => examSections.find((s) => s.slug === sectionSlug)?.items ?? [],
    [sectionSlug],
  );

  const coverage = useMemo(
    () => buildSectionCoverage(sectionSlug, items, registry, probe),
    [sectionSlug, items, registry, probe],
  );

  const handleUnlock = () => {
    setCuratorToken(token.trim());
    void load();
  };

  const handleSignOut = () => {
    clearCuratorToken();
    setToken("");
    setIsAuthed(false);
    setRegistry({});
    setProbe({});
    setRecords([]);
  };

  const upload = async (code: string, slot: SheetSlot, file: File) => {
    const key = buildRegistryKey(sectionSlug, code, slot);
    setBusyKey(key);
    setMessage(null);
    try {
      const result = await compressImage(file);
      const body = new FormData();
      body.append("image", result.blob, file.name.replace(/\.[^.]+$/, "") + ".webp");
      body.append("sectionSlug", sectionSlug);
      body.append("code", code);
      body.append("slot", slot);

      const response = await fetch("/api/sheets", { method: "POST", headers: authHeaders(), body });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(data.message ?? "上傳失敗。");
        return;
      }
      setMessage(
        `${code} ${slot === "question" ? "題目圖" : "答案圖"} 已上傳，待核准（原檔 ${formatBytes(result.originalBytes)} → ${formatBytes(result.outputBytes)}）。`,
      );
      await load();
    } catch {
      setMessage("上傳失敗，請稍後再試。");
    } finally {
      setBusyKey(null);
    }
  };

  const patch = async (code: string, slot: SheetSlot, action: "approve" | "discard" | "rollback") => {
    const key = buildRegistryKey(sectionSlug, code, slot);
    setBusyKey(key);
    try {
      const response = await fetch("/api/sheets", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ sectionSlug, code, slot, action }),
      });
      const data = (await response.json()) as { message?: string };
      setMessage(data.message ?? "已更新。");
      await load();
    } catch {
      setMessage("操作失敗，請稍後再試。");
    } finally {
      setBusyKey(null);
    }
  };

  if (!isAuthed) {
    return (
      <SurfacePanel className="registry-gate">
        <Eyebrow>建檔中心</Eyebrow>
        <Heading level={2}>輸入管理密碼以繼續</Heading>
        <p className="registry-gate__desc">建檔會變更全站試卷圖檔，僅限管理者操作。</p>
        <div className="registry-gate__field">
          <label className="form-field__label" htmlFor="registry-token">
            管理密碼
          </label>
          <input
            id="registry-token"
            type="password"
            className="registry-input"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="CURATOR_TOKEN"
            autoComplete="off"
          />
        </div>
        <button type="button" className="submit-button" onClick={handleUnlock}>
          <Lock size={16} /> 驗證並進入
        </button>
        {message ? <p className="form-message">{message}</p> : null}
      </SurfacePanel>
    );
  }

  return (
    <SurfacePanel className="registry-panel">
      <header className="registry-header">
        <div>
          <Eyebrow>建檔中心</Eyebrow>
          <Heading level={2}>試卷圖檔建檔</Heading>
        </div>
        <button type="button" className="ghost-link" onClick={handleSignOut}>
          登出
        </button>
      </header>

      <nav className="registry-tabs" aria-label="試卷區塊">
        {REGISTRY_SECTIONS.map((section) => (
          <button
            key={section.slug}
            type="button"
            className={`registry-tab${sectionSlug === section.slug ? " registry-tab--active" : ""}`}
            aria-current={sectionSlug === section.slug ? "true" : undefined}
            onClick={() => setSectionSlug(section.slug)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <div className="registry-summary">
        <span>
          題目圖備妥 <strong>{coverage.questionReady}</strong> / {coverage.totalCodes}
        </span>
        <span>
          答案圖備妥 <strong>{coverage.answerReady}</strong> / {coverage.totalCodes}
        </span>
        <span>
          待核准 <strong>{coverage.pendingCount}</strong>
        </span>
        <span>
          缺圖 <strong>{coverage.missingCodes.length}</strong>
        </span>
      </div>

      {message ? <p className="form-message">{message}</p> : null}

      {isLoading ? (
        <SkeletonGrid count={6} height={180} ariaLabel="載入建檔資料中" />
      ) : coverage.missingCodes.length === 0 && coverage.pendingCount === 0 ? (
        <EmptyState
          title="此區塊圖檔已完備"
          description="所有試卷的題目圖與答案圖皆已建檔，無待處理項目。"
        />
      ) : (
        <ul className="registry-grid">
          {[...coverage.missingCodes, ...Array.from(new Set(records.map((r) => r.code)))]
            .filter((code, index, list) => list.indexOf(code) === index)
            .map((code) => (
              <RegistryCell
                key={code}
                code={code}
                sectionSlug={sectionSlug}
                registry={registry}
                busyKey={busyKey}
                onUpload={upload}
                onPatch={patch}
                onPreview={setPreview}
              />
            ))}
        </ul>
      )}

      {preview ? (
        <div className="registry-preview" role="dialog" aria-label={`${preview.code} 預覽`}>
          <button type="button" className="registry-preview__close" onClick={() => setPreview(null)}>
            <X size={18} /> 關閉預覽
          </button>
          <SheetReader doc={preview.doc} />
        </div>
      ) : null}
    </SurfacePanel>
  );
}

type SheetDocPreview = { code: string; doc: Parameters<typeof SheetReader>[0]["doc"] };

function RegistryCell({
  code,
  sectionSlug,
  registry,
  busyKey,
  onUpload,
  onPatch,
  onPreview,
}: {
  code: string;
  sectionSlug: string;
  registry: SheetRegistry;
  busyKey: string | null;
  onUpload: (code: string, slot: SheetSlot, file: File) => Promise<void>;
  onPatch: (code: string, slot: SheetSlot, action: "approve" | "discard" | "rollback") => Promise<void>;
  onPreview: (preview: SheetDocPreview) => void;
}) {
  const slots: { slot: SheetSlot; label: string }[] = [
    { slot: "question", label: "題目圖" },
    { slot: "answer", label: "答案圖" },
  ];

  return (
    <li className="registry-cell">
      <div className="registry-cell__head">
        <span className="registry-cell__code">{code}</span>
        <span className="registry-cell__section">{sectionSlug}</span>
      </div>

      {slots.map(({ slot, label }) => {
        const status: SheetSlotStatus = buildSlotStatus(
          registry[buildRegistryKey(sectionSlug, code, slot)],
          slot,
        );
        const key = buildRegistryKey(sectionSlug, code, slot);
        const isBusy = busyKey === key;

        return (
          <div key={slot} className="registry-slot">
            <div className="registry-slot__head">
              <span className="registry-slot__label">{label}</span>
              <span className={`registry-status registry-status--${status.state}`}>{status.state}</span>
            </div>

            <SafeImage
              src={status.liveUrl ?? status.pendingUrl}
              alt={`${code} ${label}`}
              aspectRatio="4 / 3"
              objectFit="contain"
              fallbackLabel={status.state === "missing" ? "尚未建檔" : label}
            />

            <label className="registry-upload">
              <Upload size={14} />
              <span>選擇圖片</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isBusy}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void onUpload(code, slot, file);
                }}
              />
            </label>

            <div className="registry-slot__actions">
              {status.canApprove ? (
                <>
                  <button
                    type="button"
                    className="ghost-link"
                    disabled={isBusy}
                    onClick={() => void onPatch(code, slot, "approve")}
                  >
                    <CheckCircle2 size={14} /> 核准
                  </button>
                  <button
                    type="button"
                    className="ghost-link"
                    disabled={isBusy}
                    onClick={() => void onPatch(code, slot, "discard")}
                  >
                    <X size={14} /> 撤銷
                  </button>
                </>
              ) : null}
              {status.canRollback ? (
                <button
                  type="button"
                  className="ghost-link"
                  disabled={isBusy}
                  onClick={() => void onPatch(code, slot, "rollback")}
                >
                  <RotateCcw size={14} /> 回滾上一版
                </button>
              ) : null}
              {isBusy ? <LoaderCircle size={14} className="registry-spinner" /> : null}
            </div>
          </div>
        );
      })}
    </li>
  );
}
```

**實作注意（給低階模型）**：
- `SheetDocPreview.doc` 的型別若報錯，改用 `import type { SheetDoc } from "@/types/sheet";` 並把型別寫成 `SheetDoc`，其餘不動。
- `onPreview` 與預覽彈窗為**選用**。若預覽整合報錯，**整段移除** `preview` 相關程式碼（state、`onPreview` prop、`.registry-preview` 區塊、`SheetReader` import），其餘功能不受影響。
- `status.state` 只會是 `missing | live | pending | rollback-ready`，CSS 四個狀態都要有對應樣式。

---

## 11. Phase 7 — 樣式

### Step 7.1　在 `src/app/globals.css` **檔案末尾**追加

```css
/* =========================================================================
   Sheet Registry — 建檔中心
   ========================================================================= */
.registry-panel,
.registry-gate {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.registry-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

/* Tabs：§12 RWD 紀律，橫向捲動，不換行 */
.registry-tabs {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  flex-wrap: nowrap;
  padding-bottom: var(--space-1);
  scrollbar-width: thin;
}

.registry-tab {
  flex: 0 0 auto;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--panel);
  color: var(--muted);
  font-size: 0.86rem;
  white-space: nowrap;
  transition: background var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.registry-tab:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.registry-tab--active {
  background: var(--accent);
  color: var(--on-accent);
}

.registry-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
  font-size: 0.82rem;
  color: var(--muted);
}

.registry-summary strong {
  color: var(--accent);
  font-size: 1rem;
  margin-inline-start: 4px;
}

.registry-gate__desc {
  color: var(--muted);
  font-size: 0.9rem;
}

.registry-gate__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 320px;
}

.registry-input {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  background: var(--surface-frosted);
  min-width: 0;
}

.registry-input:focus-visible {
  border-color: var(--accent);
}

.registry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-5);
}

/* §12-B：單卡內部 padding 不得少於 var(--space-5) */
.registry-cell {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--panel);
  border-radius: var(--radius-md);
  min-width: 0;
}

.registry-cell__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  min-height: 2.4em;
}

.registry-cell__code {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: var(--tracking-snug);
}

.registry-cell__section {
  font-size: 0.7rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.registry-slot {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
  min-width: 0;
}

.registry-slot__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.registry-slot__label {
  font-size: 0.78rem;
  color: var(--text-strong);
}

.registry-status {
  font-size: 0.68rem;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: var(--bg-deep);
  color: var(--muted);
  letter-spacing: var(--tracking-snug);
}

.registry-status--live {
  background: var(--accent-soft);
  color: var(--accent);
}

.registry-status--pending {
  background: var(--accent);
  color: var(--on-accent);
}

.registry-status--rollback-ready {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.registry-status--missing {
  background: var(--danger-soft);
  color: var(--danger);
}

.registry-upload {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-size: 0.78rem;
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
}

.registry-upload:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.registry-upload input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.registry-slot__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  min-height: 2rem;
}

.registry-slot__actions button {
  font-size: 0.74rem;
  padding: 4px 10px;
}

.registry-spinner {
  animation: registry-spin 900ms linear infinite;
  color: var(--accent);
}

@keyframes registry-spin {
  to {
    transform: rotate(360deg);
  }
}

.registry-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-top: var(--space-5);
  border-top: 1px solid var(--line);
}

.registry-preview__close {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.8rem;
  color: var(--muted);
}

@media (max-width: 768px) {
  .registry-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .registry-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

**驗證**：

```bash
npx tsc --noEmit 2>&1 | head -20
```

**預期**：無 Error。

---

## 12. Phase 8 — 頁面

### Step 8.1　新建 `src/app/admin/sheets/page.tsx`

```tsx
import type { Metadata } from "next";
import { SheetRegistryPanel } from "@/components/admin/sheet-registry-panel";

export const metadata: Metadata = {
  title: "建檔中心｜乙級術科",
  robots: { index: false, follow: false },
};

export default function SheetRegistryPage() {
  return (
    <main className="container" style={{ paddingBlock: "var(--space-10)" }}>
      <SheetRegistryPanel />
    </main>
  );
}
```

**驗收**：開啟 `http://localhost:3000/admin/sheets` 應看到「輸入管理密碼以繼續」的閘門畫面。

---

## 13. Phase 9 — 串接前台（SheetDoc 讀取 registry）

### Step 9.1　新建 `src/hooks/use-sheet-registry.ts`

```ts
"use client";

import { useEffect, useState } from "react";
import { buildRegistryKey } from "@/lib/sheet-registry";
import type { SheetRecord, SheetRegistry } from "@/types/sheet-registry";

let cache: SheetRegistry | null = null;

function toRegistry(records: SheetRecord[]): SheetRegistry {
  const registry: SheetRegistry = {};
  for (const record of records) {
    registry[buildRegistryKey(record.sectionSlug, record.code, record.slot)] = record;
  }
  return registry;
}

/** 失效快取（建檔中心寫入後呼叫，讓下次開啟 Modal 立即反映） */
export function invalidateSheetRegistry(): void {
  cache = null;
}

export function useSheetRegistry(): { registry: SheetRegistry; isLoading: boolean } {
  const [registry, setRegistry] = useState<SheetRegistry>(cache ?? {});
  const [isLoading, setIsLoading] = useState(cache === null);

  useEffect(() => {
    let cancelled = false;
    if (cache) return;

    fetch("/api/sheets")
      .then((response) => response.json())
      .then((data: { records?: SheetRecord[] }) => {
        cache = toRegistry(data.records ?? []);
        if (!cancelled) setRegistry(cache);
      })
      .catch(() => {
        // 讀取失敗時以空 registry 降級，前台維持靜態圖行為
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { registry, isLoading };
}
```

### Step 9.2　修改 `src/lib/sheet-reader.ts`

1. 新增 import：

```ts
import { resolveSlotUrl } from "@/lib/sheet-registry";
import { buildRegistryKey } from "@/lib/sheet-registry";
import type { SheetRegistry } from "@/types/sheet-registry";
```

2. 把 `buildSheetDoc` 簽章改為多一個可選參數：

```ts
export function buildSheetDoc(
  item: ArchiveItem,
  sectionSlug: string,
  answerUrl?: string | null,
  registry: SheetRegistry = {},
): SheetDoc | null {
```

3. 在函式開頭插入 registry 覆寫查詢，並於各分支使用：

```ts
  const registryQuestion =
    resolveSlotUrl(registry[buildRegistryKey(sectionSlug, item.code, "question")]);
  const registryAnswer =
    resolveSlotUrl(registry[buildRegistryKey(sectionSlug, item.code, "answer")]);
```

- **perspective 分支**：在 `buildPerspectiveSheetDoc(item)` 前先判斷
  `if (registryQuestion) { return { code: item.code, sectionSlug, pages: [{ url: registryQuestion, label: "題目卷正面", alt: \`${item.code} 題目卷正面\` }] }; }`
- **detail 分支**：`const questionUrl = registryQuestion ?? \`/images/${item.code}/${item.code}-question.jpg\`;`
  答案頁改為 `const answerPage = registryAnswer ?? answerUrl;`，僅在 `answerPage` 存在時 push。
- **plan / ceiling-elevation 分支**：`const questionUrl = registryQuestion ?? \`/images/plan/question-${numPart}.jpg\`;`（其餘邏輯不動）

> **修改紀律**：只加參數與「優先序」，**不得刪除或改寫既有分支邏輯**。registry 為空時行為必須與修改前完全一致。

### Step 9.3　修改 `src/components/archive-detail-modal.tsx`

1. 新增 import：`import { useSheetRegistry } from "@/hooks/use-sheet-registry";`
2. 在元件內取得：`const { registry } = useSheetRegistry();`
3. 找出所有呼叫 `buildSheetDoc(...)` 的位置，**只多加第 4 個參數** `registry`：

```ts
buildSheetDoc(item, sectionSlug, finalRequirementUrl, registry)
```

**驗證**：

```bash
npx tsc --noEmit 2>&1 | head -20 && npm test 2>&1 | tail -6
```

**預期**：無 Error、測試通過。

---

## 14. Phase 10 — 安全修補：共用需求圖寫入閘（地雷 B）

### Step 10.1　修改 `src/app/api/uploads/route.ts`

在 `if (confirmOverride && parsedKey && hasKvEnv()) {` **之前**插入：

```ts
  // 覆寫官方圖檔需要管理權限（方案 S Phase 10）
  if (confirmOverride && parsedKey) {
    const expectedToken = process.env.CURATOR_TOKEN;
    const receivedToken = request.headers.get("x-curator-token");
    if (!expectedToken) {
      return NextResponse.json(
        { message: "尚未設定 CURATOR_TOKEN，覆寫暫停。" },
        { status: 503 },
      );
    }
    if (receivedToken !== expectedToken) {
      return NextResponse.json(
        { message: "覆寫官方需求圖需要管理權限。" },
        { status: 401 },
      );
    }
  }
```

### Step 10.2　修改 `src/components/upload-studio.tsx`

在送出「共用需求圖覆寫」請求的地方（帶 `confirmOverride: "true"` 的 FormData），補上 header：

```ts
import { getCuratorToken } from "@/lib/curator-token";
// ...
const response = await fetch("/api/uploads", {
  method: "POST",
  headers: { "x-curator-token": getCuratorToken() },
  body: formData,
});
```

若既有呼叫沒寫 `headers`，就補上這一行即可，其他參數不動。

**驗證**：

```bash
npx tsc --noEmit 2>&1 | head -20
```

---

## 15. Phase 11 — 環境變數

### Step 11.1　`.env.local` 與 `.env.example` 各新增一行

```
# 建檔中心寫入權限（server-side only，絕不可加 NEXT_PUBLIC_ 前綴）
CURATOR_TOKEN=
```

```bash
printf '\n# 建檔中心寫入權限（server-side only）\nCURATOR_TOKEN=\n' >> .env.local
printf '\n# 建檔中心寫入權限（server-side only）\nCURATOR_TOKEN=\n' >> .env.example
```

### Step 11.2　產生一組 token 給使用者填入

```bash
openssl rand -base64 24
```

**注意**：`CURATOR_TOKEN` **不可**加 `NEXT_PUBLIC_` 前綴。前端只在送出 request 時由 `sessionStorage` 帶入 header，任何會被打包進 client bundle 的環境變數都是資安違規（憲法第九條）。

### Step 11.3　部署環境（Vercel）

Settings → Environment Variables 新增 `CURATOR_TOKEN`（Production / Preview 各一），值為 Step 11.2 的輸出。若要讓上傳功能完全可用，確認既有的 `KV_REST_API_URL`、`KV_REST_API_TOKEN`、`CLOUDINARY_*` 仍存在。

---

## 16. Phase 12 — 視覺驗收與合規掃描

### Step 12.1　啟動 dev server

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/室內設計乙級"
npm run dev
```

等待 `ready - started server on http://localhost:3000`。

### Step 12.2　驗收清單

| # | 檢查點 | 預期 |
|---|---|---|
| 1 | `http://localhost:3000` | 首屏正常，試卷卡與點擊抽題無變化 |
| 2 | 任一試卷 Modal | 題目區與修改前一致（registry 為空 → 行為不變） |
| 3 | `http://localhost:3000/admin/sheets` | 顯示管理密碼閘門 |
| 4 | 輸入錯誤密碼 | 停留在閘門，不進入 |
| 5 | 輸入正確密碼 | 進入面板，四個區塊 tab 與統計列出現 |
| 6 | 切換到 `detail` | 統計列顯示缺圖 9 題（214–221、223） |
| 7 | 選一缺圖試卷 → 選檔 | 顯示「已上傳，待核准」與壓縮前後尺寸 |
| 8 | 該槽位狀態燈 | 變為 `pending`，前台 Modal **不應**出現新圖 |
| 9 | 按「核准」 | 狀態燈變 `live`，前台 Modal 該題**出現**新圖 |
| 10 | 對同一槽位再上傳一張 → 核准 | `prevUrl` 生效，「回滾上一版」按鈕出現 |
| 11 | 按「回滾上一版」 | 圖面回到前一版；再按一次可還原 |
| 12 | 按「撤銷」 | 待核准圖消失，生效版本不變 |
| 13 | 480px 視窗 | 統計列變 2 欄、tab 可橫向捲動、無橫向捲動軸 |
| 14 | Console | 無紅字 Error |
| 15 | 未帶 token 直接呼叫 `POST /api/sheets` | 回傳 401 |

### Step 12.3　Pre-flight 與品質掃描

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/室內設計乙級"

# 1. 不得有寫死 hex
grep -rEn "color: #[0-9a-fA-F]{3,8}|background: #[0-9a-fA-F]{3,8}" \
  src/components/admin src/app/admin src/app/api/sheets src/lib/sheet-registry*.ts \
  src/lib/image-compress.ts src/lib/curator-token.ts src/hooks/use-sheet-registry.ts 2>/dev/null \
  | grep -v "var(--" || echo "PASS-1 無寫死 hex"

# 2. 字距合規（SOP 1）
grep -rn "letter-spacing:" src/components/admin src/app/globals.css | \
  awk '$NF ~ /[0-9.]+em/ && $NF+0 > 0.05' || echo "PASS-2 字距合規"

# 3. 斷點僅限 480/768/1024/1200
grep -rEho "@media \(max-width: [0-9]+px\)" src/components/admin src/app/globals.css | sort | uniq -c

# 4. 字級上限 ≤ 6rem
grep -rEn "font-size: [0-9]+\.[5-9]rem|font-size: [1-9][0-9]rem" src/components/admin || echo "PASS-4 字級合規"

# 5. 禁用不存在的間距變數（SOP 9 教訓 3）
grep -rn "var(--space-[0-9]*)" src/components/admin src/app/globals.css | \
  grep -E "space-(7|9|11)\b" || echo "PASS-5 無不存在的間距變數"

# 6. 禁止 max-width: NNch（§12）
grep -rn "max-width: [0-9]\+ch" src/components/admin || echo "PASS-6 無窄寬斷尾"

# 7. 測試
npm test 2>&1 | tail -8

# 8. 型別
npx tsc --noEmit && echo "PASS-8 型別通過"

# 9. 建置
npm run build 2>&1 | tail -15
```

**全部預期為 PASS 或無輸出。** 任一項失敗，修正後重跑該項再往下。

---

## 17. Phase 13 — 文檔與 Commit

### Step 13.1　`AGENTS.md` 新增「附錄 J：建檔中心（Sheet Registry）更新（v1.5）」

```markdown
# 附錄 J：建檔中心（Sheet Registry）更新（v1.5）

## 更新日期
2026-10-22

## 核心變更
試卷圖檔建檔從「IDE 搬檔 + git push + 部署」升級為「瀏覽器建檔中心」：
- 資料層：Vercel KV **Hash** `sheet_registry`（非 List，避開 200 筆 LPOP 上限）
- 治理：三態變更單（草稿 → 待核准 → 生效），前台只讀生效欄位
- 回滾：保留 prevUrl / prevAt，一鍵回滾且可再次核准還原
- 客戶端壓縮：canvas → WebP 長邊 3000px，解決 10MB 上限
- 靜態圖探測：API 以 fs.existsSync 回報磁碟真實狀態，「缺圖」非推測

## 新增檔案
| 檔案 | 說明 |
|---|---|
| `src/types/sheet-registry.ts` | SheetRecord / SheetRegistry / SectionCoverage 型別 |
| `src/lib/sheet-registry.ts` | key 建構、狀態機 reducer、覆蓋率（純邏輯，可測試） |
| `src/lib/sheet-registry-kv.ts` | KV Hash 存取層 |
| `src/lib/curator-token.ts` | curator token 的 sessionStorage 存取 |
| `src/lib/image-compress.ts` | 瀏覽器端 canvas 壓縮 |
| `src/lib/rate-limit.ts` | 極簡限流（僅供 /api/sheets） |
| `src/app/api/sheets/route.ts` | GET（含 probe）/ POST（待核准）/ PATCH（核准·撤銷·回滾） |
| `src/components/admin/sheet-registry-panel.tsx` | 建檔中心面板 |
| `src/app/admin/sheets/page.tsx` | 建檔中心頁面（noindex） |
| `src/hooks/use-sheet-registry.ts` | 前台 registry 快取讀取 |
| `src/lib/__tests__/sheet-registry.test.ts` | 11 條單元測試 |

## 受影響檔案
| 檔案 | 變更 |
|---|---|
| `src/lib/sheet-reader.ts` | `buildSheetDoc` 新增第 4 參數 `registry`，僅調整優先序 |
| `src/components/archive-detail-modal.tsx` | 傳入 registry |
| `src/app/api/uploads/route.ts` | 覆寫分支補 curator token 驗證（修既有漏洞） |
| `src/components/upload-studio.tsx` | 覆寫請求帶 token header |
| `src/app/globals.css` | 新增 registry-* 樣式 |

## 環境變數
`CURATOR_TOKEN`（server-side only，**禁止** NEXT_PUBLIC_ 前綴）

## 設計權重評估
| 軸 | 分數 | 權重 | 理由 |
|---|---|---|---|
| 每次入檔速度 | 10 | 25% | 單題 20 秒、批次 20 題 3 分鐘 |
| 開發成本 | 7 | 20% | 1 頁面 + 3 端點 + 1 hash，複用 6 個既有元件 |
| 內容治理 | 10 | 20% | 三態變更單 + curator 閘 |
| 可追溯 / 回滾 | 9 | 15% | prevUrl + 稽核欄位；扣 1 為 KV 無不可竄改紀錄 |
| 長期維護 | 9 | 20% | registry 成為缺圖單一事實來源 |
| **加權總分** | **9.1** | | |

## 違規豁免
無新增豁免。
```

並把 `AGENTS.md` 抬頭的版本行改為 `v1.5（v1.5 整合建檔中心）`。

### Step 13.2　Commit

```bash
git add -A
git commit -m "feat(sheet-registry): 建檔中心 — 三態核准 + 一鍵回滾 + 客戶端壓縮

- 新增 KV Hash sheet_registry，避開 practice_entries 的 200 筆 LPOP 上限
- 新增三態變更單（草稿/待核准/生效），前台只讀生效欄位
- 新增 /api/sheets：GET(含靜態圖 fs 探測)、POST(待核准)、PATCH(核准/撤銷/回滾)
- 新增 /admin/sheets 建檔中心（noindex），複用 SheetReader / SafeImage / primitives
- 新增客戶端 canvas 壓縮（WebP 長邊 3000px），解決 10MB 上限
- buildSheetDoc 新增 registry 優先序參數，向後相容（registry 空時行為不變）
- security: 共用需求圖覆寫補 curator token 驗證（修既有未授權覆寫漏洞）
- 測試：sheet-registry 11 條，全數通過"
git push -u origin feat/sheet-registry
```

---

## 18. 實作順序總表（低階模型照表操課）

| # | Phase | 動作 | 完成判定 |
|---|---|---|---|
| 0 | 0 | **先獨立 commit 既有縮放功能改動** | `git status` 僅剩 tsbuildinfo |
| 1 | 0 | `git checkout -b feat/sheet-registry` | 分支存在且工作區乾淨 |
| 2 | 1 | 建 `src/types/sheet-registry.ts` | `tsc` 無 Error |
| 3 | 1 | 建 `src/lib/curator-token.ts` | `tsc` 無 Error |
| 4 | 2 | 建 `src/lib/sheet-registry.ts` | `tsc` 無 Error |
| 5 | 2 | 建 `src/lib/__tests__/sheet-registry.test.ts` | `npm test` 全綠 |
| 6 | 3 | 建 `src/lib/sheet-registry-kv.ts` | `tsc` + 測試通過 |
| 7 | 4 | 建 `src/lib/rate-limit.ts` | `tsc` 無 Error |
| 8 | 4 | 建 `src/app/api/sheets/route.ts`（**記得刪除 2 行無用 import**） | `tsc` 無 Error |
| 9 | 5 | 建 `src/lib/image-compress.ts` | `tsc` 無 Error |
| 10 | 6 | 建 `src/components/admin/sheet-registry-panel.tsx` | `tsc` 無 Error |
| 11 | 7 | `globals.css` 追加 registry 樣式 | `tsc` 無 Error |
| 12 | 8 | 建 `src/app/admin/sheets/page.tsx` | 頁面可開 |
| 13 | 9 | 建 `src/hooks/use-sheet-registry.ts` | `tsc` 無 Error |
| 14 | 9 | 改 `src/lib/sheet-reader.ts`（加參數 + 優先序） | 前台行為不變 |
| 15 | 9 | 改 `archive-detail-modal.tsx`（傳 registry） | Modal 正常 |
| 16 | 10 | 改 `/api/uploads` 覆寫閘 + `upload-studio` 帶 token | 401 可驗證 |
| 17 | 11 | `.env.local` / `.env.example` 加 `CURATOR_TOKEN` | 檔案含該行 |
| 18 | 12 | `npm run dev` + 15 項驗收 | 逐項打勾 |
| 19 | 12 | 9 項 Pre-flight 掃描 | 全 PASS |
| 20 | 13 | 寫 `AGENTS.md` 附錄 J、版本升 v1.5 | 檔案已更新 |
| 21 | 13 | `git commit` + `git push` | push 成功 |

---

## 19. 常見錯誤與排除

| 症狀 | 原因 | 處置 |
|---|---|---|
| `tsc` 報 `SheetReader` 型別錯誤 | 預覽型別寫法 | 改用 `import type { SheetDoc }` |
| 建檔中心一直停在閘門 | `CURATOR_TOKEN` 未設 | Step 11.1 / 11.2 補設定後重啟 dev |
| 上傳後前台沒變 | 正常，待核准 | 按「核准」才生效（治理機制，非 bug） |
| 上傳回 429 | 限流 60 次/分 | 等待 `Retry-After` 秒數 |
| 覆寫共用需求圖回 401 | 未帶 token 或 token 錯 | 先到建檔中心驗證密碼（token 存 sessionStorage） |
| 選檔後沒反應 | 檔案 > 10MB 或非 JPG/PNG/WEBP | 確認格式；超大檔會自動壓縮後上傳 |
| 統計列缺圖數與實際不符 | `probe` 未回傳（token 不符） | 重新驗證管理密碼 |
| 版面 padding 消失 | 用了不存在的變數 | 檢查是否誤用 `--space-7`（Phase 12 檢查項 5） |

---

## 20. 本方案不做的事（明確排除）

- 不重構 `/api/uploads` 既有限流實作（避免改動核心商業邏輯）
- 不修改 `src/data/exam-content.ts` 任何內容
- 不刪除 `public/images/**` 既有檔案（靜態圖為 immutable baseline）
- 不做 CI 缺圖檢查（列為後續議題，不在本輪範圍）
- 不做 Cloudinary 版本 API 整合（以 KV 欄位記錄上一版即可滿足回滾需求）