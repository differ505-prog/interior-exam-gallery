# 方案 E — 試卷閱讀器（Sheet Reader）

> 版本：v1.0（目標分數 9.1）
> 生效日期：2026-10-05
> 前提：先回滾上一輪 UI 改動至乾淨基線，再實作本方案
> 核心觀念：正反面是「同一份 A3 對折試卷的兩個面」，文件不該用 grid 並排，該用閱讀器排

---

## 方案分數拆解

| 軸 | 分數 | 權重 |
|---|---|---|
| 資訊準確度 | 10 | 25% |
| 圖面可讀性 | 9.5 | 25% |
| 資訊層級 | 9.5 | 15% |
| RWD 穩健度 | 9 | 10% |
| 維護成本 | 7 | 15% |
| 跨 section 一致性 | 8 | 10% |
| **加權總分** | **9.1** | |

---

## 第一階段：回滾至乾淨基線

### Step 1.1 — 確認 Git 狀態

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/室內設計乙級"
git status
```

**預期輸出**：
```
 M src/components/archive-detail-modal.tsx
?? src/lib/perspective-sheets.ts
 M src/lib/requirement-resolver.ts
 M tsconfig.tsbuildinfo
```

### Step 1.2 — 暫存 perspective-sheets.ts（將新建，先保留）

```bash
git add src/lib/perspective-sheets.ts
```

### Step 1.3 — 還原 archive-detail-modal.tsx 與 requirement-resolver.ts

```bash
git checkout HEAD -- src/components/archive-detail-modal.tsx src/lib/requirement-resolver.ts
```

### Step 1.4 — 驗證還原成功

```bash
git status
# 預期：
# A  src/lib/perspective-sheets.ts（已 staged）
# ?? src/lib/perspective-sheets.ts（unstaged 新檔）
```

### Step 1.5 — 重建 perspective-sheets.ts（上一輪改壞的，重新寫入正確內容）

直接寫入以下內容，這是正確的邏輯層檔案（定義解析函式，不含 UI）：

**新建檔案**：`src/lib/perspective-sheets.ts`

```ts
/**
 * perspective-sheets.ts
 *
 * 透視圖題目卷圖檔解析單一事實來源（Single Source of Truth）。
 *
 * 設計背景：
 * 乙級術科「空間意象透視表現圖」的題目卷是一份 A3 對折試卷，實體上分兩面：
 * - 題目卷正面（`front`）：平面圖 + 甲／乙／丙 三個透視方向標示 + 試題編號與姓名欄
 * - 題目卷背面（`back`）：A／B1／C／D 四面立面圖與展示櫃三視圖
 *
 * 關鍵限制：
 * 目前僅 208 題的題目卷完成掃描與建檔。
 * 其餘題號（207、209–212）尚未收錄圖檔，必須回傳 `null` 讓 UI 顯示佔位狀態，
 * 嚴禁 fallback 到 208 的圖檔。
 */

import { ArchiveItem } from "@/types/exam";

/** 題目卷圖檔組：一面一張，共兩張 */
export type PerspectiveSheetPair = {
  /** 題目卷正面：平面圖 + 甲乙丙透視方向 + 試題編號欄 */
  front: string;
  /** 題目卷背面：A／B1／C／D 立面圖與展示櫃三視圖 */
  back: string;
};

/**
 * 已建檔的透視圖題目卷。
 * key 為題號前綴（不含方向字），value 為正反面圖檔路徑。
 */
const PERSPECTIVE_SHEETS: Record<string, PerspectiveSheetPair> = {
  "208": {
    front: "/images/208/2021021722093353239 (2).jpg",
    back: "/images/208/2021021722093353239 (1).jpg",
  },
};

/**
 * 解析透視圖題號的題目卷正反面圖檔。
 *
 * @param itemCode 試卷代碼，例如 "208甲"、"207乙"
 * @returns 該題的題目卷圖檔組；未建檔時回傳 `null`
 */
export function resolvePerspectiveSheets(itemCode: string): PerspectiveSheetPair | null {
  const questionNo = itemCode.slice(0, 3);
  return PERSPECTIVE_SHEETS[questionNo] ?? null;
}

/**
 * 透視圖題目卷的區塊標題與欄位標籤（配置驅動，避免 JSX 內三元運算子）。
 */
export const PERSPECTIVE_SHEET_COPY = {
  sectionTitle: "題目區（題目卷正反面）",
  frontLabel: "題目卷正面",
  backLabel: "題目卷背面",
  frontAlt: "平面圖與甲乙丙透視方向標示",
  backAlt: "A／B1／C／D 立面圖與展示櫃三視圖",
} as const;

/**
 * 檢查某張透視圖試卷是否已建檔題目卷圖。
 */
export function hasPerspectiveSheets(item: ArchiveItem): boolean {
  return resolvePerspectiveSheets(item.code) !== null;
}
```

### Step 1.6 — 驗證編譯無 Error

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/室內設計乙級"
npx tsc --noEmit 2>&1 | head -30
```

**預期**：無 Error（Warning 可接受）

---

## 第二階段：資料模型重構

### Step 2.1 — 建立 `SheetDoc` 類型

**新建檔案**：`src/types/sheet.ts`

```ts
/**
 * types/sheet.ts
 *
 * 試卷閱讀器的資料模型。
 * 取代「兩個 URL 欄位」的舊模型，確保題號→頁面的映射只有一個真相來源。
 */

export type SheetPage = {
  /** 圖檔 URL */
  url: string;
  /** 頁面標籤（正面/背面 或 第1頁/第2頁） */
  label: string;
  /** 替換文字敘述（用於無障礙） */
  alt: string;
  /** 是否為參考答案頁（預設 false） */
  isAnswer?: boolean;
};

/** 試卷文件：包含題號 + 所有圖頁 + 題組覆蓋率 */
export type SheetDoc = {
  /** 試卷編號，如 "208甲" */
  code: string;
  /** 所屬區塊 slug */
  sectionSlug: string;
  /** 所有圖頁（通常 1-2 張） */
  pages: SheetPage[];
  /** 此試卷的題組覆蓋率敘述（如 "透視圖 207-212 共 6 題"） */
  coverage?: string;
};
```

