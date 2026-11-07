# Draft Gallery 乙級術科 — 系統憲法

> 本文件是本專案的最高行為準則，所有 AI 輔助程式碼生成與修改任務，必須以本文為唯一執行依據。
> Gemini 分享內容已於 v1.1 整合（2026-07-13），見附錄 F。
> CE 對稱化已於 v1.2 整合（2026-10-02），新增 72 張天花板視角衍生項，見第六章試卷架構表。

---

## 憲法生效日期：2026-07-13
> 版本：v2.4（v1.1 整合 Gemini 分享內容，v1.2 整合 CE 對稱化，v1.3 整合透視圖方向感知抽題，v1.4 整合試卷閱讀器，v1.5 整合平面圖版本感知抽題，v1.6 整合題型筆記，v1.7 整合透視圖消點平衡儀與專攻模式，v1.8 整合平面圖空間矩陣三層抽題，v1.9 整合 8 大工法專項筆記雙軌系統，v2.0 整合大樣圖 12 題跨題通用工法筆記，v2.1 整合平面配置圖 36 張跨題型通用規範筆記，v2.2 整合 9+ 分級圖面縮放系統，v2.3 整合透視圖空間與消點雙層矩陣抽題，v2.4 整合天花板與立面圖視角平衡矩陣）

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

# 第九條：雙軌並行工作流（Gemini 內容處理）

當使用者同時提供「憲法延伸」與「備考知識」時，視為**同一個任務**，必須在同一輪對話內完成：

1. **憲章寫入**：將憲章延伸寫入 `AGENTS.md`
2. **資料庫寫入**：備考知識寫入 `src/data/exam-notes.ts`，試卷內容寫入 `src/data/exam-content.ts`
3. **UI 整合**：建立對應元件並串聯進現有頁面
4. **啟動 dev server**：確認 http://localhost:3000 可正常瀏覽

**嚴禁分兩輪處理**（先交憲章、再等下一輪做 UI），造成 context 重複浪費。

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

## SOP 9：CSS 變數防禦性編程（CSS Variable Defensive Programming）

在使用設計系統的 CSS 變數（尤其是間距、大小等結構性變數）時，若該變數未在 `:root` 定義，會導致整個 CSS 屬性失效（例如 `padding: var(--space-7)` 會變成 `padding: 0`）。

- **防衛性回退**：除非有絕對把握該變數存在，否則在新增樣式時，強烈建議加上合理的回退值（Fallback），例如 `padding: var(--space-7, 32px)` 或 `var(--space-7, var(--space-8))`。
- **邊界驗證**：在優化間距與排版時，必須檢查該變數是否存在於 `:root` 的設計 Token 區塊中，禁止盲目臆測變數名稱（如臆測 `--space-7` 存在）。

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

**豁免登記表（截至 v1.2）**：

| # | 位置 | 違規值 | 豁免理由 |
|---|------|--------|----------|
| 1 | `src/components/ui/primitives.tsx` `SurfacePanel` | `border: 1px solid var(--color-border)` | 卡片邊框屬教育導向UI，標示試卷邊界有必要性 |
| 2 | `src/data/exam-content.ts` | 試卷題目為政府公告內容 | 內容鎖定白名單，不得任意修改 |
| 3 | `src/data/exam-content.ts`（v1.2 新增） | 72 張天花板視角衍生項由 AI 推論生成（無原始政府公告對應） | 方案 A++ 採對稱化設計，允許 AI 基於立面視角邏輯推論天花視角內容，列入附錄 E 豁免 |

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
| 平面圖 | `plan` | 201–206 | A, B, C, D, E, F | 36 張 |
| 天花板與立面圖 | `ceiling-elevation` | 201–206 | A–F × (客廳天花 / 餐廳天花 / 主臥天花 / 客立 / 餐立 / 臥立) | 216 張 |
| 透視圖 | `perspective` | 207–212 | 甲 / 乙 / 丙 | 18 張 |
| 大樣圖 | `detail` | 213–224 | 尺度/材質/做法 | 12 張 |

> **v1.2 更新（2026-10-02）**：天花板與立面圖從 144 張擴展至 216 張（新增 72 張天花板視角衍生項：客廳天花 / 餐廳天花 / 主臥天花），使兩池完全對稱（各 108 張）。

每個試卷項目結構：
```ts
{
  code: string;       // 例如 "201-A"
  title: string;      // 例如 "平面圖 201"
  variants?: string[];// 版本陣列，例如 ["A", "B", "C", "D", "E"]
  focus: string;      // 考試重點（單句，不可刪改）
  notes: string;      // 扣分點（string 型別，'\n' 換行分隔；內容鎖定）
  view?: CEView;      // 視角標籤（ceiling-elevation 限定）：客天 / 餐天 / 臥天 / 客立 / 餐立 / 臥立
}
```

