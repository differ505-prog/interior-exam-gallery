# Task — 平面圖版本感知抽題（方案 A）實作清單

> 狀態：已完成（2026-10-28，commit 待推送）
> 選定方案：方案 A — 版本感知兩層抽題（照抄透視圖方向感知模式）
> 本檔案為唯一任務來源，舊任務紀錄已清空。

---

## 0. 完成狀態

- [x] Step 1 — 修 `includes` 比對（3 處：practice-stats.ts ×2、use-exam-draw.ts ×1）
- [x] Step 2 — 新建 `src/lib/plan-variant.ts`
- [x] Step 3 — 新建 `src/lib/__tests__/plan-variant-balance.test.ts`（16 條）
- [x] Step 4 — `drawExamGroup` plan 分支改兩層抽題
- [x] Step 5 — 六格版本儀表 UI（`.variant-balance` / `.variant-cell` 樣式）
- [x] Step 6 — `AGENTS.md` 附錄 J ＋ 版本號 v1.5
- [x] `npx tsc --noEmit` 通過
- [x] `npm test` 41 條全綠（原 25 ＋ 新增 16）
- [ ] 本地視覺驗收：由使用者親自執行（`npm run dev` → http://localhost:3000）

### 額外修正（清單外的必要修補）

| 項目 | 說明 |
|------|------|
| `src/app/globals.css` `:root` | 補上 `--color-surface`／`--color-border`／`--color-accent`／`--color-theme`／`--color-text`／`--color-text-muted` 六個語意 token 別名（映射至既有 palette token，零新增 hex）。這六個變數原先從未定義卻被引用 48 處，導致相關 CSS 屬性整個失效（附錄 B 教訓 3 類型問題） |
| `src/components/exam-draw-section.tsx` | 抽題結果卡新增「X 版需求單」chip，與消點 chip 對稱 |

### 已知下輪議題（本輪刻意不碰）

1. CE 抽題有兩套並存路徑：`exam-draw-section.tsx` 用全域 `ceBalance.lean` 加權池，`use-exam-draw.ts` 用同題號合併池。
2. CE 連動抽取 `startsWith(baseCode)` 鎖死同題號版本，需求單其他字母不會被抽到（語意衝突，需修憲）。
3. `sumByGroup` 無任何呼叫點，可考慮併入 `practice-stats` 或刪除。

---

## 1. 目標（一句話）

平面圖抽題從「整題最少練習」升級為「版本感知兩層抽題」，確保 A~F 六種需求單練習量均衡（各 1/6），UI 新增六格版本儀表與抽題理由。

## 2. 背景與問題（已確認事實）

- `drawOneFromItems`（`src/hooks/use-exam-draw.ts`）只看整題練習次數，A~F 字母不進計算：抽中 201A 十次、201F 零次也算均衡。
- CE 連動 Step 用 `item.code.startsWith(baseCode)` 鎖死同題號，需求單別的字母沾不到光。
- 透視圖已有方向感知（`calcPerspectiveBalance`＋deficit＋遲滯帶），平面圖無對應機制，設計不對稱。
- 附帶 bug：`practice-stats.ts` 的 `uCode.includes(cleanI)` 讓「201A」的練習被算進「201」名下（另有 2 處同式樣：`sumByGroup`、`calcPerspectiveBalance` 內聯統計）。

## 3. 範圍

### 做（in scope）
1. 修 `includes` 子字串比對 → 精確比對（3 處）。
2. 新增 `src/lib/plan-variant.ts`：`PlanVariant` 型別、`PLAN_VARIANT_WEIGHTS`、`extractPlanVariant`、`calcVariantBalance`、常數。
3. `drawExamGroup` 的 `plan-ceiling-elevation` 分支改為兩層：Layer 1 算版本 deficit 選目標版本 → Layer 2 在版本內抽最少練習試卷＋附 `variantReason`。
4. `exam-draw-section.tsx` 新增 A~F 六格版本儀表（照抄透視圖三格儀表樣式）。
5. 抽題結果 Modal 顯示版本理由列（沿用 `directionReason` 欄位語意，複用同一 UI 列）。
6. 單元測試：新 `src/lib/__tests__/plan-variant-balance.test.ts`（≥8 條）。
7. `AGENTS.md` 附錄新增（版本感知抽題記錄），版本號抬升。