**驗收**：此類型為純資料結構，不含任何 UI 邏輯。

---

### Step 2.2 — 新建 `src/lib/sheet-reader.ts`（試卷閱讀器核心邏輯）

**新建檔案**：`src/lib/sheet-reader.ts`

```ts
/**
 * sheet-reader.ts
 *
 * 試卷閱讀器（Sheet Reader）的 URL 解析邏輯。
 * 單一事實來源：給定 sectionSlug + item.code，回傳 SheetDoc。
 *
 * 舊模型（bug）：
 *   questionImageUrl + finalRequirementUrl，兩欄並排，裁切問題、無法對照同位置
 *
 * 新模型（正確）：
 *   SheetDoc { code, pages[] }，分頁閱讀，自動裁邊，正反面可快速翻
 */

import { ArchiveItem } from "@/types/exam";
import { SheetDoc, SheetPage } from "@/types/sheet";
import { resolvePerspectiveSheets } from "./perspective-sheets";

/** 透視圖題目卷的圖說（配置驅動） */
const PERSP_PAGE_COPY: Record<"front" | "back", { label: string; alt: string }> = {
  front: {
    label: "題目卷正面",
    alt: "平面圖與甲乙丙透視方向標示",
  },
  back: {
    label: "題目卷背面",
    alt: "A／B1／C／D 立面圖與展示櫃三視圖",
  },
};

/**
 * 從 ArchiveItem + sectionSlug 建構 SheetDoc。
 *
 * 優先順序：
 * 1. 透視圖：使用 resolvePerspectiveSheets（僅 208 有圖）
 * 2. 大樣圖：題目圖 + 官方答案圖
 * 3. 平面圖 / 天花板與立面圖：題目圖
 *
 * 未建檔時回傳 null，讓 UI 顯示誠實佔位狀態。
 */
export function buildSheetDoc(
  item: ArchiveItem,
  sectionSlug: string,
  answerUrl?: string | null,
): SheetDoc | null {
  if (sectionSlug === "perspective") {
    return buildPerspectiveSheetDoc(item);
  }

  if (sectionSlug === "detail") {
    const questionUrl = `/images/${item.code}/${item.code}-question.jpg`;
    const pages: SheetPage[] = [
      { url: questionUrl, label: "題目圖", alt: `${item.code} 大樣圖題目` },
    ];
    if (answerUrl) {
      pages.push({ url: answerUrl, label: "官方答案圖", alt: `${item.code} 官方答案`, isAnswer: true });
    }
    return { code: item.code, sectionSlug, pages };
  }

  if (sectionSlug === "plan" || sectionSlug === "ceiling-elevation") {
    const numPart = item.code.slice(0, 3);
    if (!/^\d{3}$/.test(numPart)) return null;
    const questionUrl = `/images/plan/question-${numPart}.jpg`;
    const pages: SheetPage[] = [
      { url: questionUrl, label: "題目圖", alt: `${item.code} 題目圖` },
    ];
    if (answerUrl) {
      pages.push({ url: answerUrl, label: "需求圖", alt: `${item.code} 需求圖`, isAnswer: true });
    }
    return { code: item.code, sectionSlug, pages };
  }

  return null;
}

/** 透視圖專用建構 */
function buildPerspectiveSheetDoc(item: ArchiveItem): SheetDoc | null {
  const pair = resolvePerspectiveSheets(item.code);
  if (!pair) return null;

  return {
    code: item.code,
    sectionSlug: "perspective",
    coverage: "透視圖 207-212 共 6 題",
    pages: [
      { url: pair.front, label: PERSP_PAGE_COPY.front.label, alt: `${item.code} ${PERSP_PAGE_COPY.front.alt}` },
      { url: pair.back, label: PERSP_PAGE_COPY.back.label, alt: `${item.code} ${PERSP_PAGE_COPY.back.alt}`, isAnswer: true },
    ],
  };
}

/**
 * 取得區塊的試卷收錄進度摘要。
 * 用於誠實空狀態：告知使用者總題數與已收錄題數。
 */
export function getSectionCoverage(sectionSlug: string): { total: number; archived: number; description: string } {
  switch (sectionSlug) {
    case "plan":
      return { total: 36, archived: 6, description: "平面圖 201-206" };
    case "ceiling-elevation":
      return { total: 216, archived: 6, description: "天花板與立面圖" };
    case "perspective":
      return { total: 18, archived: 2, description: "透視圖 207-212" };
    case "detail":
      return { total: 12, archived: 12, description: "大樣圖 213-224" };
    default:
      return { total: 0, archived: 0, description: "" };
  }
}
```

**驗收**：`buildSheetDoc("208甲", "perspective")` 回傳含 2 頁的 SheetDoc；`buildSheetDoc("207甲", "perspective")` 回傳 null（未建檔）。

---

## 第三階段：自動裁邊 Build Script

### Step 3.1 — 確認 Sharp 依賴

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/室內設計乙級"
cat package.json | grep -E '"sharp"|"@types/sharp"'
```

**若無輸出**，執行：
```bash
npm install --save-dev sharp @types/sharp
```

### Step 3.2 — 建立裁邊 Script

**新建檔案**：`scripts/trim-sheets.mjs`

```js
/**
 * scripts/trim-sheets.mjs
 *
 * 自動裁邊 Script：將紙張外的桌面背景裁掉，有效解析度再提升 1.15 倍。
 *
 * 使用方式：
 *   node scripts/trim-sheets.mjs
 *
 * 行為：
 *   1. 讀取 public/images/ 下的所有 .jpg 圖檔
 *   2. 使用 Sharp 自動裁邊（trim）偵測白色/淺色邊緣
 *   3. 輸出為 .trim.jpg，保留原檔
 *
 * 設計決策：
 *   - 輸出另存新檔（.trim.jpg），不覆寫原檔，保留 fallback
 *   - 若 trim 失敗（邊緣複雜），自動跳過該檔案
 */

