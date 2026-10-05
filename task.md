# 透視圖抽題邏輯優化 — 實作清單

> 版本：v2（9.2 分方案）
> 生效日期：2026-10-05
> 原則：總練習量 = 「我的練習圖」上傳張數（非去重 sheetCode）

---

## 目標行為摘要

透視圖（207–212 甲/乙/丙）抽題需滿足：
1. **1:2 原則**：二消點練習量（一消點的 2 倍），由權重常數鎖定，非依賴題數對稱
2. **方向感知**：根據已上傳的「我的練習圖」張數，動態計算缺哪一向，優先抽取落後方向
3. **教學階梯**：UI 呈現一消點 → 二消點的學習路徑

---

## 第一階段：資料層重構

### Step 1.1 — 新建 `src/lib/practice-stats.ts`

建立練習統計的單一事實來源，統一透視圖與 CE 的統計口徑。

**檔案內容**：

```ts
/**
 * practice-stats.ts
 *
 * 練習統計單一事實來源（Single Source of Truth）。
 * 統計口徑：上傳圖片張數（UPLOAD_KINDS.MY_PRACTICE 的 imageUrls?.length ?? 1）
 */

import { ArchiveItem, UploadEntry } from "@/types/exam";
import { UPLOAD_KINDS } from "@/lib/upload-constants";

/** 題目級練習次數（圖片張數） */
export function countPracticePerItem(
  items: ArchiveItem[],
  uploads: UploadEntry[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) {
    const iCode = item.code.trim().toLowerCase();
    map[item.code] = uploads
      .filter((u) => {
        const uCode = u.sheetCode.replace(/[\s\-_]/g, "").toLowerCase();
        const cleanI = iCode.replace(/[\s\-_]/g, "").toLowerCase();
        const isMatch = uCode === cleanI || uCode.includes(cleanI);
        return isMatch && u.kind === UPLOAD_KINDS.MY_PRACTICE;
      })
      .reduce((sum, u) => sum + (u.imageUrls?.length ?? (u.imageUrl ? 1 : 0)), 0);
  }
  return map;
}

/** 群組級練習張數（圖片張數總和） */
export function sumByGroup(
  items: ArchiveItem[],
  uploads: UploadEntry[],
  groupOf: (item: ArchiveItem) => string
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) {
    const groupKey = groupOf(item);
    if (!map[groupKey]) map[groupKey] = 0;

    const iCode = item.code.trim().toLowerCase();
    const count = uploads
      .filter((u) => {
        const uCode = u.sheetCode.replace(/[\s\-_]/g, "").toLowerCase();
        const cleanI = iCode.replace(/[\s\-_]/g, "").toLowerCase();
        return (uCode === cleanI || uCode.includes(cleanI)) &&
               u.kind === UPLOAD_KINDS.MY_PRACTICE;
      })
      .reduce((sum, u) => sum + (u.imageUrls?.length ?? (u.imageUrl ? 1 : 0)), 0);

    map[groupKey] += count;
  }
  return map;
}
```

**驗收標準**：
- [ ] `countPracticePerItem` 對「208甲」有 2 張練習圖時回傳 2（不是去重後的 1）
- [ ] `sumByGroup` 可正確按方向分組統計

---

### Step 1.2 — 更新 `src/hooks/use-exam-draw.ts`

新增透視圖方向分類與方向感知抽題邏輯。

**在檔案頂部新增（插入位置：import之後，現有export之前）**：