> **v1.2 更新（2026-10-02）**：`view` 欄位用於 UI 視角化呈現與篩選，不影響抽題加權（加權以池為單位：天花板池 vs 立面池）。

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
- **教訓 3**（CSS 變數未定義導致版面崩壞，2026-08-13）：曾因使用未定義的 `var(--space-7)` 導致 `.archive-block` 的 `padding` 整個被瀏覽器丟棄，造成標題文字直接貼死在白色卡片頂部邊框。此後嚴格要求執行 SOP 9 的變數防衛性檢查。

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
| 題型筆記 | 題型備註、共用筆記、共享筆記 |
| 速記本 | 備忘錄、草稿 |

---

# 附錄 D：信任錨點紀律（Trust Anchor Lock）

本專案作為教育備考工具，首屏必須具備以下信任錨點之一：
- **量化數字**：歷屆報考人數、通過率（本專案試卷題數 276 張）
- **第三方認證**：勞動部技能檢定標章
- **內容完整性聲明**：276 張試卷完整收錄

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
| `.cursor/rules/exam-content.mdc` | 內容標準 | 題庫內容管理標準，含 Gemini 整合 SOP、雙軌並行工作流、型別一致性約束 |
| `src/data/exam-content.ts` | 內容鎖定白名單 | 276 張試卷原始內容（v1.2 更新：新增 72 張天花板視角衍生項） |
| `src/data/exam-notes.ts` | 備考知識庫 | Gemini 整合備考 SOP、公式、速查表 |
| `src/types/exam-note.ts` | 型別定義 | 備考知識庫型別 |
| `src/lib/site-config.ts` | 品牌設定 | 品牌名、色票、SEO 關鍵字 |
| `src/lib/practice-stats.ts` | 統計單一事實來源 | 練習統計口徑統一（v1.3） |
| `src/lib/plan-variant.ts` | 平面圖版本平衡 | A~F 需求單 deficit 計算（v1.5 新增） |
| `vitest.config.ts` | 測試設定 | vitest 單元測試設定 |
| `src/lib/__tests__/practice-stats.test.ts` | 單元測試 | 10 條測試，含權重不變式與邏輯驗證 |
| `src/lib/__tests__/plan-variant-balance.test.ts` | 單元測試 | 16 條測試，版本權重不變式與 deficit 邏輯（v1.5 新增） |
| `src/lib/question-note.ts` | 題型筆記單一事實來源 | 題號 ↔ 受影響試卷解析、`qtype-` key builder（v1.6 新增） |
| `src/lib/__tests__/question-note.test.ts` | 單元測試 | 16 條測試，含 42 筆同步範圍與 key 一致性不變式（v1.6 新增） |
| `src/components/question-note-panel.tsx` | Modal 內題型筆記面板 | 跨版本共用輸入框 + 同步範圍清單（v1.6 新增） |
| `src/components/question-note-overview.tsx` | 201–206 六格總覽 | 區塊級可發現性補丁（v1.6 新增） |

---

# 附錄 H：透視圖抽題邏輯更新（v1.3）

## 更新日期

2026-10-05

## 核心變更

透視圖抽題從「題目級最少練習」升級為「方向感知抽題」：

- **統計口徑**：上傳圖片張數（`imageUrls.length`），非去重 sheetCode
- **權重常數鎖定**：一消點 1/3 : 二消點 2/3（單一事實來源於 `use-exam-draw.ts`）
- **雙層抽題演算法**：先算方向 deficit，再在方向內抽最少練習試卷
- **0.5% DEADBAND 遲滯帶**：防止來回震盪

## 設計背景

透視圖（207–212 甲/乙/丙）甲向為一消點透視圖，乙丙向為二消點透視圖。考場比例二消點 : 一消點 = 2 : 1，因此練習量應為一消點的 2 倍。

原有邏輯依賴「題數對稱（各 6 張）」碰巧滿足 1:2，無防護機制。v1.3 以權重常數 + 方向感知抽題確保此比例恆成立。

## 新增檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/practice-stats.ts` | 練習統計單一事實來源，含 `countPracticePerItem`、`sumByGroup` |
| `src/lib/__tests__/practice-stats.test.ts` | 10 條單元測試 |
| `vitest.config.ts` | vitest 設定 |

## 受影響檔案