### 不做（out of scope，本輪不碰）
- 不改 `src/data/exam-content.ts` 任何欄位（內容鎖定白名單）。
- 不改 CE 同題號鎖定語意（`startsWith(baseCode)` 保留）。
- 不合併 `exam-draw-section.tsx` 自訂 CE 路徑與 hook 內 CE 路徑（已知兩套路徑問題，列入下輪議題）。
- 不新增篩選維度、不改 `variants` 欄位語意（避免第三級哲學衝突）。

## 4. 檔案清單（只碰這些）

| # | 檔案 | 動作 |
|---|------|------|
| 1 | `src/lib/practice-stats.ts` | 修 2 處 `includes` → 精確比對 |
| 2 | `src/lib/plan-variant.ts` | 新建（純邏輯，不可 import React/KV/Cloudinary） |
| 3 | `src/lib/__tests__/plan-variant-balance.test.ts` | 新建（≥8 條測試） |
| 4 | `src/hooks/use-exam-draw.ts` | 修 `calcPerspectiveBalance` 內 1 處 `includes`；plan 分支改兩層抽題 |
| 5 | `src/components/exam-draw-section.tsx` | 新增六格版本儀表；Modal 理由列沿用 |
| 6 | `AGENTS.md` | 附錄新增＋版本號抬升 |

## 5. Pre-flight Checklist（動手前先跑，貼結果）

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/室內設計乙級"
grep -rn "var(--" src/app/ | head -5
grep -rn "font-size:\|letter-spacing:" src/app/ | head -5
grep -rEho "@media \(max-width: [0-9]+px\)" src/ | sort | uniq -c | sort -rn
ls src/components/
git status --short && git log --oneline -3
```

- [ ] 新增色彩只進 `src/app/globals.css` 的 `:root`（本任務預期：零新增色碼，沿用 `--color-accent`＋`color-mix`）
- [ ] 不新增斷點（只用 480 / 768 / 1024 / 1200）
- [ ] `font-size` 寫死值 ≤ 6rem；`clamp()` 上限 ≤ 6rem、下限 ≥ 0.7rem
- [ ] ≥3rem 標題有 `text-wrap: balance`
- [ ] 確認工作區乾淨（`git status --short` 無未提交變更）後才開工

## 6. 實作步驟（照表操課）

### Step 1 — 修 `includes` 比對（3 處，地基）

**1-1. `src/lib/practice-stats.ts` 第 26 行（`countPracticePerItem`）**

改前：
```ts
const isMatch = uCode === cleanI || uCode.includes(cleanI);
```
改後：
```ts
const isMatch = uCode === cleanI;
```
- [ ] 同檔第 59 行（`sumByGroup` 內聯 filter）做相同修改：`(uCode === cleanI || uCode.includes(cleanI))` → `(uCode === cleanI)`。

**1-2. `src/hooks/use-exam-draw.ts`（`calcPerspectiveBalance` 內 filter，約第 150 行）**

```ts
return (
  (uCode === cleanI || uCode.includes(cleanI)) &&
  u.kind === UPLOAD_KINDS.MY_PRACTICE
);
```
→ 改為僅 `uCode === cleanI && ...`。

- [ ] 驗收：`npx tsc --noEmit` 通過；`npm test` 既有 10 條全綠。
- [ ] 注意：共用需求圖上傳（sheetCode 如 `plan-A`）本來就不等於任何試卷 code，改精確比對後自動排除，不影響試卷計數。若未來要把共用需求圖計入版本統計，另立任務，不在本輪。

### Step 2 — 新建 `src/lib/plan-variant.ts`（純邏輯層）

照抄 `use-exam-draw.ts` 透視圖常數的命名與數值語意：

```ts
import type { ArchiveItem } from "@/types/exam";
import type { UploadEntry } from "@/types/exam";
import { UPLOAD_KINDS } from "@/lib/upload-constants";

/** 平面圖版本類型 */
export type PlanVariant = "A" | "B" | "C" | "D" | "E" | "F";

export const PLAN_VARIANTS: readonly PlanVariant[] = ["A", "B", "C", "D", "E", "F"];

/** 版本權重常數（鎖定）：六版本均等，各 1/6 */
export const PLAN_VARIANT_WEIGHTS: Record<PlanVariant, number> = {
  A: 1 / 6, B: 1 / 6, C: 1 / 6, D: 1 / 6, E: 1 / 6, F: 1 / 6,
};

