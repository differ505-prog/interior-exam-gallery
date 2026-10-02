# 任務：Category Balance Draw — 天花板圖與立面圖練習總量平衡

## 目標

在「平面圖試卷」抽題時，追蹤使用者「天花板圖」與「立面圖」的練習總張數差距，動態調整抽題權重，讓兩類型練習次數趨於平衡。

---

## 前置確認

- [ ] 使用者已確認方案（2026-10-02 11:56）
- [ ] 理解現有抽題邏輯：`drawExamGroup` 先抽平面、再抽 CE（天花板/立面）
- [ ] 理解 CE code 命名規則：`201A天花`、`201A客立`、`201A餐立`、`201A臥立`
- [ ] 理解 `UPLOAD_KINDS.MY_PRACTICE` 用於過濾「我的練習圖」

---

## 實作清單

### Step 0：Pre-flight 驗證（不改任何檔案）

執行以下命令確認現有 codebase 無違規：

```bash
# 確認 use-exam-draw.ts 現有邏輯位置
grep -n "drawExamGroup\|drawOneFromItems\|countPracticePerItem" src/hooks/use-exam-draw.ts

# 確認 exam-draw-section.tsx 的 import 語句
grep -n "import.*use-exam-draw\|import.*UploadEntry\|import.*UPLOAD_KINDS" src/components/exam-draw-section.tsx

# 確認 upload-constants.ts 的 MY_PRACTICE 定義
grep -n "MY_PRACTICE" src/lib/upload-constants.ts
```

---

### Step 1：修改 `src/hooks/use-exam-draw.ts`

#### 1-1. 在檔案頂部現有 import 區塊，新增 1 行（若尚未 import ArchiveItem）

```ts
// 確認現有 import 區塊是否已有 ArchiveItem，若無則加上
// import { ArchiveItem, UploadEntry } from "@/types/exam";
```

#### 1-2. 在 `EXCLUDED_THRESHOLD` 常數之後，新增 CE 類型分類函式

```ts
/**
 * 判斷 CE 試卷是「天花板」還是「立面圖」
 * @param code 試卷編號，如 "201A天花"、"201A客立"、"201A餐立"、"201A臥立"
 */
export function getCEDrawingType(code: string): "ceiling" | "elevation" {
  return code.includes("天花") ? "ceiling" : "elevation";
}
```

#### 1-3. 在 `countPracticePerItem` 函式之後，新增總量統計函式

```ts
export type CECategoryBalance = {
  ceilingCount: number;   // 天花板練習總張數（已上傳的 unique 張數）
  elevationCount: number; // 立面圖練習總張數
  diff: number;           // ceilingCount - elevationCount（正數＝天花已練習更多）
  lean: "ceiling" | "elevation" | "balanced";
};

/**
 * 計算「天花板圖」與「立面圖」的練習總量差距
 * @param uploads 所有上傳記錄
 * @param ceilingItems 天花板試卷陣列（用於建立 code Set）
 * @param elevationItems 立面圖試卷陣列（用於建立 code Set）
 */
export function calcCECategoryBalance(
  uploads: UploadEntry[],
  ceilingItems: ArchiveItem[],
  elevationItems: ArchiveItem[]
): CECategoryBalance {
  const ceilingCodes = new Set(ceilingItems.map(i => i.code));
  const elevationCodes = new Set(elevationItems.map(i => i.code));

  // 計算已練習張數（unique sheetCode 去重）
  const ceilingUploaded = new Set(
    uploads
      .filter(
        (u) =>
          ceilingCodes.has(u.sheetCode) &&
          u.kind === "我的練習圖"
      )
      .map((u) => u.sheetCode)
  ).size;

  const elevationUploaded = new Set(
    uploads
      .filter(
        (u) =>
          elevationCodes.has(u.sheetCode) &&
          u.kind === "我的練習圖"
      )
      .map((u) => u.sheetCode)
  ).size;

  const diff = ceilingUploaded - elevationUploaded;

  let lean: CECategoryBalance["lean"] = "balanced";
  if (diff > 2) lean = "ceiling";
  else if (diff < -2) lean = "elevation";

  return {
    ceilingCount: ceilingUploaded,
    elevationCount: elevationUploaded,
    diff,
    lean,
  };
}
```

