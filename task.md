# 任務：題庫版本從 A–E 擴充至 A–F

## 目標
- 試卷總數：180 張 → 210 張
- 新增版本：F（共 6 張平面圖 + 24 張天花/立面圖 = 30 張新試卷）

## 前置確認
- [ ] 使用者已確認方案（2026-09-30 12:01）
- [ ] 抽題邏輯 (`use-exam-draw.ts`) 無需修改，動態讀取 `examSections`
- [ ] `src/lib/requirement-resolver.ts` 無需修改
- [ ] 大樣圖、透視圖版本不變（不受影響）

---

## 實作清單

### Step 1：修改 `src/data/exam-content.ts`

#### 1-1. 版本陣列加 F
```diff
- const variants = ["A", "B", "C", "D", "E"];
+ const variants = ["A", "B", "C", "D", "E", "F"];
```

#### 1-2. 更新平面圖區塊 summary（L60）
```diff
- summary: "收錄 201-206 各版型（A-E）的平面配置圖，搭配家具尺度與應考節奏。",
+ summary: "收錄 201-206 各版型（A-F）的平面配置圖，搭配家具尺度與應考節奏。",
```

#### 1-3. 更新天花板與立面圖區塊 summary（L66）
```diff
- summary: "收錄 201-206 各版型（A-E）的天花板配置圖與立面圖。",
+ summary: "收錄 201-206 各版型（A-F）的天花板配置圖與立面圖。",
```

---

### Step 2：修改 `src/components/upload-studio.tsx`

#### 2-1. 共用需求圖版本下拉選項加 F（L76）
```diff
- const variantOptions = ["A", "B", "C", "D", "E"];
+ const variantOptions = ["A", "B", "C", "D", "E", "F"];
```

---

### Step 3：修改 `AGENTS.md`

#### 3-1. 第六章 試卷架構鎖定表
```diff
| 平面圖 | `plan` | 201–206 | A, B, C, D, E | 30 張 |
| 天花板與立面圖 | `ceiling-elevation` | 201–206 | A–E × (天花/客立/餐立/臥立) | 120 張 |

更新為：
| 平面圖 | `plan` | 201–206 | A, B, C, D, E, F | 36 張 |
| 天花板與立面圖 | `ceiling-elevation` | 201–206 | A–F × (天花/客立/餐立/臥立) | 144 張 |
```

#### 3-2. 第六章 總結文句
```diff
- 本專案試卷題庫定義於 `src/data/exam-content.ts`，共 180 張試卷
+ 本專案試卷題庫定義於 `src/data/exam-content.ts`，共 210 張試卷
```

#### 3-3. 題庫內容管理標準（`.cursor/rules/exam-content.mdc`）
版本篩選說明加 F：
```diff
- **版本篩選**（室內平面圖限定）：A / B / C / D / E
+ **版本篩選**（室內平面圖限定）：A / B / C / D / E / F
```

#### 3-4. 附錄 D 信任錨點
```diff
- 本專案試卷題數 180 張
+ 本專案試卷題數 210 張
```

---

### Step 4：驗證

執行以下命令確認無新增 hex 色碼、無破壞既有邏輯：

```bash
# 確認 variants 正確
grep -n '"F"' src/data/exam-content.ts

# 確認上傳元件正確
grep -n '"F"' src/components/upload-studio.tsx

# 確認無寫死 hex（應無輸出）
grep -rn "#[0-9a-fA-F]\{6\}" src/data/exam-content.ts src/components/upload-studio.tsx | grep -v "var(--"

# 確認總題數（預期 210）
node -e "const {examSections}=require('./src/data/exam-content.ts');console.log(examSections.reduce((a,s)=>a+s.items.length,0))"
# 或用 tsx
npx tsx -e "import{examSections}from'./src/data/exam-content';console.log(examSections.reduce((a:number,s:any)=>a+s.items.length,0))"
```

---

### Step 5：啟動 dev server 並視覺驗收

```bash
npm run dev
```

開啟 http://localhost:3000 確認：
- [ ] 平面圖區塊篩選器顯示 A / B / C / D / E / F
- [ ] 天花板與立面圖區塊篩選器顯示 A / B / C / D / E / F
- [ ] 試卷卡片 201F–206F 正確渲染
- [ ] 抽題功能正常運作

---

## 預期改動檔案清單

| 檔案 | 改動類型 |
|------|----------|
| `src/data/exam-content.ts` | 3 處修改（variants + 2 處 summary） |
| `src/components/upload-studio.tsx` | 1 處修改（variantOptions） |
| `AGENTS.md` | 4 處修改（表格 + 總結 + 信任錨點） |
| `.cursor/rules/exam-content.mdc` | 1 處修改（版本篩選說明） |

## 不需改動的檔案（已確認）
- `src/hooks/use-exam-draw.ts` — 動態讀取，自動涵蓋 F
- `src/lib/requirement-resolver.ts` — 動態處理 variant
- `src/components/archive-section-client.tsx` — 動態渲染 variant 標籤
- `src/types/exam.ts` — 型別 `variants: string[]` 無需改