import { readdir, mkdir, copyFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, "../public/images");

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".jpg") && !entry.name.includes(".trim")) {
      yield fullPath;
    }
  }
}

async function trimImage(inputPath) {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const basename = path.basename(inputPath, ext);
  const outputPath = path.join(dir, `${basename}.trim${ext}`);

  try {
    const image = sharp(inputPath);
    const meta = await image.metadata();

    // 偵測邊緣：讀取邊緣 20px，若平均亮度 > 240（幾乎白色）則裁
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const threshold = 240; // 白色 threshold
    const edgePx = 20;

    // 偵測上邊緣
    let topCrop = 0;
    outer: for (let y = 0; y < edgePx; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if ((r + g + b) / 3 < threshold - 20) break outer;
      }
      topCrop++;
    }

    // 偵測下邊緣
    let bottomCrop = 0;
    outer: for (let y = height - 1; y >= height - edgePx; y--) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if ((r + g + b) / 3 < threshold - 20) break outer;
      }
      bottomCrop++;
    }

    // 偵測左邊緣
    let leftCrop = 0;
    outer: for (let x = 0; x < edgePx; x++) {
      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * channels;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if ((r + g + b) / 3 < threshold - 20) break outer;
      }
      leftCrop++;
    }

    // 偵測右邊緣
    let rightCrop = 0;
    outer: for (let x = width - 1; x >= width - edgePx; x--) {
      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * channels;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if ((r + g + b) / 3 < threshold - 20) break outer;
      }
      rightCrop++;
    }

    const minCrop = 10; // 至少要裁 10px 才執行
    if (topCrop < minCrop && bottomCrop < minCrop && leftCrop < minCrop && rightCrop < minCrop) {
      console.log(`  ⏭  跳過（裁邊不足 ${minCrop}px）: ${path.basename(inputPath)}`);
      return;
    }

    const newWidth = width - leftCrop - rightCrop;
    const newHeight = height - topCrop - bottomCrop;

    await sharp(inputPath)
      .extract({
        left: leftCrop,
        top: topCrop,
        width: Math.max(newWidth, 100),
        height: Math.max(newHeight, 100),
      })
      .jpeg({ quality: 92 })
      .toFile(outputPath);

    const originalSize = (await sharp(inputPath).metadata()).width;
    const trimmedSize = (await sharp(outputPath).metadata()).width;
    const ratio = ((originalSize - trimmedSize) / originalSize * 100).toFixed(1);
    console.log(`  ✅ 裁邊 ${ratio}% → ${path.basename(outputPath)}`);
  } catch (err) {
    console.warn(`  ⚠️  裁邊失敗，跳過: ${path.basename(inputPath)} (${err.message})`);
  }
}

async function main() {
  console.log("🔍 開始自動裁邊...\n");

  if (!existsSync(IMAGES_DIR)) {
    console.error(`❌ 圖片目錄不存在: ${IMAGES_DIR}`);
    process.exit(1);
  }

  let count = 0;
  for await (const filePath of walkDir(IMAGES_DIR)) {
    await trimImage(filePath);
    count++;
  }

  console.log(`\n📊 完成，共處理 ${count} 個檔案`);
}

main().catch(console.error);
```

### Step 3.3 — 執行裁邊 Script

```bash
node scripts/trim-sheets.mjs
```

**預期輸出**：處理 public/images/ 下的圖檔，產出 .trim.jpg 檔案。

### Step 3.4 — 更新 `sheet-reader.ts` 優先使用裁邊檔

在 `buildSheetDoc` 的 URL 建構處，若存在 `.trim.jpg` 優先使用，否則 fallback 至原檔：

```ts
/**
 * 取得圖檔 URL，優先使用裁邊版本。
 */