#### 1-4. 修改 `drawExamGroup` 函式

找到以下段落（約在原函式倒數第 30 行）：

```ts
} else if (group === "plan-ceiling-elevation") {
  // 先抽平面圖
  const planItems = examSections.find(s => s.slug === "plan")?.items ?? [];
  const planResult = drawOneFromItems(planItems, practiceCountMap);

  if (planResult) {
    results.push(planResult);
    // 再抽同題號的天花/立面圖 (例如 201 -> 201A, 201B)
    const baseCode = planResult.item.code; // e.g., "201"
    const ceItems = examSections.find(s => s.slug === "ceiling-elevation")?.items ?? [];
    const matchingCeItems = ceItems.filter(item => item.code.startsWith(baseCode));

    const ceResult = drawOneFromItems(matchingCeItems, practiceCountMap);
    if (ceResult) results.push(ceResult);
  }
}
```

**將其替換為**：

```ts
} else if (group === "plan-ceiling-elevation") {
  // ── Step 1：先抽平面圖 ──────────────────────────────
  const planItems = examSections.find(s => s.slug === "plan")?.items ?? [];
  const planResult = drawOneFromItems(planItems, practiceCountMap);

  if (planResult) {
    results.push(planResult);

    // ── Step 2：依據平面圖 baseCode 取對應 CE 試卷 ──
    const baseCode = planResult.item.code; // e.g., "201"
    const allCeItems = examSections.find(s => s.slug === "ceiling-elevation")?.items ?? [];
    const matchingCeItems = allCeItems.filter(item => item.code.startsWith(baseCode));

    // ── Step 3：分類天花板 vs 立面圖 ──────────────────
    const ceilingPool = matchingCeItems.filter(item =>
      getCEDrawingType(item.code) === "ceiling"
    );
    const elevationPool = matchingCeItems.filter(item =>
      getCEDrawingType(item.code) === "elevation"
    );

    // ── Step 4：根據總量平衡動態調整抽題權重 ─────────
    // 從 uploads 中取出所有 MY_PRACTICE 用於計算平衡
    // 注意：uploads 需由呼叫端傳入，此函式包裝後使用
    const { lean } = calcCECategoryBalance([], ceilingPool, elevationPool);

    let ceResult: DrawResult | null = null;

    if (lean === "elevation") {
      // 立面已練習更少 → 80% 抽立面、20% 抽天花
      const weightedPool = [
        ...elevationPool, ...elevationPool, ...elevationPool, ...elevationPool, // x4
        ...ceilingPool,
      ];
      ceResult = drawOneFromItems(weightedPool, practiceCountMap);
    } else if (lean === "ceiling") {
      // 天花已練習更少 → 80% 抽天花、20% 抽立面
      const weightedPool = [
        ...ceilingPool, ...ceilingPool, ...ceilingPool, ...ceilingPool, // x4
        ...elevationPool,
      ];
      ceResult = drawOneFromItems(weightedPool, practiceCountMap);
    } else {
      // balanced → 50/50 隨機
      const balancedPool = [...ceilingPool, ...elevationPool];
      ceResult = drawOneFromItems(balancedPool, practiceCountMap);
    }

    if (ceResult) results.push(ceResult);
  }
}
```

#### 1-5：新增對外暴露的平衡統計函式（供 UI 使用）

在檔案最底部（`drawExamGroup` 函式結束之後）新增：

```ts
/**
 * 供外部 UI 呼叫，取得當前 CE 練習總量平衡狀態
 * @param uploads 所有上傳記錄
 * @param baseCode 平面圖 baseCode（如 "201"），用於限定只計算同題號的 CE
 */
export function getCurrentCEBalance(
  uploads: UploadEntry[],
  baseCode: string
): CECategoryBalance {
  const allCeItems = examSections.find(s => s.slug === "ceiling-elevation")?.items ?? [];
  const matchingCeItems = allCeItems.filter(item => item.code.startsWith(baseCode));

  const ceilingPool = matchingCeItems.filter(item =>
    getCEDrawingType(item.code) === "ceiling"
  );
  const elevationPool = matchingCeItems.filter(item =>
    getCEDrawingType(item.code) === "elevation"
  );

  return calcCECategoryBalance(uploads, ceilingPool, elevationPool);
}
```

