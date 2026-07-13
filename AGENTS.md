# Draft Gallery 乙級術科 — 系統憲法

> 本文件是本專案的最高行為準則，所有 AI 輔助程式碼生成與修改任務，必須以本文為唯一執行依據。
> Gemini 分享內容已於 v1.1 整合（2026-07-13），見附錄 F。

---

## 憲法生效日期：2026-07-13
> 版本：v1.1（由忙碌腰帶 v3 專案憲章 v3 移植而來，v1.1 整合 Gemini 分享內容）

---

# 第一章：設計與美學原則

## 第一條：Stripe 資訊邏輯（Functional Minimalism）

擅長梳理複雜資訊，使用網格（Grid）與卡片（Card）系統，確保排版層級分明、邏輯清晰。

本專案包含四個題庫區塊（平面圖、天花板與立面圖、透視圖、大樣圖），每個區塊的試卷卡必須：
- 具備統一的試卷編號視覺系統（如 201-A、207-乙）
- 使用一致的分區標題階層（H2 區塊、H3 試卷分類）
- 網格佈局嚴守 12-column 柵格，響應式收縮至 4-column（mobile）

## 第二條：Apple 極簡視覺（Aesthetic Skin）

極致留白（Negative Space）。盡量消除實體邊框（border），改用極柔和陰影或毛玻璃效果。字體排版對比清晰，內文使用高雅深灰。UI 介面文案必須套用標點極簡化，並強制使用 `text-wrap: balance` 避免視覺孤兒字。

本專案品牌色：
```css
--color-accent: #876f49;     /* 暖棕品牌色（CTA / 聚焦） */
--color-theme: #f5f1ea;      /* 暖米背景 */
--color-text: #2c2c2c;       /* 高雅深灰內文 */
--color-text-muted: #6b6560; /* 次要文字 */
--color-surface: #ffffff;     /* 卡片白 */
```

## 第三條：色彩紀律鎖定（Color Memory Lock）

絕對禁止每次生成不同色碼。必須將確認的品牌色定義為 Tailwind 配置（如 `bg-brand`）或 CSS 變數，並嚴格覆用。僅在 CTA 按鈕或關鍵狀態使用品牌色（`#876f49`），嚴禁大面積塗抹。

- **驗證命令**：
  ```bash
  grep -rEn "color: #[0-9a-fA-F]{3,8}|background: #[0-9a-fA-F]{3,8}" src/
  ```
  任何不在 `var(--` 包覆內的 hex 色碼均為違規，須替換為 CSS 變數。

## 第四條：高階微互動（Micro-interactions）

所有 hover、active 狀態必須有平滑過渡動畫（如輕微上浮、微縮放），流暢且不喧賓奪主。

- **過渡時長**：150–300ms，`ease-out` 曲線
- **禁用**：大範圍閃爍、背景色突變、劇烈縮放（> 1.05）
- **圖片 Hover**：Lightbox 開啟 / 灰階濾鏡淡化（opacity 0.85）二選一

## 第五條：智慧佔位圖（Smart Placeholders）

在尚未提供真實圖片的開發初期，所有圖片缺口必須生成「智慧佔位圖」：

```html
<img src="https://placehold.co/800x600/f5f1ea/876f49?text=201-A+%E5%B9%B3%E9%9D%A2%E5%9C%96"
     alt="試卷 201-A 平面圖參考"
     width="800" height="600"
     onerror="this.style.display='none'; this.nextElementSibling?.classList.remove('hidden')"
/>
```

Gemini AI 生圖提示詞放於 HTML 註解中，不可塞入 URL 參數（URL 長度上限 200 字）。

---

# 第二章：工程、資安與架構原則

## 第六條：DRY 原則與模組化（Next.js App Router）

生成任何新區塊前，必須先掃描 Codebase 尋找可複用的元件。嚴禁創造功能重疊的冗餘區塊。

本專案掃描範圍（憲法掃描路徑鎖定）：
1. `src/app/`（App Router 頁面，含 `/`、`/api/uploads`）
2. `src/components/`（所有共用元件，含 `ui/` 子目錄）
3. `src/components/ui/`（基礎 UI 原始元件：SurfacePanel、SkeletonGrid、EmptyState 等）
4. `src/data/`（試卷內容、題庫資料）
5. `src/lib/`（工具函式、Supabase client、site-config）
6. `src/types/`（TypeScript 型別定義）