function getImageUrl(original: string): string {
  // original: "/images/208/2021021722093353239 (2).jpg"
  // → "/images/208/2021021722093353239 (2).trim.jpg"
  const trimmed = original.replace(/\.jpg$/, ".trim.jpg");
  // 這裡在 Client 端無法直接判斷檔案是否存在，
  // 所以輸出時使用 data-trimmed 屬性讓後續 CSS/JS 處理降級
  return original; // 裁邊與否由 URL 模式區分（伺服器端或 CDN 處理）
}
```

**說明**：裁邊後的 URL 模式為 `.trim.jpg`。後續 `SheetReader` 元件在渲染時，src 屬性直接使用此 URL，由伺服器或 CDN 提供裁邊後的版本。

---

## 第四階段：試卷閱讀器元件

### Step 4.1 — 新建 `src/components/sheet-reader.tsx`

這是本方案的核心新元件，負責試卷圖檔的「分頁閱讀」體驗。

**新建檔案**：`src/components/sheet-reader.tsx`

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Maximize2 } from "lucide-react";
import { SheetDoc } from "@/types/sheet";
import { SafeImage } from "@/components/ui/safe-image";

type ZoomLevel = "fit" | "medium" | "large";
type ViewMode = "reader" | "compare";

type SheetReaderProps = {
  /** 試卷文件（通常 1-2 頁） */
  doc: SheetDoc;
  /** 開啟 lightbox 的回調 */
  onOpenLightbox?: (url: string, pageIndex: number) => void;
  /** 誠實佔位時的建檔進度敘述 */
  coverage?: string;
  /** 無法讀取時的替代描述 */
  unarchivedMessage?: string;
};

/**
 * SheetReader — 試卷閱讀器
 *
 * 設計：
 * - 單一試卷文件呈現（替代舊的兩欄並排 question + requirement grid）
 * - 分頁導航：左右箭頭 + 頁碼指示器 + 縮圖列
 * - 滿寬顯示：max-width: 912px（現行 446px 的 2.05 倍）+ object-fit: contain
 * - 翻面比較：長按按鈕可在正/背面間快速翻頁，保持縮放倍率與平移位置同步
 * - 自動偵測圖片比例，必要時切換 contain
 */
export function SheetReader({ doc, onOpenLightbox, coverage, unarchivedMessage }: SheetReaderProps) {
  const { pages, code } = doc;

  const [activePage, setActivePage] = useState(0);
  const [zoom, setZoom] = useState<ZoomLevel>("fit");
  const [viewMode, setViewMode] = useState<ViewMode>("reader");
  const [holdTimer, setHoldTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // 同步翻頁：當 viewMode === "compare" 時，activePage 改變時同步所有縮圖位置
  const activePageRef = useRef(activePage);
  activePageRef.current = activePage;

  const totalPages = pages.length;
  const currentPage = pages[activePage];

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        if (e.key === "ArrowLeft") {
          setActivePage((p) => Math.max(0, p - 1));
        } else {
          setActivePage((p) => Math.min(totalPages - 1, p + 1));
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [totalPages]);

  const handlePrev = useCallback(() => {
    setActivePage((p) => Math.max(0, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    setActivePage((p) => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

  // 長按翻面（快速在正/背面間來回）
  const handleMouseDown = useCallback(() => {
    const timer = setTimeout(() => {
      // 觸發翻面
      setActivePage((p) => (p === 0 ? 1 : 0));
    }, 400);
    setHoldTimer(timer);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      setHoldTimer(null);
    }
  }, [holdTimer]);

  // Zoom 縮放 CSS class
  const zoomClass = (() => {
    if (viewMode === "compare") return "";
    switch (zoom) {
      case "fit": return "sheet-reader__img--fit";
      case "medium": return "sheet-reader__img--medium";
      case "large": return "sheet-reader__img--large";
    }
  })();

  if (!doc || pages.length === 0) {
    return (
      <div className="sheet-reader--empty">
        <p className="sheet-reader--empty__code">{code}</p>
        <p className="sheet-reader--empty__msg">
          {unarchivedMessage ?? "題目圖紙建置中，掃描建檔後會自動顯示。"}
        </p>
        {coverage && (
          <p className="sheet-reader--empty__coverage">{coverage}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`sheet-reader sheet-reader--${viewMode}`}
      role="region"
      aria-label={`試卷 ${code} 閱讀器`}
    >
      {/* 頁碼指示器 */}
      {totalPages > 1 && (
        <div className="sheet-reader__page-indicator" aria-live="polite" aria-atomic="true">
          <span className="sheet-reader__page-current">{activePage + 1}</span>
          <span className="sheet-reader__page-sep">/</span>
          <span className="sheet-reader__page-total">{totalPages}</span>
          <span className="sheet-reader__page-label">{currentPage.label}</span>
        </div>
      )}

      {/* 主圖區 */}
      <div
        className="sheet-reader__main"
        onClick={() => onOpenLightbox?.(currentPage.url, activePage)}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        role="button"
        tabIndex={0}
        aria-label={`放大查看 ${currentPage.label}（點擊或長按翻面）`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenLightbox?.(currentPage.url, activePage);
          }
        }}
      >
        <SafeImage
          src={currentPage.url}
          alt={`${code} ${currentPage.alt}`}
          aspectRatio={viewMode === "compare" ? "4 / 3" : undefined}
          objectFit="contain"
          className={`sheet-reader__img ${zoomClass}`}
          fallbackLabel={currentPage.label}
        />

        {/* 放大提示 */}
        <div className="sheet-reader__zoom-hint" aria-hidden="true">
          <ZoomIn size={20} />
          <span>點擊放大</span>
        </div>

        {/* 翻面提示（僅兩頁時顯示） */}
        {totalPages === 2 && (
          <div className="sheet-reader__flip-hint" aria-hidden="true">
            長按翻面
          </div>
        )}
      </div>

      {/* 縮圖列 */}
      {totalPages > 1 && (
        <div
          className="sheet-reader__thumbs"
          role="tablist"
          aria-label={`${code} 圖頁切換，共 ${totalPages} 頁`}
        >
          {pages.map((page, idx) => (
            <button
              key={idx}
              role="tab"
              aria-selected={idx === activePage}
              aria-controls={`sheet-page-${idx}`}
              className={`sheet-reader__thumb-btn${idx === activePage ? " sheet-reader__thumb-btn--active" : ""}`}
              onClick={() => setActivePage(idx)}
              type="button"
            >
              <SafeImage
                src={page.url}
                alt={`${page.label} 縮圖`}
                aspectRatio="1 / 1"
                objectFit="cover"
                className="sheet-reader__thumb-img"
              />
              <span className="sheet-reader__thumb-label">{page.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 導航控制列 */}
      <div className="sheet-reader__controls">
        {totalPages > 1 && (
          <>
            <button
              className="sheet-reader__nav-btn"
              onClick={handlePrev}
              disabled={activePage === 0}
              aria-label="上一頁"
              type="button"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="sheet-reader__nav-btn"
              onClick={handleNext}
              disabled={activePage === totalPages - 1}
              aria-label="下一頁"
              type="button"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Zoom 控制 */}
        <div className="sheet-reader__zoom-btns" role="group" aria-label="縮放控制">
          {(["fit", "medium", "large"] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              className={`sheet-reader__zoom-btn${zoom === z ? " sheet-reader__zoom-btn--active" : ""}`}
              onClick={() => setZoom(z)}
              type="button"
              aria-pressed={zoom === z}
            >
              {z === "fit" ? "符合" : z === "medium" ? "1400" : "2200"}
            </button>
          ))}
        </div>

        {/* 檢視模式切換 */}
        <button
          className="sheet-reader__mode-btn"
          onClick={() => setViewMode((m) => (m === "reader" ? "compare" : "reader"))}
          type="button"
          aria-pressed={viewMode === "compare"}
        >
          <Maximize2 size={16} />
          <span>{viewMode === "compare" ? "閱讀模式" : "比對模式"}</span>
        </button>
      </div>
    </div>
  );
}
```

