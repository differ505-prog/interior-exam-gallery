"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dices, X } from "lucide-react";
import { SurfacePanel } from "@/components/ui/primitives";
import { examSections } from "@/data/exam-content";
import {
  drawExamGroup,
  DrawGroup,
  calcCECategoryBalance,
  getCEDrawingType,
  CECategoryBalance,
  calcPerspectiveBalance,
  PerspectiveBalance,
  ExtendedDrawResult,
  PerspectiveFocusMode,
} from "@/hooks/use-exam-draw";
import {
  calcVariantBalance,
  extractPlanVariant,
  PlanVariantBalance,
  PLAN_VARIANTS,
} from "@/lib/plan-variant";
import {
  getCEViewBalance,
  CEViewBalance,
  CEView,
  CE_VIEW_LABELS,
} from "@/lib/ce-matrix";
import { countPracticePerItem } from "@/lib/practice-stats";
import { ArchiveItem, UploadEntry } from "@/types/exam";

/** 試卷組合標題 */
const GROUP_META: Record<DrawGroup, { title: string; subtitle: string }> = {
  "plan-ceiling-elevation": {
    title: "平面圖＋CE（天/立）",
    subtitle: "平面圖版本感知＋天花板/立面圖池級平衡",
  },
  "perspective-detail": {
    title: "透視＋大樣圖",
    subtitle: "透視圖＋大樣圖（最少練習優先）",
  },
};