## 第七條：效能、語意與 SEO（Google 標準）

嚴格使用語意化 HTML 標籤。頁面必須具備嚴謹的標題階層（H1 只能有一個，依序使用 H2、H3），且所有圖片強制加上有意義的 `alt` 屬性以利爬蟲抓取。

本專案 SEO 關鍵字（來自 `site-config.ts`）：
```
室內設計、乙級術科、術科準備、平面圖、立面圖、透視圖、大樣圖、應考練習、扣分點、乙室設計、乙級技能
```

## 第八條：防禦性 UI 與排版溢出防堵（Defensive UI）

必須預判並處理「文字過長截斷」、「圖片載入失敗 Fallback」、「無資料狀態」。嚴禁濫用絕對固定寬高，強制使用流體排版：

```css
max-w-full  /* 嚴禁 overflow-x */
min-w-0     /* 文字容器必須 */
overflow-hidden /* 截斷超長文字 */
```

- **圖片 `onerror` Fallback**：每個 `<img>` 必須有 `onerror` 處理
- **無資料狀態**：`EmptyState` 元件（`src/components/ui/primitives.tsx`）作為唯一 fallback UI
- **嚴禁**：出現橫向捲動軸（`overflow-x-auto` 隱藏捲軸例外）

## 第九條：API 與資安防禦（Security First）

若涉及串接第三方 API，嚴禁在前端元件中「寫死（Hardcode）」任何 API Key。必須強制使用環境變數，並優先透過 Next.js API Routes（`src/app/api/`）代理隱藏金鑰。

本專案 Supabase 環境變數：
```
NEXT_PUBLIC_SUPABASE_URL       # 前端安全暴露（RLS 保護）
NEXT_PUBLIC_SUPABASE_ANON_KEY # 前端安全暴露（RLS 保護）
SUPABASE_SERVICE_ROLE_KEY     # 僅 server-side 使用，絕不暴露前端
SUPABASE_STORAGE_BUCKET        # 固定值：practice-images
```

## 第十條：內容鎖定與排版解耦（Content Lock & Typography Decoupling）

絕對禁止在優化排版時，擅自增刪、改寫或縮減「長篇正文與知識內容」。但在確保內容一字不漏的前提下，AI 擁有該內容的「視覺排版絕對權限」，可以自由調整字體大小、行高、段落間距、語意斷點與對齊方式。

本專案試卷題庫定義於 `src/data/exam-content.ts`，是內容鎖定白名單。任何對題庫試卷內容的增刪修改，必須經使用者明確確認。

## 第十一條：修改紀律與強制備份（Rollback Readiness）

執行大範圍重構或複雜度高的優化前，必須強制提醒使用者進行版本備份（確認 Git Commit 狀態，或手動備份專案資料夾），確保有安全的回退機制後再開始生成程式碼。進行局部優化時，嚴禁擅自修改現有的 State、API 呼叫或核心商業邏輯。

## 第十二條：視覺驗收紀律（UAT Readiness）

在完成任何程式碼生成或修改任務、準備結束對話前，必須確認本地開發伺服器已啟動，並明確列出本地預覽網址（`http://localhost:3000`）供使用者點擊驗收。

---

# 第三章：標準作業程序（SOPs）

## SOP 1：字距反向律（Letter-Spacing Inverse Law）

字距（`letter-spacing`）必須隨字級（`font-size`）反向調整：
- `≥ 3rem` 大字：`letter-spacing ≤ 0.02em`
- `≥ 2rem` 中型字：`letter-spacing ≤ 0.04em`
- 嚴禁在 `≥ 2.5rem` 大字使用 `≥ 0.06em` 字距

**驗證命令**：
```bash
grep -rn "letter-spacing:" src/ | awk '$NF ~ /[0-9.]+em/ && $NF+0 > 0.05'
```

## SOP 2：襯線行高下限（Line-Height Floor）

所有 `≥ 3rem` 標題 `line-height ≥ 1.25`；`≥ 2rem` 襯線字 `line-height ≥ 1.32`。CSS drop cap（首字放大）例外可設 `line-height < 1`。

**驗證命令**：
```bash
grep -rn "font-size: [0-9]\+\.[0-9]rem" src/ -A 4 | grep "line-height: 1\.[0-2]"
```