export const VARIANT_DEADBAND = 0.005;          // 0.5% 遲滯帶（照抄透視圖）
export const VARIANT_COMPLETION_THRESHOLD = 5;  // 單卷排除線（照抄 EXCLUDED_THRESHOLD）
export const ITEMS_PER_VARIANT = 6;             // 每版本 6 題（201–206）
export const VARIANT_ORDER: Record<PlanVariant, number> = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };
```

函式規格：

```ts
/** "201A" → "A"；"201A客天" → "A"；無字母回傳 null */
export function extractPlanVariant(code: string): PlanVariant | null {
  const match = code.match(/^\d{3}([A-F])(?![A-Z])/);
  return (match ? match[1] : null) as PlanVariant | null;
}

export type PlanVariantBalance = {
  variantCounts: Record<PlanVariant, number>;
  totalCount: number;
  variantShares: Record<PlanVariant, number>;
  variantDeficits: Record<PlanVariant, number>;
  lean: PlanVariant | "balanced";
  completedVariants: PlanVariant[];
};

/**
 * 以「圖片張數」口徑計算各版本練習量與 deficit。
 * @param planItems 平面圖試卷池（slug === "plan" 的 items）
 * @param practiceCountMap `countPracticePerItem(allItems, uploads)` 的結果
 */
export function calcVariantBalance(
  planItems: ArchiveItem[],
  practiceCountMap: Record<string, number>,
): PlanVariantBalance;
```

`calcVariantBalance` 行為（逐行照抄 `calcPerspectiveBalance` 第 130–213 行邏輯，把三方向換成六版本）：

1. `variantCounts` 初始化六版本為 0；遍歷 `planItems`，`extractPlanVariant(item.code)` 取版本，累加 `practiceCountMap[item.code] ?? 0`。
2. `totalCount`＝六版本加總。
3. `variantShares[v] ＝ totalCount > 0 ? counts[v] / totalCount : 1/6`。
4. `variantDeficits[v] ＝ 1/6 − shares[v]`。
5. `completedVariants ＝ counts[v] >= 5 × 6 ＝ 30` 的版本。
6. `activeVariants ＝ 未完成 且 deficit > 0.005`；若非空，按 deficit 降序排，平手（差 < 0.001）按 A→F 教學序，取首位為 `lean`；否則 `lean = "balanced"`。
7. 回傳全部六欄位。

- [ ] 驗收：本檔零 import React；`npx tsc --noEmit` 通過。

### Step 3 — 新建測試 `src/lib/__tests__/plan-variant-balance.test.ts`（≥8 條）

沿用 `src/lib/__tests__/practice-stats.test.ts` 的既有寫法（假 `ArchiveItem`＋假 uploads）。至少覆蓋：

| # | 案例 |
|---|------|
| 1 | `extractPlanVariant("201A")` → `"A"` |
| 2 | `extractPlanVariant("201A客天")` → `"A"` |
| 3 | `extractPlanVariant("208甲")` → `null`（非平面版本） |
| 4 | 全 0 練習時 `lean === "balanced"`，shares 各 1/6 |
| 5 | A 版本落後時 `lean === "A"` |
| 6 | 六權重和 `=== 1`（防迴歸，照抄透視圖不變式測試） |
| 7 | 某版本達 30 張時進入 `completedVariants` 且不再被選為 lean |
| 8 | deficit 平手時按 A→F 順序（A 優先） |

- [ ] 驗收：`npm test` 全綠（含既有 10 條，共 ≥18 條）。

### Step 4 — 改 `drawExamGroup` 的 plan 分支（兩層抽題）

位置：`src/hooks/use-exam-draw.ts` 約第 408–437 行（`plan-ceiling-elevation` 分支）。保留 CE 部分原樣，只改平面圖抽取段：

改前骨架：
```ts
const planResult = drawOneFromItems(planItems, practiceCountMap);
```

改後骨架（照抄同檔透視圖 Layer 1＋Layer 2，第 330–400 行模式）：

```ts
import { calcVariantBalance, extractPlanVariant, PLAN_VARIANTS } from "@/lib/plan-variant";

// ── Layer 1：版本 deficit ──
const variantBalance = calcVariantBalance(planItems, practiceCountMap);
const targetVariant = variantBalance.lean === "balanced" ? null : variantBalance.lean;

// ── Layer 2：版本內抽最少練習 ──
const planPool = targetVariant
  ? planItems.filter((item) => extractPlanVariant(item.code) === targetVariant)
  : planItems;
