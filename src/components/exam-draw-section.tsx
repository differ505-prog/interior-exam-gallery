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
  buildWeightedCEPool,
  calcPerspectiveBalance,
  PerspectiveBalance,
  ExtendedDrawResult,
} from "@/hooks/use-exam-draw";
import { countPracticePerItem } from "@/lib/practice-stats";
import { ArchiveItem, UploadEntry } from "@/types/exam";

/** 試卷組合標題 */
const GROUP_META: Record<DrawGroup, { title: string; subtitle: string }> = {
  "plan-ceiling-elevation": {
    title: "平面圖＋CE（天/立）",
    subtitle: "平面圖＋天花板/立面圖，池級平衡（最少練習優先）",
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
  const [perspBalance, setPerspBalance] = useState<PerspectiveBalance>({
    directionCounts: { 甲: 0, 乙: 0, 丙: 0 },
    totalCount: 0,
    directionShares: { 甲: 0, 乙: 0, 丙: 0 },
    directionDeficits: { 甲: 0, 乙: 0, 丙: 0 },
    lean: "balanced",
    completedDirections: [],
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
        // ── 自訂 CE 平衡抽題邏輯 ──────────────────────
        const planResult = drawExamGroup(
          "plan-ceiling-elevation",
          practiceCountMap
        )[0];
        if (!planResult) {
          results = [];
        } else {
          const baseCode = planResult.item.code;
          const allCeItems =
            examSections.find((s) => s.slug === "ceiling-elevation")?.items ??
            [];
          const matchingCeItems = allCeItems.filter((item) =>
            item.code.startsWith(baseCode)
          );

          const ceilingPool = matchingCeItems.filter(
            (item) => getCEDrawingType(item) === "ceiling"
          );
          const elevationPool = matchingCeItems.filter(
            (item) => getCEDrawingType(item) === "elevation"
          );

          // 根據總量平衡，取加權池
          const weightedPool = buildWeightedCEPool(
            ceilingPool,
            elevationPool,
            ceBalance.lean
          );

          // 從加權池中抽一張（最少練習優先）
          const EXCLUDED_THRESHOLD = 5;
          const ceResult = (() => {
            const eligible = weightedPool.filter(
              (item) =>
                (practiceCountMap[item.code] ?? 0) < EXCLUDED_THRESHOLD
            );
            if (eligible.length === 0) return null;
            const minCount = Math.min(
              ...eligible.map((item) => practiceCountMap[item.code] ?? 0)
            );
            const least = eligible.filter(
              (item) => (practiceCountMap[item.code] ?? 0) === minCount
            );
            return {
              item: least[Math.floor(Math.random() * least.length)],
              practiceCount: minCount,
            } as ExtendedDrawResult;
          })();

          results = ceResult
            ? [planResult as ExtendedDrawResult, ceResult]
            : [planResult as ExtendedDrawResult];
        }
      } else {
        results = drawExamGroup(group, practiceCountMap);
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
    [uploads, ceBalance, perspBalance]
  );

  // 計算 CE 平衡儀百分比
  const total = ceBalance.ceilingCount + ceBalance.elevationCount;
  const ceilingPct = total > 0 ? (ceBalance.ceilingCount / total) * 100 : 50;

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
        </div>

        {/* 透視圖平衡儀（v2 新增） */}
        <div
          aria-label="透視圖方向練習平衡狀態"
          style={{ marginTop: "var(--space-5)" }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-muted)",
              marginBottom: "var(--space-3)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            透視圖方向
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--space-3)",
            }}
          >
            {(["甲", "乙", "丙"] as const).map((dir) => {
              const count = perspBalance.directionCounts[dir];
              const target = Math.round(perspBalance.totalCount / 3);
              const isLean = perspBalance.lean === dir;
              const isCompleted =
                perspBalance.completedDirections.includes(dir);
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
                        background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
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
            return (
              <button
                key={group}
                className="exam-draw-btn"
                onClick={() => handleDraw(group)}
                disabled={loading}
                aria-label={`抽題：${meta.title}，${meta.subtitle}`}
              >
                <span className="exam-draw-btn__icon" aria-hidden="true">
                  <Dices size={24} />
                </span>
                <span className="exam-draw-btn__label">{meta.title}</span>
                <span className="exam-draw-btn__sub">{meta.subtitle}</span>
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