| 檔案 | 變更 |
|------|------|
| `src/hooks/use-exam-draw.ts` | 新增方向分類器、`PerspectiveDirection` type、`PERSPECTIVE_DIRECTION_WEIGHTS` 常數、`calcPerspectiveBalance`、`extractPerspectiveDirection`、方向感知抽題邏輯 |
| `src/components/exam-draw-section.tsx` | 新增透視圖三段平衡儀、消點 chip、理由說明列 |
| `src/components/archive-card.tsx` | 新增透視圖消點 chip（僅透視 section） |
| `package.json` | 新增 `test` script、`vitest` devDependency |
| `AGENTS.md` | 更新至 v1.3 |

## 不變式測試（阻擋迴歸）

- 三向權重和 === 1
- 二消點 : 一消點 === 2 : 1
- 甲向 = 一消點，乙丙向 = 二消點
- `countPracticePerItem` 對同題多圖回傳圖片張數
- `calcPerspectiveBalance` 三向皆 0 時回傳 balanced
- 甲向 30 張以上時 `completedDirections` 含 "甲"

---

# 附錄 I：試卷閱讀器（Sheet Reader）更新（v1.4）

## 更新日期

2026-10-05

## 核心變更

試卷閱讀從「兩欄並排正反面圖」升級為「分頁閱讀器」：
- 單一文件物件（SheetDoc）取代「兩個 URL 欄位」
- 滿寬 912px（舊 446px 的 2.05 倍）+ object-fit: contain
- 分頁導航：頁碼指示器 + 縮圖列 + 鍵盤左右鍵
- 自動裁邊 build script：有效解析度再提升 1.15 倍
- 方向框標註（208 透視圖專用）

## 新增檔案

| 檔案 | 說明 |
|------|------|
| `src/types/sheet.ts` | SheetDoc / SheetPage 型別定義 |
| `src/lib/sheet-reader.ts` | URL 解析邏輯（單一事實來源） |
| `src/components/sheet-reader.tsx` | 試卷閱讀器元件 |
| `src/data/perspective-markers.ts` | 208 方向框標註資料 |
| `scripts/trim-sheets.mjs` | 自動裁邊 build script |
| `scripts/place-detail-sheets.mjs` | 大樣圖批次置入 script（來源檔名 `<標題>-<code>-<題目卷\|官方答案>.jpg` → `public/images/<code>/<code>-{question,answer}.jpg`，長邊 2400px / JPEG q88） |
| `scripts/place-plan-sheets.mjs` | 平面圖批次置入 script（來源檔名 `平面圖-<題號>.jpg` / `平面圖-需求<版本>.jpg` → `public/images/plan/question-<題號>.jpg` / `requirement-<版本>.jpg`，長邊 2400px / JPEG q88） |

## 受影響檔案

| 檔案 | 變更 |
|------|------|
| `src/components/archive-detail-modal.tsx` | 題目區改用 SheetReader，整合 buildSheetDoc |
| `src/app/globals.css` | 新增 SheetReader / 方向標註樣式 |
| `src/lib/perspective-sheets.ts` | 重寫為純邏輯層（不含 UI） |

## 設計權重評估

| 軸 | 分數 | 理由 |
|---|---|---|
| 資訊準確度 | 10 | 單一事實來源，頁面語意正確 |
| 圖面可讀性 | 9.5 | 2.05× 放大 × 1.15× 裁邊 = 2.35× 有效解析度 |
| 資訊層級 | 9.5 | 文件 → 頁 → 區域 三層，Stripe 網格成立 |
| RWD 穩健度 | 9 | 768px 單欄，縮圖列橫向捲動（§12 RWD 紀律）|
| 維護成本 | 7 | 新增 viewer 元件 + build script，但複用既有 thumb/lightbox |
| 跨 section 一致性 | 8 | 抽象成通用 SheetReader，plan/detail 可選用 |
| **加權總分** | **9.1** | |

---

# 附錄 J：平面圖版本感知抽題更新（v1.5）

## 更新日期

2026-10-28

## 核心變更

平面圖抽題從「整題最少練習」升級為「版本感知兩層抽題」，確保 A~F 六種需求單練習量均衡：

- **統計口徑**：圖片張數（`imageUrls.length`），非去重 sheetCode
- **權重常數鎖定**：A~F 六版本均等 1/6（單一事實來源於 `src/lib/plan-variant.ts`）
- **雙層抽題演算法**：先算版本 deficit，再在落後版本內抽最少練習試卷
- **0.5% DEADBAND 遲滯帶**：防止各版本來回震盪
- **完成線**：單版本 ≥ 30 張（6 題 × 5 次）列入 `completedVariants`

## 設計背景

平面圖試卷（201–206）分為 A~F 六種需求單版本，每版本 6 題。原 `drawOneFromItems` 只按整題練習次數取最小值，A~F 字母完全不進計算——201A 練十次、201F 零次仍判定為均衡。透視圖已有方向感知機制（附錄 H），平面圖無對應機制，設計不對稱。

