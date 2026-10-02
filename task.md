# 任務：CE 區塊對稱化（A++ 簡化版，9.2/10）

> 採用方案：A++ 簡化版（池級平衡 + 視角隨機 + UI 視角化）
> 評分：9.2/10
> 建立日期：2026-10-02
> 基於：使用者確認簡化原則——視角在池內純隨機，不追蹤每個視角的練習量

---

## 0. 任務目標

將天花板圖從「1 視角 × 36 張」擴展為「3 視角（客廳天花 / 餐廳天花 / 主臥天花）× 36 張」，使天花板與立面圖資料池完全對稱（各 108 張）。抽題加權以「池」（天花板 vs 立面）為單位計數，視角（客廳 / 餐廳 / 主臥）在池內純隨機，均勻分布。

**資料量變化**：
- 現有 CE 項目：144 張（天花板 36 + 立面 108）
- 新增天花板項目：72 張（201–206 × B–F × 3 視角）
- 目標 CE 總數：**216 張**（天花板 108 + 立面 108）

---

## 1. 方案評分對照

| 方案 | 評分 | 採用 |
|------|------|------|
| A — 天花板 1 視角、1:3 不對稱 | 7.5 | ✗ |
| A+ — 天花板隨機 1 視角、1:3 不對稱 | 8.3 | ✗ |
| A++ — 對稱化 + **池級平衡** + 視角**隨機** + UI 視角化 | **9.2** | ✓ |
| B — 立面對稱天花板（原版，視角獨立計數） | 8.6 | ✗ |

---

## 2. 核心邏輯摘要

### 抽題決策樹（新）

```
80% 平面圖
 └─ 抽中 → 取 baseCode（如 "201"）
          └─ 同 baseCode 找 CE 池
                    └─ 20% CE
                          ├─ ceiling_total > elevation_total → 抽天花板池
                          ├─ elevation_total > ceiling_total → 抽立面池
                          └─ 兩者相等 → 隨機 50/50
                                    └─ 池內：均勻隨機抽任一視角任一題
```

### 池級追蹤（2 變數）

```
ceiling_total    = 天花板池已練習張數（所有 view 含 "天" 的 code）
elevation_total  = 立面池已練習張數（所有 view 含 "立" 的 code）
```

### 視角隨機（池內均勻）

- 進入天花板池後，36 張 A 版本的客廳 / 餐廳 / 主臥 均勻隨機抽出 1 張
- 進入立面池後，36 張 A 版本的客廳 / 餐廳 / 主臥 均勻隨機抽出 1 張
- **視角不影響下次加權**（每次抽題都是池內均勻隨機）

### UI 呈現

- 平衡條：「天花板 X 張 / 立面 Y 張」
- 圓餅圖：2 切片（天花 vs 立面），不細分 6 視角
- view chip：保留作為視覺標籤與篩選器，純裝飾用途

---

## 3. 憲法合規檢查（Pre-flight）

- [ ] 3.1 工作樹乾淨（`git status` 無未提交檔案；若不乾淨先 commit）
- [ ] 3.2 執行 `npm run dev` 確認 `http://localhost:3000` 可運行
- [ ] 3.3 讀取 `AGENTS.md` 第六章「試卷架構鎖定」與附錄 E「豁免登記表」
- [ ] 3.4 讀取 `src/types/exam.ts`（`ArchiveItem` 型別、`notes` 為 `string` 非 `string[]`）
- [ ] 3.5 確認 `src/data/exam-content.ts` 為內容鎖定白名單

---

## 4. 詳細實作步驟

### Step 4.1 — 環境備份與驗證

- [ ] 4.1.1 執行 `git status` 確認工作樹狀態
- [ ] 4.1.2 若有未提交變更，執行 `git add -A && git commit -m "chore: pre-symmetry snapshot"`
- [ ] 4.1.3 執行 `npm run dev` 確認目前 `http://localhost:3000` 可運行
- [ ] 4.1.4 截圖當前 CE 區塊狀態存證

### Step 4.2 — 讀取現有檔案