const planResult = drawOneFromItems(planPool, practiceCountMap);
if (planResult) {
  const targetCount = Math.round(variantBalance.totalCount / 6);
  results.push({
    ...planResult,
    directionReason: targetVariant
      ? `${targetVariant} 需求單落後（已練 ${variantBalance.variantCounts[targetVariant]} 張，目標 ${targetCount} 張）`
      : "各版本均衡，隨機抽取",
  });
}
```

- [ ] `directionReason` 欄位沿用（不新增型別欄位；UI 已有該理由列）。
- [ ] CE 部分（`startsWith(baseCode)`＋`balancedPool`＋`ceResult`）一字不動。
- [ ] 驗收：`npx tsc --noEmit` 通過；`npm test` 全綠。

### Step 5 — 六格版本儀表 UI（`src/components/exam-draw-section.tsx`）

照抄透視圖三格儀表（約第 271–323 行）的卡片樣式，複製為六格：

- 位置：透視圖儀表下方、`exam-draw-buttons` 上方，`marginTop: "var(--space-5)"`。
- 標題列文字：`平面圖版本`（沿用同檔案 `uppercase`＋`letterSpacing: "0.08em"`＋`0.75rem`＋`var(--color-text-muted)` 的 eyebrow 寫法）。
- Grid：`display: grid`，桌機 `gridTemplateColumns: "repeat(6, 1fr)"`，`gap: "var(--space-3)"`。
- RWD：`≤480px` 改 2 欄（§12 統計卡雙欄紀律；3 列 ×2 欄）。只用既有全域斷點，不新增 media 斷點值；若需自訂 class，寫進既有 `exam-draw` 相關 CSS 區並複用 480px 斷點。
- 每格內容（照抄透視格四態）：版本字母（`1.1rem` 700 accent）／張數（`1.5rem` 800＋`張`）／落後格顯示 `→ 下一題`／完成格顯示 `✓ 已完成`／其餘顯示 `目標 {target} 張`（`target ＝ Math.round(totalCount / 6)`）或 `尚未開始`。
- 落後格高亮：沿用透視格寫法（`color-mix(in srgb, var(--color-accent) 12%, transparent)` 背景＋`1px solid var(--color-accent)` 邊框＋`transition: all 200ms ease-out`）。非 highlight 格之間視覺權重一致（§12-A 條文 2）。
- 資料來源：`calcVariantBalance(planItems, countPracticePerItem(allItems, uploads))`；初值全 0；抽題後與既有 `setCeBalance`／`setPerspBalance` 同處同步更新。
- 文案品牌詞庫：只用「乙級術科／平面圖 201–206／練習圖上傳／自評複盤」固定詞組，不自創。

- [ ] 驗收：零新增 hex（`grep -rEn "color: #[0-9a-fA-F]{3,8}|background: #[0-9a-fA-F]{3,8}" src/` 無命中）；零新增斷點值；無 `≥0.06em` 字距。

### Step 6 — `AGENTS.md` 附錄（修憲記錄）

- [ ] 新增附錄（序號順延，標題如「附錄 J：平面圖版本感知抽題更新」；若當下已有附錄 J，順延為 K）：日期、雙層演算法、常數（1/6、0.5% 遲滯帶、30 張完成線）、新增／受影響檔案表、不變式測試清單。
- [ ] 版本行抬升一級並註記本附錄。
- [ ] 附錄 G 檔案索引表加 `src/lib/plan-variant.ts` 一列。

## 7. 最終驗收（全部打勾才算完）

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/室內設計乙級"
npx tsc --noEmit
npm test
grep -rEn "color: #[0-9a-fA-F]{3,8}|background: #[0-9a-fA-F]{3,8}" src/ || echo "色碼乾淨"
grep -rn "letter-spacing:" src/ | awk '$NF ~ /[0-9.]+em/ && $NF+0 > 0.05' || echo "字距乾淨"
```

- [ ] `tsc` 通過、`npm test` ≥18 條全綠。
- [ ] `npm run dev` 啟動，http://localhost:3000 抽題區出現「平面圖版本」六格儀表；按「平面圖＋CE」抽題，結果卡出現版本理由列（如 `B 需求單落後…`）。
- [ ] Commit（工作區乾淨後，一個 commit）：`feat(plan-draw): 版本感知兩層抽題 — A~F deficit＋六格儀表`，內文列常數與測試數；AGENTS.md 更新可同 commit 或獨立 `docs:` commit。

## 8. 風險與回退

- `includes`→精確比對會改變既有計數（過去被子字串灌水的計數會下降，屬修正而非迴歸）。回退：`git revert` 單一 commit 即可。
- CE 雙路徑問題本輪不碰，已在第 3 節列為下輪議題，避免 scope 膨脹。

## 9. 確認門

- [ ] 使用者已確認本清單 → 才開始 Step 1。