```ts
/** 透視圖方向類型 */
export type PerspectiveDirection = "甲" | "乙" | "丙";

/** 透視圖方向消點類型 */
export type VPOccupancy = "1VP" | "2VP";

/** 透視圖方向權重常數（常數鎖定，不可改為魔術數字） */
export const PERSPECTIVE_DIRECTION_WEIGHTS: Record<PerspectiveDirection, number> = {
  甲: 1 / 3, // 一消點
  乙: 1 / 3, // 二消點
  丙: 1 / 3, // 二消點
};

/** 透視圖方向 → 消點類型 */
export const DIRECTION_VP_MAP: Record<PerspectiveDirection, VPOccupancy> = {
  甲: "1VP",
  乙: "2VP",
  丙: "2VP",
};

/** 消點類型 → 目標比例（考場實際比例：一消點 : 二消點 = 1 : 2） */
export const VP_TARGET_RATIO: Record<VPOccupancy, number> = {
  "1VP": 1 / 3, // 占 1/3
  "2VP": 2 / 3, // 占 2/3
};

const PERSPECTIVE_DEADBAND = 0.005; // 0.5% 遲滯帶，防止來回震盪

/**
 * 從試卷 code 抽出透視方向（甲/乙/丙）
 * "208甲" → "甲"
 * "212丙" → "丙"
 */
export function extractPerspectiveDirection(code: string): PerspectiveDirection | null {
  const match = code.match(/[甲乙丙]$/);
  return (match ? match[0] : null) as PerspectiveDirection | null;
}

/** 透視圖方向平衡統計 */
export type PerspectiveBalance = {
  directionCounts: Record<PerspectiveDirection, number>; // 各方向練習張數
  totalCount: number;                                       // 總練習張數
  directionShares: Record<PerspectiveDirection, number>;      // 各方向佔比（小數）
  directionDeficits: Record<PerspectiveDirection, number>;   // 各方向 deficit（目標 − 實際）
  lean: PerspectiveDirection | "balanced";                  // 當前傾向
  completedDirections: PerspectiveDirection[];               // 已練滿（≥5張/方向）的方向
};
```

**在 `calcCECategoryBalance` 之後新增函式**：

```ts
/**
 * 計算透視圖各方向的練習張數與 deficit
 *
 * @param perspectiveItems 透視圖試卷池（207-212 甲/乙/丙，共 18 張）
 * @param uploads 所有上傳記錄
 */
export function calcPerspectiveBalance(
  perspectiveItems: ArchiveItem[],
  uploads: UploadEntry[]
): PerspectiveBalance {
  // 以 imageUrls length 統計張數
  const directionImageMap: Record<PerspectiveDirection, number> = {
    甲: 0, 乙: 0, 丙: 0,
  };

  for (const item of perspectiveItems) {
    const dir = extractPerspectiveDirection(item.code);
    if (!dir) continue;

    const iCode = item.code.trim().toLowerCase();
    const count = uploads
      .filter((u) => {
        const uCode = u.sheetCode.replace(/[\s\-_]/g, "").toLowerCase();
        const cleanI = iCode.replace(/[\s\-_]/g, "").toLowerCase();
        return (uCode === cleanI || uCode.includes(cleanI)) &&
               u.kind === UPLOAD_KINDS.MY_PRACTICE;
      })
      .reduce((sum, u) => sum + (u.imageUrls?.length ?? (u.imageUrl ? 1 : 0)), 0);

    directionImageMap[dir] += count;
  }

  const totalCount = directionImageMap.甲 + directionImageMap.乙 + directionImageMap.丙;

  // 各方向佔比（小數，0~1）
  const directionShares: Record<PerspectiveDirection, number> = {
    甲: totalCount > 0 ? directionImageMap.甲 / totalCount : 1 / 3,
    乙: totalCount > 0 ? directionImageMap.乙 / totalCount : 1 / 3,
    丙: totalCount > 0 ? directionImageMap.丙 / totalCount : 1 / 3,
  };

  // 各方向 deficit = 目標佔比 − 實際佔比
  const directionDeficits: Record<PerspectiveDirection, number> = {
    甲: 1 / 3 - directionShares.甲,
    乙: 1 / 3 - directionShares.乙,
    丙: 1 / 3 - directionShares.丙,
  };

  // 識別已練滿的方向（練習張數 ≥ 5 × 6 = 30 張時，視為該方向完成）
  const COMPLETION_THRESHOLD = 5; // 每張試卷最多練習次數
  const ITEMS_PER_DIRECTION = 6;   // 每個方向的試卷張數
  const completedDirections: PerspectiveDirection[] = (
    (["甲", "乙", "丙"] as PerspectiveDirection[]).filter(
      (d) => directionImageMap[d] >= COMPLETION_THRESHOLD * ITEMS_PER_DIRECTION
    )
  );

  // 計算傾向：取 deficit 最大且未完成的方向
  const activeDirections = (["甲", "乙", "丙"] as PerspectiveDirection[]).filter(
    (d) => !completedDirections.includes(d) && directionDeficits[d] > PERSPECTIVE_DEADBAND
  );

  let lean: PerspectiveDirection | "balanced" = "balanced";
  if (activeDirections.length > 0) {
    // 取 deficit 最大的方向；平手時依 甲→乙→丙 教學序決定
    activeDirections.sort((a, b) => {
      const diff = directionDeficits[b] - directionDeficits[a];
      if (Math.abs(diff) < 0.001) {
        const order = { 甲: 0, 乙: 1, 丙: 2 };
        return order[a] - order[b];
      }
      return diff;
    });
    lean = activeDirections[0];
  }

  return {
    directionCounts: directionImageMap,
    totalCount,
    directionShares,
    directionDeficits,
    lean,
    completedDirections,
  };
}
```