- [ ] 4.2.1 讀取 `AGENTS.md` 第六章、附錄 E、附錄 G
- [ ] 4.2.2 讀取 `src/data/exam-content.ts` 全文（了解 144 張現有項目結構）
- [ ] 4.2.3 讀取 `src/types/exam.ts`（`ArchiveItem` 型別）
- [ ] 4.2.4 讀取 `src/hooks/use-exam-draw.ts`（抽題加權邏輯）
- [ ] 4.2.5 讀取 `src/components/exam-draw-section.tsx`（抽題 UI）
- [ ] 4.2.6 讀取 `src/components/archive-card.tsx`（試卷卡 UI）
- [ ] 4.2.7 讀取 `src/components/archive-filter.tsx`（篩選器）
- [ ] 4.2.8 讀取 `src/components/archive-detail-modal.tsx`（試卷詳情）

### Step 4.3 — 更新 AGENTS.md 憲法

- [ ] 4.3.1 **第六章試卷架構表**天花列：由「A–F（6 視角不拆）」改為「A–F × (客廳天花 / 餐廳天花 / 主臥天花)」
- [ ] 4.3.2 **第六章天花列總計**：36 → 108 張
- [ ] 4.3.3 **第六章天花板與立面圖總計**：144 → 216 張
- [ ] 4.3.4 **第六章試卷總計表**：30 + 216 + 18 + 12 = **276 張**（同步更新）
- [ ] 4.3.5 **附錄 E 豁免登記表新增 #3**：

| # | 位置 | 違規值 | 豁免理由 |
|---|------|--------|----------|
| 3 | `src/data/exam-content.ts` | 72 張天花板視角衍生項由 AI 推論生成（無原始政府公告對應） | 方案 A++ 採對稱化設計，允許 AI 基於立面視角邏輯推論天花視角內容 |

- [ ] 4.3.6 **附錄 G 試卷總數統計同步更新**

### Step 4.4 — 擴充 src/data/exam-content.ts（核心實作）

#### 4.4.1 命名規則

| 類型 | Code 格式 | 範例 | 總數 |
|------|-----------|------|------|
| 客廳天花 | `${q}${v}客天` | `201A客天` | 36 張 |
| 餐廳天花 | `${q}${v}餐天` | `201A餐天` | 36 張 |
| 主臥天花 | `${q}${v}臥天` | `201A臥天` | 36 張 |
| 客廳立面 | `${q}${v}客立` | `201A客立` | 36 張（既有） |
| 餐廳立面 | `${q}${v}餐立` | `201A餐立` | 36 張（既有） |
| 主臥立面 | `${q}${v}臥立` | `201A臥立` | 36 張（既有） |

#### 4.4.2 view 欄位值（新增至 ArchiveItem 型別）

```ts
type CEView = '客天' | '餐天' | '臥天' | '客立' | '餐立' | '臥立';
```

#### 4.4.3 focus 撰寫規範

- 完整肯定句（不得為問句）
- 客廳天花：「客廳天花板配置，含客廳燈具迴路、空調出風口投影與間接照明飾燈配置。」
- 餐廳天花：「餐廳天花板配置，含餐廳吊燈位置、空調出風口與飾燈投射範圍。」
- 主臥天花：「主臥天花板配置，含主臥間接照明鏈條、空調出風口投影與飾燈位置。」

#### 4.4.4 notes 撰寫規範

- 每張 4–6 條扣分點，全部以 `×` 前綴開頭
- 客廳天花例：`× 客廳天花燈具迴路未標`、`× 客廳出風口尺寸遺漏`、`× 客廳天花間接照明取消扣`、`× 客廳飾燈位置與立面圖不一致`、`× 客廳天花高度標註缺漏`
- 餐廳天花例：`× 餐廳吊燈位置錯誤`、`× 餐廳天花尺寸鏈標註缺漏`、`× 餐廳空調出風口與餐廳吊燈衝突`、`× 餐廳天花板飾燈電源迴路未標`
- 主臥天花例：`× 主臥間接照明鏈條遺漏`、`× 主臥出風口投影錯誤`、`× 主臥天花飾燈與床頭位置衝突`、`× 主臥天花板高度鏈標註缺漏`