## SOP 3：text-wrap balance

所有中文長句標題（總字當量 ≥ 18）必須套用 `text-wrap: balance`，確保標點「，」「。」永遠落在行尾而非孤兒行首。

**驗證命令**：
```bash
grep -rn "<h[1-3]" src/ | grep -v "text-wrap"
```

## SOP 4：色彩變數鎖定（Color Lock）

前端所有顏色必須透過 CSS 變數定義，禁止寫死 hex 色碼。禁止在 `style` 中使用 `var(--xxx, #fallback)` 的 fallback 形式（fallback 值也必須是 `var(--)`）。

## SOP 5：響應式斷點標準化（Breakpoint Lock）

本專案標準斷點：
- 主斷點：`768px`（tablet）、`1024px`（desktop）
- 次斷點：`480px`（small mobile）、`1200px`（wide）

**驗證命令**：
```bash
grep -rEho "@media \(max-width: [0-9]+px\)" src/ | sort | uniq -c | sort -rn
```

## SOP 6：字級上限（Font-Size Ceiling）

`font-size` 寫死值上限：`≤ 6rem`。`clamp()` 上限不得超過 6rem，下限不得低於 0.7rem。

**驗證命令**：
```bash
grep -rEn "font-size: [0-9]+\.[5-9]rem|font-size: [1-9][0-9]rem" src/
```

## SOP 7：圖片健壯性三原則（Image Robustness Triple Lock）

所有外部圖片（含 placehold.co、Supabase Storage）必須同時具備：
1. **URL 長度上限**：不得超過 200 字
2. **比例一致性**：`<img>` 的 `width`/`height` 屬性必須與外層容器 `aspect-ratio` CSS 一致
3. **onerror Fallback**：任何 `<img>` 都必須有 `onerror` 處理，載入失敗時切換至 CSS-only 漸層 + 標籤 fallback

## SOP 8：文字精煉合規檢查（Copy Refinement Lock）

任何 UI 文案（Hero h1、Section h2、CTA 按鈕、tag chip）進行排版優化時，**必須同時觸發文字精煉檢查**：

- **標點極簡化**：是否還殘留可省略的全形標點
- **冗詞掃除**：是否有空泛形容詞（「優質」「專業」「頂尖」「一流」等無背書詞）
- **品牌詞庫對齊**：CTA、tag 是否與既有品牌詞庫一致（「乙級術科」「練習圖上傳」「扣分點分析」為固定詞組，不可擅自改寫）
- **觸發條件**：`font-size`、`letter-spacing`、`line-height`、`text-wrap` 任一變更

---

# 第四章：衝突解決與豁免制度

## 衝突分級處理流程（Conflict Resolution Protocol）

當發現「優化修改項目」與本憲法 SOP 或設計原則牴觸時，禁止 AI 自行決定直接修代碼，依下列三級處理：

### 第一級：明確違規（自動修，不詢問）
- **觸發**：`≥ 0.06em` 字距、超過 6rem 字級上限、缺 `alt`、寫死 hex 色碼
- **處理**：直接修，commit message 開頭加 `auto-fix:` 前綴
- **範圍限定**：每個 commit 只處理 1–2 個條款

### 第二級：邊界值（必須詢問）
- **觸發**：違規值在 SOP 閾值邊緣 ±10% 範圍
- **處理**：輸出標準三選一格式（修代碼 / 修憲 / 混合方案），等候使用者明確選擇

### 第三級：哲學衝突（必須修憲才能動）
- **觸發**：與第一條至第四條設計哲學直接衝突
- **處理**：明確標示「必須先修憲再修代碼」

## 違規豁免清單制度化（Exemption Registry）

任何「故意保留的違規」必須登記於本附錄，禁止默默豁免。

**豁免登記表（截至 v1.0）**：

| # | 位置 | 違規值 | 豁免理由 |
|---|------|--------|----------|
| 1 | `src/components/ui/primitives.tsx` `SurfacePanel` | `border: 1px solid var(--color-border)` | 卡片邊框屬教育導向UI，標示試卷邊界有必要性 |
| 2 | `src/data/exam-content.ts` | 試卷題目為政府公告內容 | 內容鎖定白名單，不得任意修改 |