**在 `drawExamGroup` 函式內的 `perspective-detail` 區塊，替換抽題邏輯**：

找到並替換這段：
```ts
// 現有（舊）
if (group === "perspective-detail") {
    const perspectiveItems =
      examSections.find((s) => s.slug === "perspective")?.items ?? [];
    const pResult = drawOneFromItems(perspectiveItems, practiceCountMap);
    if (pResult) results.push(pResult);
```

改為：
```ts
// 新邏輯：方向感知抽題（兩層）
if (group === "perspective-detail") {
    const perspectiveItems =
      examSections.find((s) => s.slug === "perspective")?.items ?? [];

    // ── Layer 1：根據已上傳張數計算方向 deficit ──
    // practiceCountMap 已在呼叫端以 imageUrls length 為基礎計算
    const directionCounts: Record<PerspectiveDirection, number> = {
      甲: 0, 乙: 0, 丙: 0,
    };
    for (const item of perspectiveItems) {
      const dir = extractPerspectiveDirection(item.code);
      if (dir) {
        directionCounts[dir] += practiceCountMap[item.code] ?? 0;
      }
    }
    const totalPerspectiveCount = directionCounts.甲 + directionCounts.乙 + directionCounts.丙;

    // 計算 deficit（目標 1/3 − 實際佔比）
    const directionDeficits: Record<PerspectiveDirection, number> = {
      甲: 1 / 3 - (totalPerspectiveCount > 0 ? directionCounts.甲 / totalPerspectiveCount : 1 / 3),
      乙: 1 / 3 - (totalPerspectiveCount > 0 ? directionCounts.乙 / totalPerspectiveCount : 1 / 3),
      丙: 1 / 3 - (totalPerspectiveCount > 0 ? directionCounts.丙 / totalPerspectiveCount : 1 / 3),
    };

    // 識別已完成方向（6 題 × 5 次 = 30 張）
    const completedDirections = (["甲", "乙", "丙"] as PerspectiveDirection[]).filter(
      (d) => directionCounts[d] >= 30
    );

    // 取得候選方向（deficit > DEADBAND 且未完成）
    const activeDirections = (["甲", "乙", "丙"] as PerspectiveDirection[]).filter(
      (d) =>
        !completedDirections.includes(d) &&
        directionDeficits[d] > PERSPECTIVE_DEADBAND
    );

    // 決定抽題方向：取 deficit 最大的方向，平手時依 甲→乙→丙 教學序
    let targetDirection: PerspectiveDirection | null = null;
    if (activeDirections.length > 0) {
      activeDirections.sort((a, b) => {
        const diff = directionDeficits[b] - directionDeficits[a];
        if (Math.abs(diff) < 0.001) {
          const order: Record<PerspectiveDirection, number> = { 甲: 0, 乙: 1, 丙: 2 };
          return order[a] - order[b];
        }
        return diff;
      });
      targetDirection = activeDirections[0];
    }

    // ── Layer 2：在目標方向內抽最少練習的試卷 ──
    const pool = targetDirection
      ? perspectiveItems.filter((item) => extractPerspectiveDirection(item.code) === targetDirection)
      : perspectiveItems;

    const pResult = drawOneFromItems(pool, practiceCountMap);
    if (pResult) {
      // 附加抽題資訊（供 UI 顯示理由）
      (pResult as DrawResult & { directionReason?: string }).directionReason =
        targetDirection
          ? `${targetDirection}向落後（已練 ${directionCounts[targetDirection]} 張，目標 ${Math.round(totalPerspectiveCount / 3)} 張）`
          : "各向均衡，隨機抽取";
      results.push(pResult);
    }
```