#### 4.4.5 程式碼生成方式

在 `exam-content.ts` 的 `ceilingElevationItems.forEach` 迴圈內，新增 3 個 `.push()` 呼叫：

```ts
// 2. 客廳天花（新）
ceilingElevationItems.push({
  code: `${q}${v}客天`,
  title: `${q}${v} 客廳天花`,
  variants: ["客廳天花", "燈具迴路"],
  focus: "客廳天花板配置，含客廳燈具迴路、空調出風口投影與間接照明飾燈配置。",
  notes: `× 客廳天花燈具迴路未標\n× 客廳出風口尺寸遺漏\n× 客廳天花間接照明取消扣\n× 客廳飾燈位置與立面圖不一致\n× 客廳天花高度標註缺漏`,
});

// 3. 餐廳天花（新）
ceilingElevationItems.push({
  code: `${q}${v}餐天`,
  title: `${q}${v} 餐廳天花`,
  variants: ["餐廳天花", "燈具迴路"],
  focus: "餐廳天花板配置，含餐廳吊燈位置、空調出風口與飾燈投射範圍。",
  notes: `× 餐廳吊燈位置錯誤\n× 餐廳天花尺寸鏈標註缺漏\n× 餐廳空調出風口與餐廳吊燈衝突\n× 餐廳天花板飾燈電源迴路未標`,
});

// 4. 主臥天花（新）
ceilingElevationItems.push({
  code: `${q}${v}臥天`,
  title: `${q}${v} 主臥天花`,
  variants: ["主臥天花", "燈具迴路"],
  focus: "主臥天花板配置，含主臥間接照明鏈條、空調出風口投影與飾燈位置。",
  notes: `× 主臥間接照明鏈條遺漏\n× 主臥出風口投影錯誤\n× 主臥天花飾燈與床頭位置衝突\n× 主臥天花板高度鏈標註缺漏`,
});
```

- [ ] 4.4.6 執行 `npx tsc --noEmit` 驗證無編譯錯誤
- [ ] 4.4.7 **注意**：`notes` 為 `string` 型別（非 `string[]`），多條以 `\n` 換行分隔

### Step 4.5 — 更新 src/types/exam.ts

- [ ] 4.5.1 在 `ArchiveItem` 介面新增 `view` 欄位：

```ts
view?: '客天' | '餐天' | '臥天' | '客立' | '餐立' | '臥立';
```

- [ ] 4.5.2 為 72 張新增天花板項目標 `view` 欄位
- [ ] 4.5.3 為 108 張既有立面項目標 `view` 欄位
- [ ] 4.5.4 執行 `npx tsc --noEmit` 確認型別正確

### Step 4.6 — 更新抽題邏輯 src/hooks/use-exam-draw.ts（核心改動）

#### 4.6.1 getCEDrawingType 改為以 view 欄位為主

```ts
export function getCEDrawingType(item: ArchiveItem): "ceiling" | "elevation" {
  // 優先用 view 欄位判斷
  if (item.view) {
    return item.view.endsWith('天') ? 'ceiling' : 'elevation';
  }
  // 向後相容：fallback 以 code 字串判斷
  return item.code.includes('天花') || item.code.includes('客天') || item.code.includes('餐天') || item.code.includes('臥天')
    ? 'ceiling'
    : 'elevation';
}
```

#### 4.6.2 calcCECategoryBalance 以 view 欄位識別池

```ts
export function calcCECategoryBalance(
  uploads: UploadEntry[],
  ceilingItems: ArchiveItem[],
  elevationItems: ArchiveItem[]
): CECategoryBalance {
  // 以 item.view 欄位識別天花板池（108 張）
  const ceilingCodes = new Set(ceilingItems.map((i) => i.code));
  // 以 item.view 欄位識別立面池（108 張）
  const elevationCodes = new Set(elevationItems.map((i) => i.code));

  const ceilingUploaded = new Set(
    uploads
      .filter((u) => ceilingCodes.has(u.sheetCode) && u.kind === UPLOAD_KINDS.MY_PRACTICE)
      .map((u) => u.sheetCode)
  ).size;

  const elevationUploaded = new Set(
    uploads
      .filter((u) => elevationCodes.has(u.sheetCode) && u.kind === UPLOAD_KINDS.MY_PRACTICE)
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

#### 4.6.3 drawExamGroup 內的 CE 子池邏輯（核心改動）

```
舊邏輯：
  同 baseCode 的天花板池 + 立面池 → 合併 → 加權抽 → 單一題目