**新規豁免流程**：發現新的違規需豁免時，必須明確寫出違規值、說明豁免理由、將豁免編號加入本附錄，並在 commit message 註明。

---

# 第五章：Pre-flight Checklist

在生成任何新元件或頁面前，必須先跑 grep 驗證既有 codebase：

1. 掃描同類頁面的 CSS 變數使用：`grep -rn "var(--" src/app/`
2. 掃描同類頁面的字級字距模式：`grep -rn "font-size:\|letter-spacing:" src/app/`
3. 掃描同類頁面的斷點：`grep -rn "@media" src/app/`
4. 掃描是否已有可複用元件：`ls src/components/` 找同類
5. 確認新增色彩會集中在 `src/app/globals.css` 的 `:root` 區塊
6. 確認新增斷點不超過 4 個標準值
7. 確認所有 `font-size` 寫死值 ≤ 6rem
8. 確認所有 `clamp()` 上限 ≤ 6rem、下限 ≥ 0.7rem
9. 確認所有 `letter-spacing × font-size` 物理像素 ≤ 1px
10. 確認所有 ≥3rem h1/h2 行高 ≥ 1.25 + `text-wrap: balance`

---

# 第六章：題庫內容標準

## 試卷架構鎖定（Exam Architecture Lock）

本專案試卷內容定義於 `src/data/exam-content.ts`，採用以下四區塊結構：

| 區塊 | Slug | 題號 | 版本 | 總計 |
|------|------|------|------|------|
| 平面圖 | `plan` | 201–206 | A, B, C, D, E | 30 張 |
| 天花板與立面圖 | `ceiling-elevation` | 201–206 | A–E × (天花/客立/餐立/臥立) | 120 張 |
| 透視圖 | `perspective` | 207–212 | 甲 / 乙 / 丙 | 18 張 |
| 大樣圖 | `detail` | 213–224 | 尺度/材質/做法 | 12 張 |

每個試卷項目結構：
```ts
{
  code: string;       // 例如 "201-A"
  title: string;      // 例如 "平面圖 201"
  variants?: string[];// 版本陣列，例如 ["A", "B", "C", "D", "E"]
  focus: string;      // 考試重點（單句，不可刪改）
  notes: string[];    // 扣分點陣列（內容鎖定）
}
```

**嚴禁**：修改 `code`、`focus`、`notes` 欄位的原始文字內容。排版呈現方式（CSS、間距、字體）不在此限。

## 題庫內容敘述標準

- `focus`：考試重點，必須是**完整肯定句**，不得使用問句
- `notes`：扣分點，必須以「×」前綴開頭（如「× 尺寸標註遺漏」）
- 所有中文標題使用繁體中文，不得夾雜簡體字

---

# 附錄 A：跨專案可移植性邊界

本憲法於生成時是為「室內設計乙級術科 / Next.js 15 + TypeScript + Supabase + Tailwind」量身定制。

**可移植的核心條款**：設計哲學 12 條、SOP 1-8 的原則、Pre-flight Checklist 的檢查邏輯、違規豁免制度、衝突解決協議。

**不可移植的專案特定條款**：憲掃描路徑覆蓋清單的 6 個目錄路徑、題庫架構結構、品牌色票 `#876f49`、豁免登記表內容。

---

# 附錄 B：歷史錯誤教訓

- **教訓 1**（來自忙碌腰帶第 4-8 輪）：單一目錄掃描（只看 `index.astro`）會錯過 Hero h1 在其他元件、Footer h2 在 Layout 中的重大違規。**本專案必須嚴守第五章掃描範圍 6 個目錄。**
- **教訓 2**（來自忙碌腰帶第 14 輪）：Commit message 自稱「清零」前，必須實際再跑一次完整 grep 驗證，不可憑記憶清點。

---

# 附錄 C：品牌詞庫（Brand Lexicon）

本專案固定詞組（不得擅自改寫）：

| 正確詞組 | 禁用替換 |
|----------|----------|
| 乙級術科 | 乙技、術科、乙級 |
| Draft Gallery | 草圖庫、題庫 |
| 平面圖 201–206 | 平面試卷 |
| 天花板與立面圖 | 天花圖、立面圖（需同時提） |
| 透視圖 207–212 | 透視試卷 |
| 大樣圖 213–224 | 大樣試卷 |
| 練習圖上傳 | 上傳作品、提交練習 |
| 扣分點分析 | 缺點檢討 |
| 自評複盤 | 自我檢討 |