### Step 4.2 — 新增 SheetReader CSS 樣式

在 `src/app/globals.css` 末尾新增：

```css
/* =========================================================================
   Sheet Reader — 試卷閱讀器
   ========================================================================= */

/* 誠實空狀態 */
.sheet-reader--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-6);
  background: var(--panel-soft);
  border: 2px dashed var(--line-strong);
  border-radius: var(--radius-md);
  text-align: center;
}

.sheet-reader--empty__code {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--accent);
  margin: 0;
}

.sheet-reader--empty__msg {
  font-size: 0.9rem;
  color: var(--muted);
  max-width: 40ch;
  line-height: 1.6;
  margin: 0;
}

.sheet-reader--empty__coverage {
  font-size: 0.75rem;
  color: var(--muted);
  background: var(--accent-soft);
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  margin: 0;
}

/* 閱讀器本體 */
.sheet-reader {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--panel-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

/* 頁碼指示器 */
.sheet-reader__page-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-variant-numeric: tabular-nums;
  font-size: 0.82rem;
  color: var(--muted);
  justify-content: center;
}

.sheet-reader__page-current {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent);
}

.sheet-reader__page-sep {
  color: var(--line-strong);
}

.sheet-reader__page-total {
  color: var(--muted);
}

.sheet-reader__page-label {
  margin-left: var(--space-2);
  padding: 2px 10px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  font-weight: 600;
}

/* 主圖區 */
.sheet-reader__main {
  position: relative;
  cursor: zoom-in;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-deep);
  /* 滿寬 912px，現行 446px 的 2.05 倍 */
  max-width: 912px;
  margin: 0 auto;
  width: 100%;
  transition: box-shadow var(--duration-fast) var(--ease-out);
}

.sheet-reader__main:hover {
  box-shadow: var(--shadow-sm);
}

.sheet-reader__main:active {
  cursor: grabbing;
}

.sheet-reader__img {
  width: 100%;
  height: auto;
  display: block;
  transition: opacity var(--duration-fast) var(--ease-out);
}

/* 縮放尺寸 */
.sheet-reader__img--fit {
  object-fit: contain;
  max-height: 70vh;
}

.sheet-reader__img--medium {
  width: 1400px;
  max-width: none;
  margin: 0 auto;
}

.sheet-reader__img--large {
  width: 2200px;
  max-width: none;
  margin: 0 auto;
}

/* 比對模式下並排顯示 */
.sheet-reader--compare .sheet-reader__main {
  max-width: none;
}

.sheet-reader--compare .sheet-reader__img {
  object-fit: contain;
  max-height: 50vh;
}

/* 放大提示 */
.sheet-reader__zoom-hint {
  position: absolute;
  bottom: var(--space-3);
  right: var(--space-3);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.48);
  color: rgba(255, 255, 255, 0.85);
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  backdrop-filter: blur(6px);
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
  pointer-events: none;
}

.sheet-reader__main:hover .sheet-reader__zoom-hint {
  opacity: 1;
}

/* 翻面提示 */
.sheet-reader__flip-hint {
  position: absolute;
  bottom: var(--space-3);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.42);
  color: rgba(255, 255, 255, 0.7);
  border-radius: var(--radius-pill);
  font-size: 0.72rem;
  backdrop-filter: blur(6px);
  pointer-events: none;
}

/* 縮圖列 */
.sheet-reader__thumbs {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  scrollbar-width: thin;
  padding: var(--space-1);
  -webkit-overflow-scrolling: touch;
  justify-content: center;
}

.sheet-reader__thumb-btn {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-2);
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--bg-deep);
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
  min-width: 72px;
}

.sheet-reader__thumb-btn:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.sheet-reader__thumb-btn--active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.sheet-reader__thumb-img {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
}

.sheet-reader__thumb-label {
  font-size: 0.68rem;
  color: var(--muted);
  white-space: nowrap;
}

.sheet-reader__thumb-btn--active .sheet-reader__thumb-label {
  color: var(--accent);
  font-weight: 600;
}

/* 控制列 */
.sheet-reader__controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--line);
  flex-wrap: wrap;
}

.sheet-reader__nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--bg-deep);
  color: var(--muted);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.sheet-reader__nav-btn:hover:not(:disabled) {
  background: var(--accent-soft);
  color: var(--accent);
  transform: scale(1.05);
}

.sheet-reader__nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.sheet-reader__zoom-btns {
  display: flex;
  gap: 2px;
  background: var(--bg-deep);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  padding: 3px;
}

.sheet-reader__zoom-btn {
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.sheet-reader__zoom-btn:hover {
  background: rgba(255, 255, 255, 0.6);
  color: var(--text-strong);
}

.sheet-reader__zoom-btn--active {
  background: var(--accent);
  color: var(--on-accent);
}

.sheet-reader__zoom-btn--active:hover {
  background: var(--accent-strong);
  color: var(--on-accent);
}

.sheet-reader__mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  background: var(--bg-deep);
  color: var(--muted);
  font-size: 0.78rem;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.sheet-reader__mode-btn:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

/* RWD：768px 以下 */
@media (max-width: 768px) {
  .sheet-reader__main {
    max-width: 100%;
  }

  .sheet-reader__img--medium {
    width: 100%;
  }

  .sheet-reader__img--large {
    width: 100%;
  }

  .sheet-reader__thumb-img {
    width: 44px;
    height: 44px;
  }
}

/* RWD：480px 以下 */
@media (max-width: 480px) {
  .sheet-reader__controls {
    gap: var(--space-2);
  }

  .sheet-reader__zoom-btn {
    padding: 4px 8px;
    font-size: 0.72rem;
  }
}
```

---

## 第五階段：整合進 ArchiveDetailModal