新邏輯（池級平衡 + 視角隨機）：
  同 baseCode 的天花板池（客天/餐天/臥天，各若干張）→ 均勻隨機抽 1 張
  同 baseCode 的立面池（客立/餐立/臥立，各若干張）→ 均勻隨機抽 1 張
  池選擇由 ceiling_total vs elevation_total 決定
```

**抽題流程（在 plan-ceiling-elevation 分支內）**：

```ts
// Step 3：取同 baseCode 的 CE 試卷（新版，含 view 欄位）
const matchingCeItems = allCeItems.filter((item) =>
  item.code.startsWith(baseCode)
);

// Step 4：以 view 欄位分類天花板池 vs 立面池
const ceilingPool = matchingCeItems.filter(
  (item) => getCEDrawingType(item) === "ceiling"
);
const elevationPool = matchingCeItems.filter(
  (item) => getCEDrawingType(item) === "elevation"
);

// Step 5：計算池級平衡（ceiling_total vs elevation_total）
// 由呼叫端傳入 lean，或在此函式內呼叫 calcCECategoryBalance

// Step 6：根據 lean 決定池加權抽題
let selectedPool: ArchiveItem[];
if (lean === "ceiling") {
  // 天花板已練更多 → 80% 抽立面池
  selectedPool = [
    ...elevationPool, ...elevationPool, ...elevationPool, ...elevationPool, ...ceilingPool,
  ];
} else if (lean === "elevation") {
  // 立面已練更多 → 80% 抽天花板池
  selectedPool = [
    ...ceilingPool, ...ceilingPool, ...ceilingPool, ...ceilingPool, ...elevationPool,
  ];
} else {
  // balanced → 50/50
  selectedPool = [...ceilingPool, ...elevationPool];
}

// Step 7：池內均勻隨機抽 1 張（視角純隨機，不加權）
const ceResult = drawOneFromItems(selectedPool, practiceCountMap);
```

#### 4.6.4 池內視角均勻分布驗證

- 確認天花板池（`${q}A客天` / `${q}A餐天` / `${q}A臥天` 等 3 視角）數量相等
- 確認立面池（`${q}A客立` / `${q}A餐立` / `${q}A臥立` 等 3 視角）數量相等
- 抽題 20 次以上，觀察各視角出現頻率接近均勻分布

#### 4.6.5 向後相容

- 既有 `code` 含「天花」字樣（無 `view` 欄位）自動歸入天花板池
- 既有 `code` 含「客立/餐立/臥立」（無 `view` 欄位）自動歸入立面池
- Supabase 練習紀錄以 `code` 為主鍵，無需遷移

#### 4.6.6 驗證清單

- [ ] 抽 10 次，確認天花板池 / 立面池分配比例符合加權邏輯
- [ ] 同一池抽 20 次，確認 3 個視角（客/餐/臥）出現頻率接近 1:1:1
- [ ] `npx tsc --noEmit` 無錯誤

### Step 4.7 — UI 元件更新

#### 4.7.1 src/components/archive-card.tsx

- [ ] 卡片底部顯示 `view` chip（客廳天花 / 餐廳天花 / 主至天花 / 客立 / 餐立 / 臥立）
- [ ] chip 樣式：`uppercase tracking-widest text-xs` + 暖棕底色 `bg-amber-100 text-amber-800`
- [ ] 點擊 chip 觸發同視角篩選

#### 4.7.2 src/components/archive-filter.tsx

- [ ] 新增「視角」維度篩選器，選項：全部 / 客廳 / 餐廳 / 主臥
- [ ] 與「題目」「版本」篩選器並列
- [ ] 支援多重篩選（視角 + 版本 + 題號）

#### 4.7.3 src/components/exam-draw-section.tsx

- [ ] 面板標題改為「視角抽題（天/立）」
- [ ] 平衡條改為「天花板 X 張 / 立面 Y 張」二級練習總量（移除視角分佈）
- [ ] 圓餅圖改為「天花板 vs 立面」二分圓餅（2 切片，不細分 6 視角）

#### 4.7.4 src/components/archive-detail-modal.tsx

- [ ] Modal 頂部顯示「視角」標籤（客廳天花 / 餐廳天花 / ...）
- [ ] 備考筆記區塊標題改為「備考知識」，副標題顯示「該視角繪圖要點」

#### 4.7.5 src/app/page.tsx

- [ ] CE 區塊標題：「天花板與立面圖（216 張）」
- [ ] 確認首頁 CE 區塊正常顯示 216 張試卷卡

### Step 4.8 — 視覺驗收（UAT）

- [ ] 4.8.1 `npm run dev` 啟動，確認 `http://localhost:3000` 無 console error
- [ ] 4.8.2 首頁 CE 區塊標題顯示「216 張」
- [ ] 4.8.3 archive-card 顯示 view chip（6 種：客天/餐天/臥天/客立/餐立/臥立）
- [ ] 4.8.4 archive-filter 視角篩選器可切換
- [ ] 4.8.5 exam-draw-section 平衡條顯示「天花板 X / 立面 Y」
- [ ] 4.8.6 抽題按鈕 10 次，觀察池分配是否符合加權邏輯
- [ ] 4.8.7 同一池抽 20 次，驗證 3 個視角均勻分布
- [ ] 4.8.8 RWD（mobile / tablet / desktop 三斷點皆正常）
- [ ] 4.8.9 截圖存證