CE 連動抽取（`item.code.startsWith(baseCode)`）鎖死同題號版本，需求單其他字母永遠沾不到光，本輪保留此語意（改動屬第三級哲學衝突，需另行修憲）。

## 附帶修正

| 位置 | 問題 | 修正 |
|------|------|------|
| `src/lib/practice-stats.ts` ×2 | `uCode.includes(cleanI)` 使「201A」的練習被算進「201」名下 | 改為精確比對 `uCode === cleanI` |
| `src/hooks/use-exam-draw.ts` ×1 | 同式樣內聯比對 | 改為精確比對 |
| `src/app/globals.css` | `--color-surface`／`--color-border`／`--color-accent`／`--color-theme`／`--color-text`／`--color-text-muted` 六個語意 token 在 `:root` 從未定義，卻被現有程式引用 48 處（CSS 屬性整個失效） | 於 `:root` 補上別名映射，指向既有 palette token（零新增 hex） |

## 新增檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/plan-variant.ts` | 版本平衡單一事實來源，含 `PlanVariant` type、`PLAN_VARIANT_WEIGHTS`、`extractPlanVariant`、`calcVariantBalance` |
| `src/lib/__tests__/plan-variant-balance.test.ts` | 16 條單元測試 |

## 受影響檔案

| 檔案 | 變更 |
|------|------|
| `src/hooks/use-exam-draw.ts` | `plan-ceiling-elevation` 分支改為版本感知兩層抽題，附 `directionReason` 理由 |
| `src/components/exam-draw-section.tsx` | 新增 A~F 六格版本儀表、需求單版本 chip |
| `src/app/globals.css` | 新增 `.variant-balance` / `.variant-cell` 系列樣式（480px 雙欄）；補上語意 token 別名 |
| `src/lib/practice-stats.ts` | 精確比對修正 |

## 不變式測試（阻擋迴歸）

- 六版本權重和 === 1
- 每版本權重均等為 1/6
- `extractPlanVariant("201A")` → "A"；`("201A客天")` → "A"；`("208甲")` → null
- `variantShares` 加總為 1
- `variantDeficits` 加總為 0
- 全 0 練習時 `lean === "balanced"`
- 達 30 張完成線的版本列入 `completedVariants` 且不作為 lean
- deficit 平手時依 A→F 教學序

---

# 附錄 K：題型筆記（Question Type Note）更新（v1.6）

## 更新日期

2026-10-29

## 核心變更

速記本（試卷級）之上新增「題型筆記」（題號級）層：

- **既有**：速記本以「試卷 code」為 key（201A、206F 各一份）
- **新增**：題型筆記以「題號」為 key（206 一份）
- 同一題號 42 張試卷（平面圖 6 張 + 天花板與立面圖 36 張）**共用同一份內容**

設計理由：201–206 題型的題目卷（`question-2xx.jpg`）與需求單（`requirement-A~F.jpg`）在同一題號的 A~F 版本之間完全相同。分別寫進 6 份速記本會造成內容漂移與維護負擔。

## 範圍

| 項目 | 內容 |
|------|------|
| 章節 | plan + ceiling-elevation |
| 題號 | 201–206 |
| 受影響試卷數 | 每題號 42 筆（6 + 36） |
| 不適用 | perspective（207–212）、detail（213–224）——題號不在 201–206 範圍 |

## 儲存

- **表**：`public.user_data`（零 migration，沿用既有 schema）
- **key**：`sheet_code = "qtype-<題號>"`，例如 `qtype-206`
- **內容欄位**：寫入 `scratch_note`（欄位重用），`teaching_links` 固定 `[]`
- **`qtype-` 為保留命名空間**：與所有真實試卷 code（`201A` / `206A客立` / `208甲` / `213`）不重疊；`user_data` 唯一鍵為 `(user_id, sheet_code)`，新命名空間獨立成列
- **列數上限**：僅 6 種題號，上限 6 列／使用者

## 受影響檔案