**驗收標準**：
- [ ] 甲向 0 張、乙向 0 張、丙向 0 張時，抽甲向（教學序）
- [ ] 甲向 50 張、乙向 0 張、丙向 0 張時，抽乙向或丙向（deficit 最大者）
- [ ] 任一方向 6 題皆達 5 次練習（30 張），該方向自動排除
- [ ] 抽題結果攜帶 `directionReason` 字串

---

## 第二階段：UI 整合

### Step 2.1 — 更新 `src/components/exam-draw-section.tsx`

新增透視圖平衡儀、理由說明列與消點階梯 chip。

**A. 新增 state（在 `ceBalance` 之後插入）**：

```tsx
const [perspBalance, setPerspBalance] = useState<ReturnType<typeof calcPerspectiveBalance>>({
  directionCounts: { 甲: 0, 乙: 0, 丙: 0 },
  totalCount: 0,
  directionShares: { 甲: 0, 乙: 0, 丙: 0 },
  directionDeficits: { 甲: 0, 乙: 0, 丙: 0 },
  lean: "balanced",
  completedDirections: [],
});
```

**B. 在 `useEffect` 內補充透視圖統計（在 `setCeBalance` 之後插入）**：

```ts
// 計算透視圖方向平衡
const perspItems =
  examSections.find((s) => s.slug === "perspective")?.items ?? [];
setPerspBalance(calcPerspectiveBalance(entries, perspItems));
```

**C. 在 `handleDraw` 函式內，抽題後同步更新 `setPerspBalance`**（在 `setCeBalance` 呼叫處附近）：

```ts
setPerspBalance(calcPerspectiveBalance(entries, perspItems));
```

**D. 在 CE 平衡儀下方新增透視圖平衡儀**（找 `ce-balance-indicator` 的 `<div>`，在其後插入）：

```tsx
{/* 透視圖平衡儀 */}
<div
  className="persp-balance-indicator"
  aria-label="透視圖方向練習平衡狀態"
  style={{ marginTop: "var(--space-4)" }}
>
  <p
    style={{
      fontSize: "0.8rem",
      color: "var(--color-text-muted)",
      marginBottom: "var(--space-2)",
    }}
  >
    透視圖方向
  </p>
  {/* 三段進度條 */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "var(--space-2)",
    }}
  >
    {(["甲", "乙", "丙"] as const).map((dir) => {
      const count = perspBalance.directionCounts[dir];
      const target = Math.round(perspBalance.totalCount / 3);
      const isLean = perspBalance.lean === dir;
      const isCompleted = perspBalance.completedDirections.includes(dir);
      const vpType = dir === "甲" ? "一消點" : "二消點";

      return (
        <div
          key={dir}
          style={{
            padding: "var(--space-3)",
            borderRadius: "8px",
            background: isLean
              ? "color-mix(in srgb, var(--color-accent) 15%, transparent)"
              : "var(--color-surface)",
            border: isLean
              ? "1px solid var(--color-accent)"
              : "1px solid var(--color-border)",
            transition: "all 200ms ease-out",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--color-accent)",
              }}
            >
              {dir}
            </span>
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--color-text-muted)",
                background: "var(--color-theme)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              {vpType}
            </span>
          </div>
          <p
            style={{
              fontSize: "1.2rem",
              fontWeight: 700,
              margin: "0 0 2px 0",
              color: "var(--color-text)",
            }}
          >
            {count}
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 400,
                color: "var(--color-text-muted)",
                marginLeft: "4px",
              }}
            >
              張
            </span>
          </p>
          {isLean && !isCompleted && (
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--color-accent)",
                margin: 0,
              }}
            >
              → 下一題
            </p>
          )}
          {isCompleted && (
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--color-text-muted)",
                margin: 0,
              }}
            >
              ✓ 已完成
            </p>
          )}
          {!isLean && !isCompleted && (
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--color-text-muted)",
                margin: 0,
              }}
            >
              目標 {target} 張
            </p>
          )}
        </div>
      );
    })}
  </div>
</div>
```