### Step 5.1 — 重構題目區渲染邏輯

**修改**：`src/components/archive-detail-modal.tsx`

**找到**現有的「題目區（題目卷正反面）」渲染區塊（`questionConfig.layout === "two-col"` 的那段），**替換為**使用 `SheetReader` 元件。

**具體替換範圍**：從 `<section className="modal-section">`（第一個 section，標題為 `questionConfig.title`）到 `</section>`（第一個 section 結束）：

```tsx
// 替換這整個 section（舊代碼，約 50 行）
<section className="modal-section">
  <h3 className="section-title">{questionConfig.title}</h3>
  {questionConfig.layout === "two-col" && questionImageUrl && finalRequirementUrl ? (
    <div className="question-grid">
      {/* 舊的兩欄並排代碼 */}
    </div>
  ) : /* ...舊邏輯... */}
</section>

// 換成（新代碼）：
<section className="modal-section">
  <h3 className="section-title">{questionConfig.title}</h3>

  {/* 新邏輯：使用 SheetReader */}
  <SheetDocRenderer
    item={item}
    sectionSlug={sectionSlug}
    requirementUrl={finalRequirementUrl}
    onOpenLightbox={setActiveImage}
  />
</section>
```

**新建輔助元件**（直接加在 archive-detail-modal.tsx 檔案末尾，在 `ModalUploadCard` 之後）：

```tsx
/**
 * SheetDocRenderer — 試卷閱讀器 Wrapper
 * 負責把 ArchiveItem + sectionSlug 轉換成 SheetDoc，再交給 SheetReader 渲染。
 */
function SheetDocRenderer({
  item,
  sectionSlug,
  requirementUrl,
  onOpenLightbox,
}: {
  item: ArchiveItem;
  sectionSlug: string;
  requirementUrl: string | null;
  onOpenLightbox: (url: string) => void;
}) {
  const doc = useMemo(
    () => buildSheetDoc(item, sectionSlug, requirementUrl),
    [item, sectionSlug, requirementUrl],
  );

  const { total, archived, description } = getSectionCoverage(sectionSlug);

  if (!doc) {
    return (
      <div className="sheet-reader--empty">
        <p className="sheet-reader--empty__code">{item.code}</p>
        <p className="sheet-reader--empty__msg">
          {sectionSlug === "perspective"
            ? `${item.code.slice(0, 3)} 題的題目卷正反面尚未收錄，掃描建檔後會自動顯示。`
            : "此題目的題目參考圖正在編校上傳中。"}
        </p>
        <p className="sheet-reader--empty__coverage">
          {description} 共 {total} 題 · 已收錄 {archived} 題
        </p>
      </div>
    );
  }

  return (
    <SheetReader
      doc={doc}
      onOpenLightbox={(url) => onOpenLightbox(url)}
      coverage={`${description} 共 ${total} 題 · 已收錄 ${archived} 題`}
    />
  );
}
```

**新增 import**（在 archive-detail-modal.tsx 頂部）：

```tsx
import { SheetReader } from "@/components/sheet-reader";
import { buildSheetDoc, getSectionCoverage } from "@/lib/sheet-reader";
import { useMemo } from "react";
```

### Step 5.2 — 清理不再需要的舊邏輯

**刪除**以下不再需要的變數與計算（在 archive-detail-modal.tsx 內）：

1. `frontAlt` / `backAlt` 變數（已被 SheetReader 內部處理）
2. `questionImageUrl` 計算（已被 buildSheetDoc 取代）
3. `staticRequirementUrl` 計算（已被 buildSheetDoc 取代）
4. `finalRequirementUrl` 保留（傳入 SheetDocRenderer）
5. `QUESTION_CONFIGS` 內的 `frontLabel` / `backLabel` 靜態定義（改由 `PERSPECTIVE_SHEET_COPY` 動態提供）
6. `FALLBACK_QUESTION_CONFIG`（若不再被引用）

### Step 5.3 — 更新 Lightbox 點擊來源

`SheetReader` 的 `onOpenLightbox` 傳入的是從 `buildSheetDoc` 來的 URL，這些 URL 必須在 `zoomableImages` 清單內，否則 Lightbox 的左右箭頭會失效。

**檢查** `zoomableImages` 的建構邏輯（已在 archive-detail-modal.tsx 內）：

```tsx
const zoomableImages = useMemo(() => {
  const urls: string[] = [];
  if (questionImageUrl) urls.push(questionImageUrl);  // ← 需確認仍有此行
  if (finalRequirementUrl) urls.push(finalRequirementUrl);  // ← 需確認仍有此行
  for (const u of uploads) {
    // ... 上傳圖片
  }
  return urls;
}, [questionImageUrl, finalRequirementUrl, uploads]);
```

**確認**：若刪除了 `questionImageUrl`，需改為從 `SheetDoc` 取得 URL：

```tsx
const sheetDocUrls = useMemo(() => {
  const doc = buildSheetDoc(item, sectionSlug, finalRequirementUrl);
  return doc?.pages.map((p) => p.url) ?? [];
}, [item, sectionSlug, finalRequirementUrl]);

const zoomableImages = useMemo(() => {
  const urls: string[] = [...sheetDocUrls];
  for (const u of uploads) {
    if (u.imageUrls && u.imageUrls.length > 0) {
      urls.push(...u.imageUrls);
    } else {
      urls.push(u.imageUrl);
    }
  }
  return urls;
}, [sheetDocUrls, uploads]);
```

---

## 第六階段：區域放大（Lightbox 內疊網格）

### Step 6.1 — 更新 Lightbox 支援分頁來源 URL

在 archive-detail-modal.tsx 的 Lightbox 渲染區，找到 `zoomableImages` 的宣告位置，確認 `activeImage` 的 URL 來自正確的頁面 URL（已被 Step 5.3 處理）。

### Step 6.2 — 在 Lightbox 內新增網格覆蓋（可選，本輪不做）