export function ExamDrawSection() {
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [drawnResults, setDrawnResults] = useState<ExtendedDrawResult[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading] = useState(false);
  const [ceBalance, setCeBalance] = useState<CECategoryBalance>({
    ceilingCount: 0,
    elevationCount: 0,
    diff: 0,
    lean: "balanced",
  });
  const [ceViewBalance, setCeViewBalance] = useState<CEViewBalance>({
    viewCounts: { 客天: 0, 餐天: 0, 臥天: 0, 客立: 0, 餐立: 0, 臥立: 0 },
    totalCeiling: 0,
    totalElevation: 0,
    nextCeilingView: "客天",
    nextElevationView: "客立",
  });
  const [perspBalance, setPerspBalance] = useState<PerspectiveBalance>({
    directionCounts: { 甲: 0, 乙: 0, 丙: 0 },
    totalCount: 0,
    directionShares: { 甲: 0, 乙: 0, 丙: 0 },
    directionDeficits: { 甲: 0, 乙: 0, 丙: 0 },
    lean: "balanced",
    completedDirections: [],
  });
  const [perspFocusMode, setPerspFocusMode] = useState<PerspectiveFocusMode>("auto");
  const [variantBalance, setVariantBalance] = useState<PlanVariantBalance>({
    variantCounts: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
    totalCount: 0,
    variantShares: { A: 1 / 6, B: 1 / 6, C: 1 / 6, D: 1 / 6, E: 1 / 6, F: 1 / 6 },
    variantDeficits: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
    lean: "balanced",
    completedVariants: [],
  });
  const fetchedRef = useRef(false);

  // 只在掛載時 fetch 一次（避免每次抽題都重複 fetch）
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch("/api/uploads/all")
      .then((r) => r.json())
      .then((data: { entries?: UploadEntry[] }) => {
        const entries = data.entries ?? [];
        setUploads(entries);

        // 計算 CE 練習總量平衡（全局）
        const allCeItems =
          examSections.find((s) => s.slug === "ceiling-elevation")?.items ??
          [];
        const ceilingPool = allCeItems.filter(
          (item) => getCEDrawingType(item) === "ceiling"
        );
        const elevationPool = allCeItems.filter(
          (item) => getCEDrawingType(item) === "elevation"
        );
        setCeBalance(calcCECategoryBalance(entries, ceilingPool, elevationPool));

        // 計算透視圖方向平衡
        const perspItems =
          examSections.find((s) => s.slug === "perspective")?.items ?? [];
        setPerspBalance(calcPerspectiveBalance(perspItems, entries));

        // 計算平面圖版本平衡（A~F 需求單）
        const planItems =
          examSections.find((s) => s.slug === "plan")?.items ?? [];
        const allItems: ArchiveItem[] = [];
        for (const section of examSections) {
          allItems.push(...section.items);
        }
        const practiceMap = countPracticePerItem(allItems, entries);
        setVariantBalance(calcVariantBalance(planItems, practiceMap));
        setCeViewBalance(getCEViewBalance(allCeItems, practiceMap));
      })
      .catch(() => {
        // fetch 失敗：降級為空陣列，不中斷抽題
        setUploads([]);
        setCeBalance({
          ceilingCount: 0,
          elevationCount: 0,
          diff: 0,
          lean: "balanced",
        });
        setCeViewBalance({
          viewCounts: { 客天: 0, 餐天: 0, 臥天: 0, 客立: 0, 餐立: 0, 臥立: 0 },
          totalCeiling: 0,
          totalElevation: 0,
          nextCeilingView: "客天",
          nextElevationView: "客立",
        });
        setPerspBalance({
          directionCounts: { 甲: 0, 乙: 0, 丙: 0 },
          totalCount: 0,
          directionShares: { 甲: 0, 乙: 0, 丙: 0 },
          directionDeficits: { 甲: 0, 乙: 0, 丙: 0 },
          lean: "balanced",
          completedDirections: [],
        });
      });
  }, []);

  /** 點擊抽題按鈕 */
  const handleDraw = useCallback(
    (group: DrawGroup) => {
      const allItems: ArchiveItem[] = [];
      for (const section of examSections) {
        allItems.push(...section.items);
      }
      const practiceCountMap = countPracticePerItem(allItems, uploads);

      let results: ExtendedDrawResult[] = [];

      if (group === "plan-ceiling-elevation") {
        results = drawExamGroup(group, practiceCountMap, { uploads });
      } else {
        results = drawExamGroup(group, practiceCountMap, {
          perspectiveFocusMode: perspFocusMode,
          uploads,
        });
      }

      if (results.length === 0) {
        alert(
          `${GROUP_META[group].title}\n所有題目練習次數已達 5 次以上，本輪練習完成！\n\n建議：進入備考複盤，整理扣分點。`
        );
        return;
      }

      setDrawnResults(results);
      setShowModal(true);

      // ── 同步更新 CE + 透視圖平衡顯示 ─────────────
      const allCeItems =
        examSections.find((s) => s.slug === "ceiling-elevation")?.items ?? [];
      const ceilingPool = allCeItems.filter(
        (item) => getCEDrawingType(item) === "ceiling"
      );
      const elevationPool = allCeItems.filter(
        (item) => getCEDrawingType(item) === "elevation"
      );
      setCeBalance(calcCECategoryBalance(uploads, ceilingPool, elevationPool));

      const perspItems =
        examSections.find((s) => s.slug === "perspective")?.items ?? [];
      setPerspBalance(calcPerspectiveBalance(perspItems, uploads));

      // 同步更新平面圖版本平衡（A~F）與 CE 視角平衡
      const planItems =
        examSections.find((s) => s.slug === "plan")?.items ?? [];
      setVariantBalance(
        calcVariantBalance(planItems, practiceCountMap)
      );
      setCeViewBalance(getCEViewBalance(allCeItems, practiceCountMap));

      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug("[ExamDrawSection] 抽出試卷", {
          results: results.map((r) => ({
            code: r.item.code,
            count: r.practiceCount,
            reason: r.directionReason,
          })),
          group,
          ceBalance: ceBalance.lean,
          perspBalance: perspBalance.lean,
        });
      }
    },
    [uploads, ceBalance, perspBalance, perspFocusMode]
  );

  // 計算 CE 平衡儀百分比
  const total = ceBalance.ceilingCount + ceBalance.elevationCount;
  const ceilingPct = total > 0 ? (ceBalance.ceilingCount / total) * 100 : 50;

  // 計算透視圖消點比例（1VP vs 2VP 考場 1:2 達標率）
  const oneVpCount = perspBalance.directionCounts.甲;
  const twoVpCount =
    perspBalance.directionCounts.乙 + perspBalance.directionCounts.丙;
  const totalPerspCount = oneVpCount + twoVpCount;
  const oneVpPct =
    totalPerspCount > 0
      ? Math.round((oneVpCount / totalPerspCount) * 100)
      : 33;
  const twoVpPct = totalPerspCount > 0 ? 100 - oneVpPct : 67;

  // 達標診斷
  const perspStatus = (() => {
    if (totalPerspCount === 0) {
      return { text: "尚未開始練習", tone: "neutral" };
    }
    if (twoVpPct < 58) {
      return {
        text: `二消偏少（目前 ${twoVpPct}%，考場佔 67%，建議專攻二消）`,
        tone: "warning",
      };
    }
    if (twoVpPct > 76) {
      return {
        text: `一消偏少（目前 ${oneVpPct}%，考場佔 33%，建議補強一消）`,
        tone: "warning",
      };
    }
    return {
      text: "✓ 消點比例健康（二消約為一消 2 倍）",
      tone: "success",
    };
  })();

  const renderDirectionCard = (dir: "甲" | "乙" | "丙") => {
    const count = perspBalance.directionCounts[dir];
    const target = Math.round(perspBalance.totalCount / 3);
    const isLean = perspBalance.lean === dir;
    const isCompleted = perspBalance.completedDirections.includes(dir);
    const vpType = dir === "甲" ? "一消點" : "二消點";

    return (
      <div
        key={dir}
        style={{
          padding: "var(--space-4)",
          borderRadius: "12px",
          background: isLean
            ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
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
            marginBottom: "var(--space-2)",
          }}
        >
          <span
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--color-accent)",
            }}
          >
            {dir}
          </span>
          <span
            style={{
              fontSize: "0.65rem",
              padding: "2px 8px",
              borderRadius: "999px",
              background:
                "color-mix(in srgb, var(--color-accent) 12%, transparent)",
              color: "var(--color-accent)",
              fontWeight: 500,
            }}
          >
            {vpType}
          </span>
        </div>
        <p
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            margin: "0 0 4px 0",
            color: "var(--color-text)",
            lineHeight: 1,
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
              fontWeight: 500,
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
        {!isLean && !isCompleted && perspBalance.totalCount > 0 && (
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
        {!isLean && !isCompleted && perspBalance.totalCount === 0 && (
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            尚未開始
          </p>
        )}
      </div>
    );
  };

  const renderCEViewCard = (view: CEView, isCeilingGroup: boolean) => {
    const count = ceViewBalance.viewCounts[view] ?? 0;
    const isNext = isCeilingGroup
      ? ceViewBalance.nextCeilingView === view
      : ceViewBalance.nextElevationView === view;
    const label = CE_VIEW_LABELS[view] ?? view;

    return (
      <div
        key={view}
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "12px",
          background: isNext
            ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
            : "var(--color-surface)",
          border: isNext
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
            marginBottom: "var(--space-2)",
          }}
        >
          <span
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "var(--color-accent)",
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: "0.65rem",
              padding: "2px 6px",
              borderRadius: "999px",
              background:
                "color-mix(in srgb, var(--color-accent) 10%, transparent)",
              color: "var(--color-accent)",
              fontWeight: 500,
            }}
          >
            {view}
          </span>
        </div>
        <p
          style={{
            fontSize: "1.35rem",
            fontWeight: 800,
            margin: "0 0 2px 0",
            color: "var(--color-text)",
            lineHeight: 1,
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
        {isNext ? (
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--color-accent)",
              margin: 0,
              fontWeight: 600,
            }}
          >
            → 下一題
          </p>
        ) : (
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            視角覆蓋
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <SurfacePanel ariaLabel="抽題練習" className="exam-draw-panel" id="exam-draw">
        {/* Hero */}
        <div className="exam-draw-hero">
          <p className="eyebrow">🎲 Exam Draw</p>
          <h2 className="heading heading--h2 exam-draw-hero__title">
            抽題練習
          </h2>
          <p className="exam-draw-hero__subtitle">
            每次從最少練習次數的題目中抽取，確保均衡覆蓋所有試卷。
          </p>
        </div>

        {/* CE 平衡儀 */}
        <div
          className="ce-balance-indicator"
          aria-label="天花板與立面圖練習平衡狀態"
        >
          <div className="balance-bar">
            <span className="bar-label">
              <span className="bar-label__type">天花</span>
              <span className="bar-label__count">
                {ceBalance.ceilingCount}
              </span>
            </span>
            <div
              className="bar-track"
              role="progressbar"
              aria-valuenow={Math.round(ceilingPct)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="bar-fill bar-fill--ceiling"
                style={{ width: `${ceilingPct}%` }}
              />
            </div>
            <span className="bar-label">
              <span className="bar-label__type">立面</span>
              <span className="bar-label__count">
                {ceBalance.elevationCount}
              </span>
            </span>
          </div>
          {ceBalance.lean !== "balanced" && (
            <p className="balance-hint">
              → 下一題傾向：
              {ceBalance.lean === "ceiling" ? "立面圖" : "天花板圖"}
            </p>
          )}

          {/* CE 視角平衡網格（天花板池 vs 立面圖池） */}
          <div className="ce-groups-grid">
            <div className="ce-group ce-group--ceiling">
              <div className="ce-group__header">
                <span className="ce-group__title">天花板視角</span>
                <span className="ce-group__ratio">
                  天花池 · 108 題（已練 {ceViewBalance.totalCeiling} 張）
                </span>
              </div>
              <div className="ce-group__cards">
                {renderCEViewCard("客天", true)}
                {renderCEViewCard("餐天", true)}
                {renderCEViewCard("臥天", true)}
              </div>
            </div>

            <div className="ce-group ce-group--elevation">
              <div className="ce-group__header">
                <span className="ce-group__title">立面圖視角</span>
                <span className="ce-group__ratio">
                  立面池 · 108 題（已練 {ceViewBalance.totalElevation} 張）
                </span>
              </div>
              <div className="ce-group__cards">
                {renderCEViewCard("客立", false)}
                {renderCEViewCard("餐立", false)}
                {renderCEViewCard("臥立", false)}
              </div>
            </div>
          </div>
        </div>

        {/* 透視圖消點平衡儀（1VP vs 2VP 雙段考場對比，v3 升級） */}
        <div
          className="persp-balance-container"
          aria-label="透視圖消點練習平衡狀態"
        >
          <div className="persp-balance-header">
            <div className="persp-balance-eyebrow">
              <span>透視圖消點平衡</span>
              <span
                className={`persp-balance-status ${
                  perspStatus.tone === "warning"
                    ? "persp-balance-status--warning"
                    : perspStatus.tone === "success"
                    ? "persp-balance-status--success"
                    : ""
                }`}
              >
                {perspStatus.text}
              </span>
            </div>

            {/* 抽題模式切換器 */}
            <div className="persp-mode-control">
              <span className="persp-mode-label">抽題模式：</span>
              <div
                className="persp-mode-segmented"
                role="radiogroup"
                aria-label="透視圖抽題模式"
              >
                <button
                  type="button"
                  className={`persp-mode-btn ${
                    perspFocusMode === "auto" ? "persp-mode-btn--active" : ""
                  }`}
                  onClick={() => setPerspFocusMode("auto")}
                  role="radio"
                  aria-checked={perspFocusMode === "auto"}
                  title="依考場黃金比例 2:1 自動抽題"
                >
                  考場均衡 (1:2)
                </button>
                <button
                  type="button"
                  className={`persp-mode-btn ${
                    perspFocusMode === "2vp" ? "persp-mode-btn--active" : ""
                  }`}
                  onClick={() => setPerspFocusMode("2vp")}
                  role="radio"
                  aria-checked={perspFocusMode === "2vp"}
                  title="鎖定二消點（乙、丙）特訓，攻克作圖瓶頸"
                >
                  二消特訓 (2VP)
                </button>
                <button
                  type="button"
                  className={`persp-mode-btn ${
                    perspFocusMode === "1vp" ? "persp-mode-btn--active" : ""
                  }`}
                  onClick={() => setPerspFocusMode("1vp")}
                  role="radio"
                  aria-checked={perspFocusMode === "1vp"}
                  title="鎖定一消點（甲）速刷基礎功"
                >
                  一消速刷 (1VP)
                </button>
              </div>
            </div>
          </div>

          {/* 雙段進度條（Macro Ratio Bar） */}
          <div className="persp-macro-bar">
            <div className="persp-macro-track" aria-hidden="true">
              <div
                className="persp-macro-fill--1vp"
                style={{ width: `${oneVpPct}%` }}
                title={`一消點 (甲)：${oneVpPct}%`}
              />
              <div
                className="persp-macro-fill--2vp"
                style={{ width: `${twoVpPct}%` }}
                title={`二消點 (乙＋丙)：${twoVpPct}%`}
              />
              <div
                className="persp-macro-benchmark"
                title="考場基準線：一消 33.3% / 二消 66.7%"
              />
            </div>

            <div className="persp-macro-labels">
              <span className="persp-macro-legend">
                <span className="persp-macro-dot persp-macro-dot--1vp" />
                一消點 (甲) <strong>{oneVpCount}</strong> 張 · {oneVpPct}%（考場目標 33%）
              </span>
              <span className="persp-macro-legend">
                <span className="persp-macro-dot persp-macro-dot--2vp" />
                二消點 (乙＋丙) <strong>{twoVpCount}</strong> 張 · {twoVpPct}%（考場目標 67%）
              </span>
            </div>
          </div>

          {/* 階層群組網格（左側 1VP : 右側 2VP） */}
          <div className="persp-groups-grid">
            <div className="persp-group persp-group--1vp">
              <div className="persp-group__header">
                <span className="persp-group__title">一消點（1VP）</span>
                <span className="persp-group__ratio">考場佔比 33% · 6 題</span>
              </div>
              <div className="persp-group__cards">
                {renderDirectionCard("甲")}
              </div>
            </div>

            <div className="persp-group persp-group--2vp">
              <div className="persp-group__header">
                <span className="persp-group__title">二消點（2VP）</span>
                <span className="persp-group__ratio">
                  考場佔比 67% · 12 題（合計 {twoVpCount} 張）
                </span>
              </div>
              <div className="persp-group__cards">
                {renderDirectionCard("乙")}
                {renderDirectionCard("丙")}
              </div>
            </div>
          </div>
        </div>

        {/* 平面圖版本平衡儀（A~F 六格，方案 A 新增） */}
        <div
          className="variant-balance"
          aria-label="平面圖需求單版本練習平衡狀態"
          style={{ marginTop: "var(--space-5)" }}
        >
          <p className="variant-balance__eyebrow">平面圖需求單版本</p>
          <div className="variant-balance__grid">
            {PLAN_VARIANTS.map((variant) => {
              const count = variantBalance.variantCounts[variant];
              const target = Math.round(variantBalance.totalCount / 6);
              const isLean = variantBalance.lean === variant;
              const isCompleted =
                variantBalance.completedVariants.includes(variant);

              return (
                <div
                  key={variant}
                  className={`variant-cell${
                    isLean && !isCompleted ? " variant-cell--lean" : ""
                  }`}
                  aria-current={isLean && !isCompleted ? "true" : undefined}
                >
                  <div className="variant-cell__head">
                    <span className="variant-cell__letter">{variant}</span>
                    <span className="variant-cell__chip">需求單</span>
                  </div>
                  <p className="variant-cell__count">
                    {count}
                    <span className="variant-cell__unit">張</span>
                  </p>
                  {isLean && !isCompleted && (
                    <p className="variant-cell__hint variant-cell__hint--lean">
                      → 下一題
                    </p>
                  )}
                  {isCompleted && (
                    <p className="variant-cell__hint">✓ 已完成</p>
                  )}
                  {!isLean && !isCompleted && variantBalance.totalCount > 0 && (
                    <p className="variant-cell__hint">目標 {target} 張</p>
                  )}
                  {!isLean && !isCompleted && variantBalance.totalCount === 0 && (
                    <p className="variant-cell__hint">尚未開始</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 抽題按鈕 */}
        <div
          className="exam-draw-buttons"
          role="group"
          aria-label="抽題組合"
          style={{ marginTop: "var(--space-6)" }}
        >
          {(Object.keys(GROUP_META) as DrawGroup[]).map((group) => {
            const meta = GROUP_META[group];
            const dynamicSubtitle =
              group === "perspective-detail"
                ? perspFocusMode === "2vp"
                  ? "透視圖（鎖定二消特訓 2VP）＋大樣圖"
                  : perspFocusMode === "1vp"
                  ? "透視圖（鎖定一消速刷 1VP）＋大樣圖"
                  : "透視圖（1:2 考場感知）＋大樣圖"
                : meta.subtitle;

            return (
              <button
                key={group}
                className="exam-draw-btn"
                onClick={() => handleDraw(group)}
                disabled={loading}
                aria-label={`抽題：${meta.title}，${dynamicSubtitle}`}
              >
                <span className="exam-draw-btn__icon" aria-hidden="true">
                  <Dices size={24} />
                </span>
                <span className="exam-draw-btn__label">{meta.title}</span>
                <span className="exam-draw-btn__sub">{dynamicSubtitle}</span>
              </button>
            );
          })}
        </div>
      </SurfacePanel>

      {/* 抽出結果 Modal */}
      {showModal && drawnResults.length > 0 && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-container modal-container--draw-result"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal-header">
              <div className="modal-header-title">
                <h2>🎲 抽題結果</h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
                aria-label="關閉視窗"
              >
                <X size={20} />
              </button>
            </header>

            <div className="modal-content draw-result-content">
              <div
                className="draw-result-list"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  padding: "24px",
                }}
              >
                {drawnResults.map((res, idx) => (
                  <div
                    key={idx}
                    className="draw-result-card"
                    style={{
                      padding: "var(--space-5)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "12px",
                      background: "var(--color-theme)",
                    }}
                  >
                    {/* 題號列 + 消點 chip */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "var(--space-3)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <span
                          style={{
                            fontSize: "1.3rem",
                            fontWeight: 700,
                            color: "var(--color-accent)",
                          }}
                        >
                          {res.item.code}
                        </span>
                        {/* 消點 chip（透視圖限定） */}
                        {res.item.code.endsWith("甲") && (
                          <span
                            style={{
                              fontSize: "0.65rem",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                              color: "var(--color-accent)",
                              fontWeight: 500,
                            }}
                          >
                            一消點
                          </span>
                        )}
                        {(res.item.code.endsWith("乙") || res.item.code.endsWith("丙")) && (
                          <span
                            style={{
                              fontSize: "0.65rem",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                              color: "var(--color-accent)",
                              fontWeight: 500,
                            }}
                          >
                            二消點
                          </span>
                        )}
                        {/* 需求單版本 chip（平面圖／CE 限定） */}
                        {extractPlanVariant(res.item.code) && (
                          <span
                            style={{
                              fontSize: "0.65rem",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                              color: "var(--color-accent)",
                              fontWeight: 500,
                            }}
                          >
                            {extractPlanVariant(res.item.code)} 版需求單
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {res.practiceCount} 次
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: "1.05rem",
                        margin: "0 0 var(--space-2) 0",
                        color: "var(--color-text)",
                        fontWeight: 600,
                      }}
                    >
                      {res.item.title}
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.875rem",
                        color: "var(--color-text-muted)",
                        lineHeight: 1.6,
                      }}
                    >
                      {res.item.focus}
                    </p>

                    {/* 理由說明列（v2 新增） */}
                    {res.directionReason && (
                      <p
                        style={{
                          marginTop: "var(--space-3)",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
                          fontSize: "0.8rem",
                          color: "var(--color-text-muted)",
                          fontStyle: "italic",
                          lineHeight: 1.5,
                        }}
                      >
                        💡 {res.directionReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: "0 24px 24px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "var(--color-accent)",
                    color: "#fff",
                    borderRadius: "10px",
                    fontWeight: 700,
                    fontSize: "1rem",
                    border: "none",
                    cursor: "pointer",
                    transition: "opacity 200ms ease-out",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLButtonElement).style.opacity = "0.88")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLButtonElement).style.opacity = "1")
                  }
                >
                  開始練習
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