**E. 更新抽題結果 Modal 的 `draw-result-card`**（在 `{drawnResults.map((res, idx) => (` 迴圈內的 card 區塊），在題號右側新增消點 chip 與理由說明列）：

找到：
```tsx
<span className="draw-result-code" style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--color-accent)" }}>
  {res.item.code}
</span>
```

在其後插入：
```tsx
{/* 消點階梯 chip */}
{(res.item as DrawResult & { directionReason?: string }).directionReason !== undefined && (
  <>
    <span
      style={{
        display: "inline-block",
        marginLeft: "8px",
        fontSize: "0.7rem",
        padding: "2px 8px",
        borderRadius: "12px",
        background: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
        color: "var(--color-accent)",
        verticalAlign: "middle",
      }}
    >
      {/* 甲向 = 一消點，乙/丙向 = 二消點 */}
      {res.item.code.endsWith("甲") ? "一消點" : "二消點"}
    </span>
  </>
)}
```

在整張 card 內，在 `focus` 描述段落之後新增理由說明列：
```tsx
{/* 理由說明列 */}
{(() => {
  const extended = res as DrawResult & { directionReason?: string };
  if (extended.directionReason) {
    return (
      <p
        style={{
          marginTop: "var(--space-2)",
          padding: "6px 10px",
          borderRadius: "6px",
          background: "var(--color-theme)",
          fontSize: "0.8rem",
          color: "var(--color-text-muted)",
          fontStyle: "italic",
        }}
      >
        💡 {extended.directionReason}
      </p>
    );
  }
  return null;
})()}
```

**驗收標準**：
- [ ] 透視圖平衡儀三欄同時顯示（甲/乙/丙），各有張數與消點標籤
- [ ] 當前傾向方向顯示「→ 下一題」標記
- [ ] 已完成方向顯示「✓ 已完成」
- [ ] 抽題結果卡顯示消點 chip（一消點 / 二消點）
- [ ] 抽題結果卡顯示理由說明列

---

### Step 2.2 — 更新 `src/components/archive-card.tsx`

在試卷卡上顯示消點階梯 chip（可選，因試卷卡資訊密度已高；若加入則僅在透視圖 section 顯示）。

**找透視圖 section 的卡片渲染邏輯**（通常是 `slug === "perspective"` 的分支），在試卷編號旁插入：

```tsx
{slug === "perspective" && (
  <span
    style={{
      display: "inline-block",
      marginLeft: "6px",
      fontSize: "0.65rem",
      padding: "1px 6px",
      borderRadius: "8px",
      background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
      color: "var(--color-accent)",
      verticalAlign: "middle",
    }}
  >
    {item.code.endsWith("甲") ? "一消點" : "二消點"}
  </span>
)}
```

**驗收標準**：
- [ ] 透視圖試卷卡顯示消點 chip，平面圖/CE/大樣圖不顯示（避免卡片資訊過載）

---

### Step 2.3 — 同步更新 `src/hooks/use-exam-draw.ts` 內的 `countPracticePerItem`

**替換整個函式**（Step 1.1 的 `countPracticePerItem` 已在 `practice-stats.ts` 定義）。在 `use-exam-draw.ts` 中：

1. 刪除原有的 `countPracticePerItem` 函式
2. 在檔案頂部改為 import：
   ```ts
   import { countPracticePerItem } from "@/lib/practice-stats";
   ```