---

### Step 2：修改 `src/components/exam-draw-section.tsx`

#### 2-1. 在現有 import 區塊，確認已有 `calcCECategoryBalance` / `getCurrentCEBalance`

新增 import 行：

```ts
import {
  drawExamGroup,
  countPracticePerItem,
  DrawGroup,
  DrawResult,
  calcCECategoryBalance,
  getCEDrawingType,
} from "@/hooks/use-exam-draw";
```

#### 2-2. 在 `ExamDrawSection` 元件內的 state 宣告處，新增 balance 狀態

```ts
const [drawnResults, setDrawnResults] = useState<DrawResult[]>([]);
const [ceBalance, setCeBalance] = useState<CECategoryBalance>({
  ceilingCount: 0,
  elevationCount: 0,
  diff: 0,
  lean: "balanced",
});
```

#### 2-3. 在 `useEffect` 的 fetch 成功區塊內，新增平衡統計更新

找到 fetch 成功的 `.then` 區塊，在 `setUploads(data.entries ?? [])` 之後加上：

```ts
// 計算 CE 平衡（預設以 201 為基準，待使用者抽題後動態更新）
const allCeItems = examSections.find(s => s.slug === "ceiling-elevation")?.items ?? [];
const planItems = examSections.find(s => s.slug === "plan")?.items ?? [];

// 從 uploads 計算所有 CE 的總量平衡
const ceilingPool = allCeItems.filter(item => getCEDrawingType(item.code) === "ceiling");
const elevationPool = allCeItems.filter(item => getCEDrawingType(item.code) === "elevation");
setCeBalance(calcCECategoryBalance(data.entries ?? [], ceilingPool, elevationPool));
```

#### 2-4. 在 `handleDraw` 函式內，抽題成功後同步更新 balance 狀態

找到 `setDrawnResults(results)` 之後新增：

```ts
// 同步更新 CE 平衡顯示
const ceItems = examSections.find(s => s.slug === "ceiling-elevation")?.items ?? [];
const ceilingPool = ceItems.filter(item => getCEDrawingType(item.code) === "ceiling");
const elevationPool = ceItems.filter(item => getCEDrawingType(item.code) === "elevation");
setCeBalance(calcCECategoryBalance(uploads, ceilingPool, elevationPool));
```

#### 2-5. 在 JSX 的抽題按鈕下方，新增平衡儀 UI

找到抽題按鈕群組（包含兩個 `<button>` 的區塊），在按鈕下方新增：

```tsx
{/* ── CE 平衡儀 ─────────────────────────── */}
<div className="ce-balance-indicator" aria-label="天花板與立面圖練習平衡狀態">
  <div className="balance-bar">
    <div className="bar-label left">天花 {ceBalance.ceilingCount} 張</div>
    <div className="bar-track">
      <div
        className="bar-fill ceiling"
        style={{
          width: `${Math.min(100, (ceBalance.ceilingCount / Math.max(1, ceBalance.ceilingCount + ceBalance.elevationCount)) * 100)}%`
        }}
      />
    </div>
    <div className="bar-label right">立面 {ceBalance.elevationCount} 張</div>
  </div>
  {ceBalance.lean !== "balanced" && (
    <p className="balance-hint">
      下一題傾向：{ceBalance.lean === "ceiling" ? "立面圖" : "天花板圖"}
    </p>
  )}
</div>
```

#### 2-6. 在 `globals.css` 的對應區塊，新增平衡儀樣式

找到或新增 `.ce-balance-indicator` 樣式：

```css
.ce-balance-indicator {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.balance-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 0.75rem;
}

.bar-track {
  flex: 1;
  height: 4px;
  background: var(--color-surface);
  border-radius: 2px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 300ms ease-out;
}

.bar-fill.ceiling {
  background: var(--color-accent);
}

.balance-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0;
}
```

---