### Step 4.9 — 文檔同步與 Git Commit

- [ ] 4.9.1 執行 `git status` 確認所有變更
- [ ] 4.9.2 執行 `git add -A`
- [ ] 4.9.3 執行 `git commit -m "feat: CE 對稱化 — 72 新天花板視角、池級平衡、視角隨機、UI 更新"`
- [ ] 4.9.4 確認 commit hash

---

## 5. 預估工時

| 步驟 | 工時 |
|------|------|
| Step 4.1 環境備份 | 5 分鐘 |
| Step 4.2 讀取檔案 | 10 分鐘 |
| Step 4.3 AGENTS.md | 15 分鐘 |
| Step 4.4 exam-content.ts | 60 分鐘 |
| Step 4.5 exam.ts | 10 分鐘 |
| Step 4.6 use-exam-draw.ts | 30 分鐘 |
| Step 4.7 UI 元件 | 40 分鐘 |
| Step 4.8 視覺驗收 | 15 分鐘 |
| Step 4.9 commit | 5 分鐘 |
| **總計** | **3 小時 10 分鐘** |

---

## 6. 完成定義（Definition of Done）

- [ ] AGENTS.md 第六章、附錄 E (#3)、附錄 G 已同步更新
- [ ] `exam-content.ts` 新增 72 張天花板視角項（客天/餐天/臥天 各 36 張）
- [ ] `exam-content.ts` 合計 216 張 CE 項目（天花板 108 + 立面 108）
- [ ] `exam.ts` 新增 `view` 選填欄位
- [ ] `use-exam-draw.ts` 以池（天花板/立面）為單位計數；池內視角均勻隨機
- [ ] archive-card、archive-filter、exam-draw-section、archive-detail-modal 已同步更新
- [ ] `npm run dev` 正常運行 `http://localhost:3000`
- [ ] 視覺驗收 8/8 通過
- [ ] 已 commit（含 `feat: CE 對稱化`）

---

## 7. 緊急回退計畫

若中途發生重大問題，執行以下回退：

```bash
# 1. 停止 npm run dev
# 2. 還原所有變更
git restore src/data/exam-content.ts
git restore src/types/exam.ts
git restore src/hooks/use-exam-draw.ts
git restore src/components/
git restore AGENTS.md

# 3. 確認可運行
npm run dev
```

回退後狀態：保留 Step 4.1 的 commit 與既有 144 張試卷結構。