| 檔案 | 變更 |
|------|------|
| `src/lib/question-note.ts` | 新增。題型筆記單一事實來源：題號清單、`qtype-` key builder、code 解析、42 筆受影響範圍列舉 |
| `src/lib/__tests__/question-note.test.ts` | 新增。16 條單元測試 |
| `src/lib/user-data.ts` | 新增 `getQuestionNote` / `saveQuestionNote`，沿用既有 read-through cache 與防抖流程；補上 `qtype-` 保留命名空間說明 |
| `src/app/globals.css` | 新增 `.qnote-panel__*` 與 `.qnote-overview__*` 樣式（零新增 hex，斷點僅 1024px / 480px） |
| `src/components/question-note-panel.tsx` | 新增。Modal 內題型筆記面板（輸入框 + 同步範圍 `<details>`） |
| `src/components/archive-detail-modal.tsx` | 接入題型筆記面板（速記本區塊之前）；perspective / detail 不渲染 |
| `src/components/question-note-overview.tsx` | 新增。201–206 六格總覽，監聽 `question-note-changed` 事件即時刷新 |
| `src/components/archive-section-client.tsx` | 平面圖與天花板立面圖兩區塊接入六格總覽（同一元件，DRY） |
| `src/types/exam-note.ts` | `ExamNoteCategory` 新增選填欄位 `sections?: string[]` |
| `src/data/exam-notes.ts` | 三個分類補 `sections: ["perspective"]`；208甲 相關筆記補 `relatedCodes: ["208甲"]` |
| `src/app/page.tsx` | 備考知識過濾由 `cat.slug === section.slug` 改為 `cat.sections?.includes(section.slug)`（修正備考知識面板全站不渲染的 bug） |
| `AGENTS.md` | 版本升至 v1.6；附錄 C 品牌詞庫、附錄 G 檔案結構、附錄 K 新增 |

## 不變式測試（阻擋迴歸）

1. 同一題號的 plan 與 ceiling-elevation 試卷解析出**同一個** key
2. 每題號受影響試卷數 === 42
3. `qtype-` 命名空間不得與任何真實試卷 code 相撞
4. perspective / detail 的 code 解析結果為 `null`

## 設計權重評估

| 軸 | 分數 | 理由 |
|---|---|---|
| 資訊準確度 | 9.5 | 題號單一事實來源，42 筆範圍由程式列舉，非人工維護 |
| 圖面可讀度 | 9 | 六格總覽 + 同步範圍 `<details>` 收合，資訊密度可控 |
| 資訊層級 | 9 | 題號 + 狀態 + 預覽三層（§12-B 條文 2），highlight 以 `aria-current` 標註且維持低對比（§12-A 條文 2） |
| RWD 穩健度 | 9 | 1024px 三欄 / 480px 雙欄（§12 統計卡紀律），未新增非標準斷點 |
| 維護成本 | 8.5 | 零 migration、零新增 hex、既有快取與防抖流程直接沿用 |
| 跨 section 一致性 | 9.5 | plan 與 ceiling-elevation 同一元件、同一份內容、同一個 key |
| **加權總分** | **9.2** | |

---

# 附錄 L：透視圖消點平衡儀與備考專攻模式（v1.7）

## 更新日期

2026-11-01

## 核心變更

針對考場「二消點 : 一消點 = 2 : 1（66.7% : 33.3%）」之命題結構，完成 UI/UX 總監級全面升級：

- **消點巨觀雙段平衡儀（Macro Ratio Bar）**：
  即時視覺化展示「一消點（甲）33% 目標 vs 二消點（乙＋丙）67% 目標」，含考場基準線、即時張數、百分比與健康度診斷標籤（二消偏少 / 一消偏少 / 比例健康）。
- **資訊架構階層分組（Grouped Hierarchy Cards）**：
  打破平鋪三等分網格，改為「一消點（1VP · 6 題）」與「二消點（2VP · 12 題）」左右對比群組（1:2 空間佈局），直觀傳遞體量差異。
- **備考專攻模式（Perspective Focus Mode）**：
  提供 Segmented Control 切換：
  - `考場均衡 (1:2)`：預設雙層 deficit 考場比例感知。
  - `二消特訓 (2VP)`：鎖定乙、丙向弱項攻堅。
  - `一消速刷 (1VP)`：鎖定甲向基礎功刷題。
- **抽題按鈕與理由動態同步**：
  抽題按鈕副標題隨模式動態變化，抽題結果理由列明確標註消點維度與佔比。

## 新增與受影響檔案

| 檔案 | 變更 |
|------|------|
| `src/hooks/use-exam-draw.ts` | 新增 `PerspectiveFocusMode` 型別、`DrawExamOptions` 介面，擴充 `drawExamGroup` 支援專攻模式與增強理由標籤 |
| `src/components/exam-draw-section.tsx` | 新增透視消點巨觀條、左右 1:2 階層群組卡、Segmented 模式切換器、動態抽題副標 |
| `src/app/globals.css` | 新增 `.persp-balance-*`、`.persp-macro-*`、`.persp-groups-*`、`.persp-mode-*` 樣式（零新增 hex，嚴守 SOP 1-9） |
| `src/lib/__tests__/practice-stats.test.ts` | 新增 3 條專攻模式與抽題理由單元測試（全套 75 條測試全綠） |
| `AGENTS.md` | 更新至 v1.7，新增附錄 L |