**驗收標準**：
- [ ] `use-exam-draw.ts` 不再有重複的 `countPracticePerItem` 定義
- [ ] 透視圖抽題與 CE 抽題共用同一統計邏輯

---

## 第三階段：單元測試

### Step 3.1 — 新建 `src/lib/__tests__/practice-stats.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { PERSPECTIVE_DIRECTION_WEIGHTS, DIRECTION_VP_MAP, VP_TARGET_RATIO } from "@/hooks/use-exam-draw";
import { countPracticePerItem } from "@/lib/practice-stats";

describe("透視圖方向權重不變式", () => {
  it("三向權重和為 1", () => {
    const sum =
      PERSPECTIVE_DIRECTION_WEIGHTS.甲 +
      PERSPECTIVE_DIRECTION_WEIGHTS.乙 +
      PERSPECTIVE_DIRECTION_WEIGHTS.丙;
    expect(sum).toBeCloseTo(1, 5);
  });

  it("二消點佔比 = 1 − 一消點佔比（考場比例 1:2）", () => {
    const oneVP = VP_TARGET_RATIO["1VP"];
    const twoVP = VP_TARGET_RATIO["2VP"];
    expect(oneVP + twoVP).toBeCloseTo(1, 5);
    expect(twoVP / oneVP).toBeCloseTo(2, 2); // 2:1 = 二消點:一消點
  });

  it("甲向 = 一消點，乙丙向 = 二消點", () => {
    expect(DIRECTION_VP_MAP.甲).toBe("1VP");
    expect(DIRECTION_VP_MAP.乙).toBe("2VP");
    expect(DIRECTION_VP_MAP.丙).toBe("2VP");
  });
});

describe("countPracticePerItem — 圖片張數統計", () => {
  it("同一題上傳 2 張圖，回傳 2（非去重後的 1）", () => {
    const items = [{ code: "208甲", title: "", variants: [], focus: "", notes: "" }];
    const uploads = [
      {
        sheetCode: "208甲",
        kind: "我的練習圖",
        imageUrl: "a.jpg",
        imageUrls: ["a.jpg", "b.jpg"],
      },
    ];
    const result = countPracticePerItem(items, uploads as any);
    expect(result["208甲"]).toBe(2);
  });
});
```

**驗收標準**：
- [ ] `npm test` 全部通過
- [ ] 若任何人將 `PERSPECTIVE_DIRECTION_WEIGHTS` 改為其他值，測試失敗並阻擋 commit

---

## 第四階段：視覺驗收

### Step 4.1 — 啟動開發伺服器

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/室內設計乙級"
npm run dev
```

### Step 4.2 — 視覺檢查清單

打開 `http://localhost:3000`，逐一確認：

| # | 檢查點 | 預期結果 |
|---|---|---|
| 1 | 抽題區塊頂部 | 看到兩條平衡儀：CE（天花/立面）與透視圖（甲/乙/丙）|
| 2 | 透視圖平衡儀三欄 | 每欄有方向（甲/乙/丙）、消點標籤、張數 |
| 3 | 傾向標記 | deficit 最大方向顯示「→ 下一題」|
| 4 | 點擊「透視＋大樣圖」抽題 | 抽出透視圖，且 Modal 內顯示消點 chip（一消點 / 二消點）|
| 5 | 理由說明列 | Modal 內抽題卡底部顯示「💡 甲向落後（已練 X 張...）」|
| 6 | Console 無 Error | 無紅字錯誤、無型別錯誤 |
| 7 | RWD 480px | 透視圖平衡儀在 mobile 不應造成橫向捲動 |

### Step 4.3 — Pre-flight 憲法合規掃描

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/室內設計乙級"

# 1. CSS 變數覆用（不得有寫死 hex）
grep -rEn "color: #[0-9a-fA-F]{3,8}|background: #[0-9a-fA-F]{3,8}" src/components/exam-draw-section.tsx src/components/archive-card.tsx