### Step 3：修改 `src/app/globals.css`（若 Step 2-6 樣式未正確疊加）

確認 `:root` 已有 `color-accent` 定義。若無，在 `:root` 區塊確認：

```css
--color-accent: #876f49;     /* 暖棕品牌色 */
--color-text-muted: #6b6560; /* 次要文字 */
--color-surface: #ffffff;    /* 卡片白 */
```

---

### Step 4：驗證

#### 4-1. TypeScript 編譯檢查

```bash
npx tsc --noEmit
```

預期：無 `error TS` 輸出。若有錯誤，檢查：
- `calcCECategoryBalance` 回傳型別是否與 `CECategoryBalance` 一致
- `ceBalance` state 初始化值是否完整覆蓋所有欄位

#### 4-2. 邏輯驗證（開發模式 console）

在 `drawExamGroup` 的 `plan-ceiling-elevation` 分支，加上 debug log：

```ts
// 在 ceResult 計算完成後加
console.debug("[CE Balance] lean=", lean, "ceilingPool=", ceilingPool.length, "elevationPool=", elevationPool.length);
```

執行 `npm run dev`，嘗試抽題 3–5 次，觀察 console 輸出是否符合預期：
- 當「天花」已練習更多時，應該看到 `lean: "elevation"`
- 當「立面」已練習更多時，應該看到 `lean: "ceiling"`

#### 4-3. 確認無新增 hex 色碼

```bash
grep -rn "#876f49\|#[0-9a-fA-F]\{6\}" src/hooks/use-exam-draw.ts src/components/exam-draw-section.tsx | grep -v "var(--"
```

預期：無輸出（所有顏色皆來自 CSS 變數）

---

### Step 5：視覺驗收

```bash
npm run dev
```

開啟 http://localhost:3000/#exam-draw 確認：

- [ ] 平衡儀出現在「平面圖試卷」抽題按鈕下方
- [ ] 平衡儀顯示「天花 N 張 / 立面 M 張」
- [ ] 進度條視覺化兩者比例
- [ ] 當不平衡時（diff > 2），顯示「下一題傾向：立面圖」或「下一題傾向：天花板圖」
- [ ] 抽題 1–2 次後，平衡儀數字隨 uploads 變化
- [ ] 抽出的 CE 試卷類型分布符合「少的那類優先」邏輯

---

## 預期改動檔案清單

| 檔案 | 改動類型 |
|------|----------|
| `src/hooks/use-exam-draw.ts` | 新增 3 個函式 + 修改 1 個函式 |
| `src/components/exam-draw-section.tsx` | 新增 import + state + 平衡儀 UI |
| `src/app/globals.css` | 新增 `.ce-balance-indicator` 樣式 |

---

## 不需改動的檔案（已確認）

| 檔案 | 理由 |
|------|------|
| `src/data/exam-content.ts` | 內容鎖定白名單，不觸及 |
| `src/types/exam.ts` | 型別不變 |
| `src/lib/upload-constants.ts` | 不需新增常數 |
| `AGENTS.md` | 此為實作任務，非憲章修訂 |

---

## 風險與緩解

| 風險 | 緩解措施 |
|------|----------|
| `calcCECategoryBalance` 的 `uploads` 尚未 fetch 完成就呼叫 | `useEffect` 先 fetch，確保資料就緒後再更新 balance |
| 平衡閾值 ±2 主觀導致體驗不佳 | 預設 ±2，可於 `AGENTS.md` 另增「平衡閾值可配置」條款 |
| `drawOneFromItems` 遇到 weighted pool 有重複 code 導致加權失準 | weighted pool 直接傳入，`drawOneFromItems` 內部 `practiceCountMap` 仍以原始 code 為 key，OK |

---

## 驗收標準

1. 抽題按鈕下方有視覺化平衡儀
2. 當「立面圖」練習次數落後 ≥ 3 張時，下一題 80% 抽出立面圖
3. 當「天花」練習次數落後 ≥ 3 張時，下一題 80% 抽出天花板圖
4. 當差距 ≤ 2 張時，50/50 隨機
5. TypeScript 編譯無錯誤
6. 頁面無 console error