---

# 附錄 M：平面圖空間矩陣三層抽題升級（v1.8）

## 更新日期

2026-11-01

## 核心變更

解決使用者在練完 `205A` 後，抽題又抽出同房型 `205C` 的題型連續撞題（Recency Colliding）體驗缺陷：

- **空間格局與需求單二維解耦**：
  大題號（201–206）代表 6 種完全不同的空間格局與放樣結構；A–F 代表 6 種不同業主需求單。兩者屬於不同維度，必須在抽題層進行交集矩陣計算。
- **三層矩陣感知抽題演算法（Plan Matrix Draw）**：
  1. **Layer 1（大題號空間格局均衡）**：統計 201–206 各大題號的總練習張數，鎖定最少練習的大題號池；若遇平手且最近剛練過該題號，主動觸發最近題號避讓（Recent Cooldown）。
  2. **Layer 2（需求單版本均衡）**：計算 A–F 需求單的佔比 Deficit，鎖定落後版本。
  3. **Layer 3（空間矩陣交集鎖定）**：取候選大題號與目標需求單的交集（例如 205 已練 1 次，候選題號排除 205，在 `[201C, 202C, 203C, 204C, 206C]` 中抽取），徹底阻絕連續撞題。
- **抽題理由透明化**：
  抽題結果清楚標示：`🎯 空間矩陣：202 題型優先（已練 0 次）＋ C 需求單補強（已練 0 張，目標 1 張）`。

## 新增與受影響檔案

| 檔案 | 變更 |
|------|------|
| `src/lib/plan-variant.ts` | 新增 `PLAN_BASE_QUESTIONS` 常數、`extractBaseQuestion`、`calcPlanBaseQuestionCounts`、`selectEligibleBaseQuestions` |
| `src/hooks/use-exam-draw.ts` | 平面圖抽題重構為空間矩陣三層演算法，`DrawExamOptions` 支援傳入 `uploads` 達成題號避讓 |
| `src/components/exam-draw-section.tsx` | 抽題觸發時向下透傳 `uploads` 實體記錄 |
| `src/lib/__tests__/plan-variant-balance.test.ts` | 新增大題號抽出、格局均衡、205A 排除 205C 阻擋迴歸單元測試（83 條全綠） |
| `AGENTS.md` | 更新至 v1.8，新增附錄 M |

---

# 附錄 N：8 大工法專項筆記雙軌系統（v1.9）

## 更新日期

2026-11-01

## 核心變更

新增 8 大專業工法專用筆記體系，覆蓋乙級術科三大作圖視角群：
1. **一消點透視圖**（`1vp-perspective`）：207–212 甲向（6 張）
2. **二消點透視圖**（`2vp-perspective`）：207–212 乙/丙向（12 張）
3. **餐廳天花板圖**（`dining-ceiling`）：201–206 A–F 餐天（36 張）
4. **客廳天花板圖**（`living-ceiling`）：201–206 A–F 客天（36 張）
5. **主臥天花板圖**（`bedroom-ceiling`）：201–206 A–F 臥天（36 張）
6. **餐廳立面圖**（`dining-elevation`）：201–206 A–F 餐立（36 張）
7. **客廳立面圖**（`living-elevation`）：201–206 A–F 客立（36 張）
8. **主臥立面圖**（`bedroom-elevation`）：201–206 A–F 臥立（36 張）

## 雙軌兼備架構（Dual-Track Architecture）

- **軌道一：官方備考專用知識卡（8 大知識模組）**：
  定義於 `src/data/exam-notes.ts`，內建標準放樣 SOP、人體工學尺寸數據表、扣分防禦檢核清單；`ExamNotesPanel` 支援依目前試卷視角智慧預選匹配 Tab。
- **軌道二：考生自編視角跨卷同步筆記（View-Scoped Note）**：
  定義於 `src/lib/view-note.ts` 與 `src/components/view-note-panel.tsx`，以 `vnote-` 命名空間儲存。在任何一張試卷上編輯特定視角筆記，即自動同步至該視角底下所有試卷（客立 36 張、一消 6 張等），免除 36 次重複謄寫負擔。

## 新增與受影響檔案