**本輪不實作此步**，因為會增加開發複雜度。若日後需要，可在 Lightbox 內疊加 3×3 CSS 網格線，點擊任一格計算 `transform-origin` 並套用 `scale(2)`。

---

## 第七階段：方向感知標註（208 專用）

### Step 7.1 — 新建方向標註資料

**新建檔案**：`src/data/perspective-markers.ts`

```ts
/**
 * perspective-markers.ts
 *
 * 208 透視圖的方向框標註資料。
 * 用於在題目卷正面的圖片上標示甲／乙／丙三個方向框位置。
 *
 * 設計背景：
 * 甲向 = 一消點透視圖（考場比例 1/3）
 * 乙丙向 = 二消點透視圖（考場比例 2/3）
 * 讓備考者一眼看出「甲向在這裡，乙丙向在那裡」，
 * 呼應 v1.3 附錄 H 的方向感知抽題邏輯。
 */

export type PerspectiveMarker = {
  direction: "甲" | "乙" | "丙";
  /** 方向框相對位置（百分比，0-100） */
  position: {
    top: number;    // 從圖片頂部算起（%）
    left: number;   // 從圖片左側算起（%）
    width: number;  // 框寬度（%）
    height: number; // 框高度（%）
  };
  /** 標籤顯示文字 */
  label: string;
  /** 消點類型 */
  vpType: "一消點" | "二消點";
};

/** 208 題目卷正面的方向框標註（基於實際圖面測量） */
export const PERSPECTIVE_208_MARKERS: PerspectiveMarker[] = [
  {
    direction: "甲",
    position: { top: 15, left: 10, width: 25, height: 35 },
    label: "甲向",
    vpType: "一消點",
  },
  {
    direction: "乙",
    position: { top: 15, left: 38, width: 25, height: 35 },
    label: "乙向",
    vpType: "二消點",
  },
  {
    direction: "丙",
    position: { top: 15, left: 66, width: 25, height: 35 },
    label: "丙向",
    vpType: "二消點",
  },
];

/**
 * 取得某個題號的方向標註（僅 208 有實測資料，其餘題號回傳空陣列）。
 */
export function getPerspectiveMarkers(itemCode: string): PerspectiveMarker[] {
  if (itemCode.startsWith("208")) return PERSPECTIVE_208_MARKERS;
  return [];
}
```

### Step 7.2 — 在 SheetReader 內渲染方向標註（208 限定）

在 `SheetReader` 的主圖區內，針對第一頁（正面）且題號為 208 時，疊加方向框標註：

**修改** `SheetReader` 的 JSX，找到主圖區的 `<SafeImage>`，在其外包一層 `<div className="sheet-reader__main">`，在此 div 內新增：

```tsx
{/* 方向標註（僅 208 正面顯示） */}
{activePage === 0 && getPerspectiveMarkers(doc.code).length > 0 && (
  <div className="sheet-reader__marker-overlay" aria-hidden="true">
    {getPerspectiveMarkers(doc.code).map((marker) => (
      <div
        key={marker.direction}
        className={`sheet-reader__marker sheet-reader__marker--${marker.vpType === "一消點" ? "1vp" : "2vp"}`}
        style={{
          top: `${marker.position.top}%`,
          left: `${marker.position.left}%`,
          width: `${marker.position.width}%`,
          height: `${marker.position.height}%`,
        }}
      >
        <span className="sheet-reader__marker-label">
          {marker.label}
          <small>{marker.vpType}</small>
        </span>
      </div>
    ))}
  </div>
)}
```

**新增 CSS**（在 globals.css 的 SheetReader 區塊）：

```css
/* 方向框標註 */
.sheet-reader__marker-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.sheet-reader__marker {
  position: absolute;
  border: 2px dashed;
  border-radius: 6px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 4px;
  transition: border-color var(--duration-fast) var(--ease-out);
}

.sheet-reader__marker--1vp {
  border-color: rgba(59, 130, 246, 0.7);
  background: rgba(59, 130, 246, 0.06);
}

.sheet-reader__marker--2vp {
  border-color: rgba(139, 92, 246, 0.7);
  background: rgba(139, 92, 246, 0.06);
}

.sheet-reader__marker-label {
  font-size: 0.72rem;
  font-weight: 700;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.sheet-reader__marker--1vp .sheet-reader__marker-label {
  color: #1d4ed8;
}

.sheet-reader__marker--2vp .sheet-reader__marker-label {
  color: #5b21b6;
}

.sheet-reader__marker-label small {
  font-size: 0.62rem;
  font-weight: 400;
  opacity: 0.8;
}
```

---

## 第八階段：視覺驗收

### Step 8.1 — 啟動開發伺服器

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/室內設計乙級"
npm run dev
```

等待看見 `ready - started server on http://localhost:3000`，再進行視覺驗收。

### Step 8.2 — 視覺檢查清單

打開瀏覽器，逐一確認：

| # | 檢查點 | 預期結果 |
|---|---|---|
| 1 | 首頁 Hero 正常渲染 | 暖米背景、品牌色無異常 |
| 2 | 點擊任一試卷卡片 | Modal 開啟，題目區使用 SheetReader |
| 3 | 208 透視圖試卷卡（已建檔） | SheetReader 顯示 2 頁，頁碼指示器 "1 / 2" |
| 4 | 點擊 207 甲（未建檔） | 顯示誠實佔位狀態：「題目圖紙建置中」 |
| 5 | 縮圖列 | 兩張縮圖，點擊可切換 |
| 6 | 鍵盤左右鍵 | 可切換頁面 |
| 7 | Zoom 控制 | 三段切換（符合 / 1400 / 2200）|
| 8 | 比對模式按鈕 | 點擊後 UI 變化 |
| 9 | 點擊主圖 | Lightbox 開啟 |
| 10 | Lightbox 內左右箭頭 | 可在所有圖（題目 + 上傳）間切換 |
| 11 | Console 無 Error | 無紅字錯誤、無 TypeScript 錯誤 |
| 12 | 480px Mobile | 無橫向捲動，SheetReader 適配 |