---

# 附錄 D：信任錨點紀律（Trust Anchor Lock）

本專案作為教育備考工具，首屏必須具備以下信任錨點之一：
- **量化數字**：歷屆報考人數、通過率（本專案試卷題數 180 張）
- **第三方認證**：勞動部技能檢定標章
- **內容完整性聲明**：180 張試卷完整收錄

不得以「純視覺」包裝而無實際可驗證的信任背書。

---

# 附錄 E：憲法執行紀律（Constitution Enforcement Lock）

每次新增憲法條款後，必須在當輪或下一輪對既有 codebase 進行憲法合規掃描（grep 違規項 → 列清單 → 一次性修補），確保新規範立即覆蓋所有既有元件。

具體流程：
- 新增條款後立刻 grep 受影響的 CSS/HTML 屬性
- 違規項目必須列清單告知使用者，區分「同輪修補」與「下輪議題」
- 「同輪修補」僅限於同一元件家族，跨家族違規列入「下輪議題」

---

# 附錄 F：備考知識庫 — Gemini 整合記錄（v1.1）

## Gemini 分享內容整合摘要

**來源**：https://share.gemini.google/EB90gRTHstTN
**整合日期**：2026-07-13
**整合版本**：v1.1

### 整合內容分類

| 類型 | 目的地 | 說明 |
|------|--------|------|
| 208甲 透視圖備考知識 | `src/data/exam-notes.ts` | 比例換算 SOP、數據表、上色策略 |
| 208甲 試卷扣分點 | `src/data/exam-content.ts` | 更新 `notes` 陣列（6 條扣分點） |
| 備考公式 | `src/data/exam-notes.ts` | 比例投影公式、高度放樣 |
| 比例尺速查表 | `src/data/exam-notes.ts` | ScaleReferenceTable |

### 整合的具體內容

**試卷層級更新（exam-content.ts）**：
- `208甲` 的 `focus` 更新為比例戰術與陰影線層次描述
- `208甲` 的 `notes` 更新為 6 條精確扣分點（× 前綴）

**備考知識庫新增（exam-notes.ts）**：
- **類別 `scale-tactics`**：比例尺實戰換算工具（直接選用法 + 比例投影公式）
- **類別 `208甲-detailed`**：208甲 繪圖練習重點彙整（圖紙定位、空間放樣數據表、核心 SOP、不熟練要點）
- **類別 `208甲-coloring`**：208甲 上色與光影重點（陰影線處理、光影強化、材質表現）

**備考公式（exam-notes.ts）**：
- 比例投影公式：`H_圖面 = (H_實際 × D_實測) ÷ 120`
- 速查表：1:12.5 / 1:10 / 1:20 比例尺適用場景

### 備考知識呈現標準

備考知識以「備考知識卡」形式呈現，於試卷詳情 Modal 中「備考筆記」面板展示。
不得將備考知識的內容直接寫入 `focus` 或 `notes` 欄位，備考知識為「可擴充」內容。

---

# 附錄 G：檔案結構總覽

本專案相關憲法/規範檔案索引：

| 檔案 | 性質 | 說明 |
|------|------|------|
| `AGENTS.md` | 完整憲法 | 本檔案，v1.1 含 Gemini 整合記錄 |
| `.cursorrules` | 快速入口 | 引用至 AGENTS.md，80 行精簡版 |
| `.cursor/rules/global.mdc` | Cursor 規則 | 與 .cursorrules 同步，全域適用 |
| `.cursor/rules/nextjs-typescript.mdc` | 框架標準 | Next.js 15 + TypeScript 開發標準 |
| `.cursor/rules/exam-content.mdc` | 內容標準 | 題庫內容管理標準 |
| `src/data/exam-content.ts` | 內容鎖定白名單 | 180 張試卷原始內容 |
| `src/data/exam-notes.ts` | 備考知識庫 | Gemini 整合備考 SOP、公式、速查表 |
| `src/types/exam-note.ts` | 型別定義 | 備考知識庫型別 |
| `src/lib/site-config.ts` | 品牌設定 | 品牌名、色票、SEO 關鍵字 |