| 檔案 | 變更 |
|------|------|
| `src/lib/view-note.ts` | 新增 8 大工法視角型別定義、元資料、儲存 key 建立器、試卷清單生成與目標解析器 |
| `src/lib/user-data.ts` | 新增 `getViewNote`、`saveViewNote` 讀取與寫入同步介面 |
| `src/data/exam-notes.ts` | 新增 8 大官方專業備考知識模組（24 則高標準 SOP/數據表/檢核表） |
| `src/components/exam-notes-panel.tsx` | 新增智慧視角 Tab 預選，開啟試卷自動聚焦對應工法筆記 |
| `src/components/view-note-panel.tsx` | 新增考生自編視角同步筆記元件，支援防抖自動暫存與同步範圍展示 |
| `src/components/archive-detail-modal.tsx` | 掛載 `ViewNotePanel` |
| `src/app/globals.css` | 新增 `.vnote-panel` 相關樣式，零硬編碼 Hex 色碼，完全嚴守 CSS 變數 |
| `src/lib/__tests__/view-note.test.ts` | 新增 10 條單元測試（全套 93 條測試全綠） |
| `AGENTS.md` | 更新至 v1.9，新增附錄 N |

---

# 附錄 O：大樣圖 12 題跨題通用工法筆記（v2.0）

## 更新日期

2026-11-03

## 核心變更

大樣圖（213–224 共 12 題）統一納入工法專項體系（`detail-drawing`），實現全題庫 12 題跨題即時同步：

- **業務背景**：大樣圖題型包含吧檯、洗手檯、天花包樑、踢腳板、拉門導軌等，但材料厚度（6分木心板 18mm、夾板 6mm/9mm）、角材斷面（30×36mm）、填縫剖面與標註規範為 12 題全體通用標準。
- **儲存命名空間**：`vnote-detail-drawing`，單一事實來源於 `src/lib/view-note.ts`。
- **雙層筆記架構**：
  1. 上層：**大樣工法專用筆記**（跨 12 題通用材料工法規範，寫一次 12 題同步）。
  2. 下層：**速記本**（各題獨立草稿、當題特定尺寸如「假厚 51mm」）。
- **同步範圍**：`213` ~ `224` 共 12 張試卷。
- **測試覆蓋**：`view-note.test.ts` 擴充至 13 條測試，含 12 題解析不變式。

---

# 附錄 P：平面配置圖 36 張跨題型通用規範筆記（v2.1）

## 更新日期

2026-11-03

## 核心變更

平面配置圖（201–206 A–F 共 36 張）正式納入工法專項體系（`plan-universal`），形成「宏觀通用 → 中觀題型 → 微觀速記」的三層階梯筆記架構：

- **業務背景**：平面配置圖在術科考試中具有高度共通的法規與人體工學標準（主走道 ≥ 90cm、門扇淨寬 70~90cm、廚衛黃金三角動線、指北針與圖名標註等），全題庫 36 張試卷 100% 適用。
- **儲存命名空間**：`vnote-plan-universal`，單一事實來源於 `src/lib/view-note.ts`。
- **三層階梯式筆記體系（3-Tier Progressive Note IA）**：
  1. **第一層（最宏觀 · 36 張全題庫同步）**：平面通用規範筆記（全題型通用之人體工學尺寸、門窗走道、指北針與扣分地雷）。
  2. **第二層（中觀 · 6 張跨版本同步）**：題型專屬筆記（201~206 該題樑柱柱位、管道間、空間限制）。
  3. **第三層（微觀 · 1 張獨立草稿）**：速記本（特定版本業主需求單要點）。
- **同步範圍**：`201A` ~ `206F` 全數 36 張平面圖試卷。
- **測試覆蓋**：`view-note.test.ts` 擴充至 15 條測試，全套 101 項測試綠燈通過。

---

# 附錄 Q：9+ 分級圖面縮放系統（v2.2）

## 更新日期

2026-11-06

## 核心變更

題目圖預覽從原本粗顆粒 3 階（fit / 1400 / 2200）升級為「9+ 分級人體工學縮放系統」：

- **業務與使用者痛點**：舊版從 `fit`（視窗寬度約 700–900px）直接跳到 `1400px` 斷層過大。在筆電或平板環境下，1400px 造成嚴重橫向滾動疲勞；但在 `fit` 下標註文字又過小。
- **單一事實來源**：`src/lib/zoom-scale.ts` 定義 6 階尺度規格：
  1. `fit`：符合視窗（全圖俯瞰，自動縮放）
  2. `1000`：1000px（筆電全景，輕量放大免大幅滑動）
  3. `1200`：1200px（舒適閱覽黃金甜蜜點，文字清楚且版面不爆框）
  4. `1400`：1400px（大螢幕標準深研，平面標註與符號）
  5. `1800`：1800px（精細放樣，剖面與構造層次）
  6. `2200`：2200px（1:1 超清檢驗，微小尺寸與引線零失真）