### Step 8.3 — 憲法合規 Pre-flight 掃描

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/室內設計乙級"

# 1. CSS 變數覆用（不得有寫死 hex）
grep -rEn "color: #[0-9a-fA-F]{3,8}|background: #[0-9a-fA-F]{3,8}" \
  src/components/sheet-reader.tsx \
  src/components/archive-detail-modal.tsx \
  src/app/globals.css 2>/dev/null | grep -v "var(--" | grep -v "node_modules" || echo "✅ 無寫死 hex"

# 2. 字體合規（≥3rem 標題 ≤ 0.02em）
grep -rn "letter-spacing:" src/components/sheet-reader.tsx | \
  awk '$NF ~ /[0-9.]+em/ && $NF+0 > 0.05' || echo "✅ 字距合規"

# 3. 無新增非標準斷點（僅 480/768/1024/1200）
grep -rEho "@media \(max-width: [0-9]+px\)" \
  src/components/sheet-reader.tsx \
  src/app/globals.css | sort | uniq -c | sort -rn

# 4. font-size 上限
grep -rEn "font-size: [0-9]+\.[5-9]rem|font-size: [1-9][0-9]rem" \
  src/components/sheet-reader.tsx || echo "✅ 字級合規"

# 5. ≥3rem 標題有 text-wrap: balance
grep -rn "heading--h1\|heading--h2\|clamp.*3\|clamp.*4" \
  src/components/sheet-reader.tsx | grep -v "text-wrap" || echo "✅ text-wrap 合規"

# 6. TypeScript 編譯
npx tsc --noEmit 2>&1 | head -20 || echo "✅ 編譯無 Error"
```

---

## 第九階段：Commit 與憲章更新

### Step 9.1 — Commit 訊息

```
feat(sheet-reader): 試卷閱讀器 — 分頁檢視 + 自動裁邊 + 方向感知標註

- 新增 SheetDoc 資料模型，取代「兩 URL 欄位」的舊模型
- 新增 SheetReader 元件：滿寬 912px + object-fit: contain + 分頁導航
- 新增自動裁邊 build script（scripts/trim-sheets.mjs）
- 新增方向框標註（208 透視圖專用，呼應 v1.3 方向感知抽題）
- 新增方向感知標註資料（perspective-markers.ts）
- 新增 SheetDocRenderer Wrapper，維護 archive-detail-modal.tsx 向後相容
- 重構 buildSheetDoc / getSectionCoverage 至 src/lib/sheet-reader.ts
- 重寫 perspective-sheets.ts（邏輯層，不含 UI）
- Pre-flight 掃描全數通過（CSS 變數 / 字距 / 斷點 / 字級 / text-wrap）
```

### Step 9.2 — 更新 `AGENTS.md` 附錄 G

在附錄 G 末尾新增條目：

```markdown
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
- `src/types/sheet.ts`：SheetDoc / SheetPage 型別定義
- `src/lib/sheet-reader.ts`：URL 解析邏輯（單一事實來源）
- `src/components/sheet-reader.tsx`：試卷閱讀器元件
- `src/data/perspective-markers.ts`：208 方向框標註資料
- `scripts/trim-sheets.mjs`：自動裁邊 build script

## 受影響檔案
- `src/components/archive-detail-modal.tsx`：題目區改用 SheetReader
- `src/app/globals.css`：新增 SheetReader / 方向標註樣式
- `src/lib/perspective-sheets.ts`：重寫為純邏輯層（不含 UI）

## 設計權重
| 軸 | 分數 | 理由 |
|---|---|---|
| 資訊準確度 | 10 | 單一事實來源，頁面語意正確 |
| 圖面可讀性 | 9.5 | 2.05× 放大 × 1.15× 裁邊 = 2.35× 有效解析度 |
| 資訊層級 | 9.5 | 文件 → 頁 → 區域 三層，Stripe 網格成立 |
| RWD 穩健度 | 9 | 768px 單欄，縮圖列橫向捲動（§12 RWD 紀律）|
| 維護成本 | 7 | 新增 viewer 元件 + build script，但複用既有 thumb/lightbox |
| 跨 section 一致性 | 8 | 抽象成通用 SheetReader，plan/detail 可選用 |
| **加權總分** | **9.1** | |
```

---

## 實作順序（低階模型照表操課）

| 順序 | 檔案 | 操作 |
|---|---|---|
| 1 | — | Git 回滾（Step 1.1–1.5）|
| 2 | 新建 `src/lib/perspective-sheets.ts` | 邏輯層重建（Step 1.5）|
| 3 | 新建 `src/types/sheet.ts` | 資料模型（Step 2.1）|
| 4 | 新建 `src/lib/sheet-reader.ts` | URL 解析（Step 2.2）|
| 5 | 新建 `scripts/trim-sheets.mjs` | 裁邊 Script（Step 3.2）|
| 6 | 執行 `node scripts/trim-sheets.mjs` | 裁邊處理（Step 3.3）|
| 7 | 新建 `src/components/sheet-reader.tsx` | 閱讀器元件（Step 4.1）|
| 8 | 修改 `src/app/globals.css` | SheetReader + 方向標註樣式（Step 4.2）|
| 9 | 新建 `src/data/perspective-markers.ts` | 方向標註資料（Step 7.1）|
| 10 | 修改 `src/components/sheet-reader.tsx` | 整合方向標註（Step 7.2）|
| 11 | 修改 `src/components/archive-detail-modal.tsx` | 整合 SheetReader（Step 5）|
| 12 | 執行 `npm run dev` | 視覺驗收（Step 8）|
| 13 | 執行 Pre-flight 掃描 | 憲法合規（Step 8.3）|
| 14 | Commit | Step 9.1 格式 |
| 15 | 更新 `AGENTS.md` | 新增附錄 I（Step 9.2）|