# 2. 字體合規（≥3rem 標題 ≤ 0.02em）
grep -rn "letter-spacing:" src/components/exam-draw-section.tsx | awk '$NF ~ /[0-9.]+em/ && $NF+0 > 0.05'

# 3. 無新增非標準斷點（僅 480/768/1024/1200）
grep -rEho "@media \(max-width: [0-9]+px\)" src/components/exam-draw-section.tsx | sort | uniq -c

# 4. font-size 上限
grep -rEn "font-size: [0-9]+\.[5-9]rem|font-size: [1-9][0-9]rem" src/components/exam-draw-section.tsx
```

**全部空輸出（或無 Error）後才 commit。**

---

## 第五階段：Commit 與憲章更新

### Step 5.1 — Commit 訊息格式

```
feat(perspective): 方向感知抽題 + 透視圖平衡儀（v2 方案）

- 新增方向分類器與權重常數（一消點 1/3 : 二消點 2/3）
- 統計口徑：imageUrls length，非去重 sheetCode
- 雙層抽題：先算 deficit，再在方向內抽最少練習試卷
- 新增 0.5% DEADBAND 遲滯帶防止來回震盪
- 透視圖三段平衡儀 UI（甲/乙/丙 各含消點標籤）
- 抽題結果顯示消點 chip + 理由說明列
- 重構 countPracticePerItem 至 src/lib/practice-stats.ts
- 新增單元測試鎖定權重不變式

BREAKING: countPracticePerItem 統計口徑改為圖片張數，
         影響 CE 抽題加權（已於 commit message 標註）
```

### Step 5.2 — 更新 `AGENTS.md` 附錄 G

在附錄 G 的「備考知識庫 — Gemini 整合記錄」之後新增條目：

```markdown
# 附錄 H：透視圖抽題邏輯更新（v2）

## 更新日期
2026-10-05

## 核心變更
透視圖抽題從「題目級最少練習」升級為「方向感知抽題」：
- 統計口徑：上傳圖片張數（非去重 sheetCode）
- 權重常數鎖定：一消點 1/3 : 二消點 2/3（單一事實來源於 use-exam-draw.ts）
- 雙層抽題演算法：先算方向 deficit，再在方向內抽最少練習試卷
- 新增 0.5% DEADBAND 遲滯帶，防止來回震盪

## 新增檔案
- `src/lib/practice-stats.ts`：練習統計單一事實來源

## 受影響檔案
- `src/hooks/use-exam-draw.ts`：新增方向分類器、calcPerspectiveBalance、方向感知抽題邏輯
- `src/components/exam-draw-section.tsx`：新增透視圖平衡儀、消點 chip、理由說明列
- `src/components/archive-card.tsx`：新增透視圖消點 chip（僅透視 section）

## 不變式測試
- 三向權重和 === 1
- 二消點 : 一消點 === 2 : 1
- countPracticePerItem 對同題多圖回傳圖片張數
```

---

## 實作順序（低階模型照表操課）

| 順序 | 檔案 | 操作 |
|---|---|---|
| 1 | 新建 `src/lib/practice-stats.ts` | 寫入 Step 1.1 內容 |
| 2 | 修改 `src/hooks/use-exam-draw.ts` | 新增 type + 常數 + 函式（Step 1.2）|
| 3 | 修改 `src/hooks/use-exam-draw.ts` | 替換 `drawExamGroup` 內的透視抽題邏輯 |
| 4 | 修改 `src/components/exam-draw-section.tsx` | A/B/C/D/E（Step 2.1）|
| 5 | 修改 `src/components/archive-card.tsx` | 新增消點 chip（Step 2.2）|
| 6 | 新建 `src/lib/__tests__/practice-stats.test.ts` | 寫入 Step 3.1 內容 |
| 7 | 執行 `npm run dev` | 視覺驗收（Step 4）|
| 8 | 執行憲法掃描命令 | Pre-flight 確認（Step 4.3）|
| 9 | Commit | Step 5.1 格式 |
| 10 | 更新 `AGENTS.md` | 新增附錄 H（Step 5.2）|