- **UI/UX 互動人體工學**：
  1. **Segmented Control 膠囊**：Apple / Stripe 風格極簡分段控制列，具備深暖棕 Active 標記與情境 Tooltip。
  2. **微步進按鈕（[-] / [+]）**：免去精細對準數字點按的疲勞，支援順手放大/縮小一階。
  3. **雙向連動與鍵盤快捷**：`SheetReader` 與全螢幕 `Lightbox` 共享相同 6 階模型；Lightbox 內支援 `+`/`-`/`0`/`Esc` 快捷鍵，點擊圖片本體依序循環步進。
  4. **防禦性 RWD**：窄螢幕自動隱藏滾動條平滑滑動，圖片橫向溢出受控。
- **測試覆蓋**：`zoom-scale.test.ts` 7 條測試，全套 110 項測試全部綠燈通過。

---

# 附錄 R：透視圖空間與消點雙層矩陣抽題（v2.3）

## 更新日期

2026-11-06

## 核心變更

透視圖抽題從「單純方向赤字平衡」升級為「空間格局與消點雙層矩陣（Perspective Matrix Draw）」：

- **業務背景與痛點**：舊版抽題僅以消點方向（甲 1/3、乙 1/3、丙 1/3）進行計數，忽視了 207～212 六大空間格局累積熟悉度。考生常遭遇「208 甲乙丙各畫 2 次，但 210～212 從未放樣過」的致命備考偏食與考場風險。
- **單一事實來源**：`src/lib/perspective-matrix.ts` 定義 207–212 基礎題號提取、跨方向累積練習統計與候選題號選擇。
- **三層決策演算法（3-Tier Perspective Decision Matrix）**：
  1. **Layer 1（消點方向層）**：維持現行 1VP 33% : 2VP 67% 的消點 deficit 演算法與特訓模式（1vp / 2vp / auto）。
  2. **Layer 2（空間題號層 · 熟悉度平衡）**：計算 207～212 跨甲乙丙三向全數加總次數，在目標方向候選題中優先挑選「全題型總練習最少」的生疏題號。
  3. **Layer 3（即時避讓冷卻）**：排除上一題剛練習過的基礎題號，避免同格局連抽疲勞。
- **透明抽題原因**：UI 直接反饋決策脈絡（如「🎯 乙向落後（2VP 考場 67% 重點）· 優先補強生疏題號 211（全向已練 0 次）」）。
- **測試覆蓋**：`perspective-matrix.test.ts` 新增 7 條單元與整合測試，全套 117 項測試全數綠燈通過。

---

# 附錄 S：天花板與立面圖視角平衡矩陣（CE View Matrix v2.4）

## 更新日期

2026-11-07

## 核心變更

天花板與立面圖（CE）抽題從「單純試卷隨機挑選視角」升級為「全題庫視角累積平衡矩陣（CE View Matrix）」：

- **業務背景與痛點**：舊版在選定平面圖或隨機選定 CE 試卷（例如 `203C`）後，由於該特定代碼下的三個天花板視角練習次數皆為 0，便採用 `Math.random()` 隨機取樣。這導致考生即使在其他試卷已累積練習過「主臥天花」與「餐廳天花」，但「客廳天花」全題庫累積為 0 次時，仍有機率被再次抽出主臥天花，造成備考盲區。
- **單一事實來源**：`src/lib/ce-matrix.ts` 定義 `CE_VIEWS`（客天/餐天/臥天/客立/餐立/臥立）、全題庫累積計數器 `calcCEViewCounts` 與智慧選拔函式 `selectBestCEItem`。
- **四層決策演算法（4-Tier CE View Matrix Decision）**：
  1. **Layer 1（池級平衡）**：計算全題庫天花板總上傳數 vs 立面圖總上傳數，自動偏向赤字較大的池（或遵循外部指定目標池）。
  2. **Layer 2（全題庫視角累積赤字平衡）**：在目標池候選視角中，統計全題庫 216 張試卷中每個視角的練習總數，100% 絕對優先抽選全庫累積次數最少（如客天=0次）之生疏視角。
  3. **Layer 3（教學順序破平機制）**：當全庫累積次數平手時（如初次進入系統全為 0 次），以標準室內設計施工圖教學動線嚴格破平：天花板為「客天(0) > 餐天(1) > 臥天(2)」，立面圖為「客立(0) > 餐立(1) > 臥立(2)」。
  4. **Layer 4（試卷級未練避讓）**：若候選清單中包含尚未在該代碼下練習過的視角，優先在未練過項目中過濾，確保不重複刷同一張圖。
- **透明決策回饋**：抽題結果直接於 UI 顯示原因（如「🎯 天花板落後 · 優先補強生疏視角客天（全庫已練 0 次）」）。
- **測試覆蓋**：`ce-matrix.test.ts` 7 條單元測試，完整驗證視角解析、全庫次數統計、重現使用者情境驗證、教學破平與池級赤字選擇。全套 125 項測試綠燈通過。
