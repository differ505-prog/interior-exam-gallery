"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dices, X } from "lucide-react";
import { SurfacePanel } from "@/components/ui/primitives";
import { examSections } from "@/data/exam-content";
import {
  drawExamGroup,
  countPracticePerItem,
  DrawGroup,
  DrawResult,
  calcCECategoryBalance,
  getCEDrawingType,
  CECategoryBalance,
  buildWeightedCEPool,
} from "@/hooks/use-exam-draw";
import { ArchiveItem, UploadEntry } from "@/types/exam";

/** 試卷組合標題 */
const GROUP_META: Record<DrawGroup, { title: string; subtitle: string }> = {
  "plan-ceiling-elevation": {
    title: "平面圖試卷",
    subtitle: "平面圖＋天花/立面圖（最少練習優先）",
  },
  "perspective-detail": {
    title: "透視＋大樣圖",
    subtitle: "透視圖＋大樣圖（最少練習優先）",
  },
};

export function ExamDrawSection() {
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [drawnResults, setDrawnResults] = useState<DrawResult[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ceBalance, setCeBalance] = useState<CECategoryBalance>({
    ceilingCount: 0,
    elevationCount: 0,
    diff: 0,
    lean: "balanced",
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
          (item) => getCEDrawingType(item.code) === "ceiling"
        );
        const elevationPool = allCeItems.filter(
          (item) => getCEDrawingType(item.code) === "elevation"
        );
        setCeBalance(calcCECategoryBalance(entries, ceilingPool, elevationPool));
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

      let results: DrawResult[] = [];

      if (group === "plan-ceiling-elevation") {
        // ── 自訂 CE 平衡抽題邏輯 ──────────────────────
        const planItems =
          examSections.find((s) => s.slug === "plan")?.items ?? [];
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
            (item) => getCEDrawingType(item.code) === "ceiling"
          );
          const elevationPool = matchingCeItems.filter(
            (item) => getCEDrawingType(item.code) === "elevation"
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
            } as DrawResult;
          })();

          results = ceResult
            ? [planResult, ceResult]
            : [planResult];
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

      // ── 同步更新 CE 平衡顯示 ──────────────────────
      const allCeItems =
        examSections.find((s) => s.slug === "ceiling-elevation")?.items ?? [];
      const ceilingPool = allCeItems.filter(
        (item) => getCEDrawingType(item.code) === "ceiling"
      );
      const elevationPool = allCeItems.filter(
        (item) => getCEDrawingType(item.code) === "elevation"
      );
      setCeBalance(calcCECategoryBalance(uploads, ceilingPool, elevationPool));

      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug("[ExamDrawSection] 抽出試卷", {
          results: results.map((r) => ({
            code: r.item.code,
            count: r.practiceCount,
          })),
          group,
          ceBalance: ceBalance.lean,
        });
      }
    },
    [uploads, ceBalance]
  );

  // 計算平衡儀百分比
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
        <div className="ce-balance-indicator" aria-label="天花板與立面圖練習平衡狀態">
          <div className="balance-bar">
            <span className="bar-label">
              <span className="bar-label__type">天花</span>
              <span className="bar-label__count">{ceBalance.ceilingCount}</span>
            </span>
            <div className="bar-track" role="progressbar" aria-valuenow={Math.round(ceilingPct)} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="bar-fill bar-fill--ceiling"
                style={{ width: `${ceilingPct}%` }}
              />
            </div>
            <span className="bar-label">
              <span className="bar-label__type">立面</span>
              <span className="bar-label__count">{ceBalance.elevationCount}</span>
            </span>
          </div>
          {ceBalance.lean !== "balanced" && (
            <p className="balance-hint">
              → 下一題傾向：
              {ceBalance.lean === "ceiling" ? "立面圖" : "天花板圖"}
            </p>
          )}
        </div>

        {/* 抽題按鈕 */}
        <div className="exam-draw-buttons" role="group" aria-label="抽題組合">
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

      {/* 抽出結果 Modal (考試抽題專用，不破梗) */}
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
                      padding: "16px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "12px",
                      background: "var(--color-theme)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        className="draw-result-code"
                        style={{
                          fontSize: "1.2rem",
                          fontWeight: 600,
                          color: "var(--color-accent)",
                        }}
                      >
                        {res.item.code}
                      </span>
                      <span
                        className="draw-result-meta"
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        目前練習次數：{res.practiceCount} 次
                      </span>
                    </div>
                    <h3
                      className="draw-result-title"
                      style={{
                        fontSize: "1.1rem",
                        margin: "0 0 8px 0",
                        color: "var(--color-text)",
                      }}
                    >
                      {res.item.title}
                    </h3>
                    <p
                      className="draw-result-focus"
                      style={{
                        margin: 0,
                        fontSize: "0.95rem",
                        color: "var(--color-text-muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      重點提示：{res.item.focus}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="draw-result-actions"
                style={{
                  padding: "0 24px 24px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <button
                  className="modal-cta-btn"
                  onClick={() => setShowModal(false)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "var(--color-accent)",
                    color: "white",
                    borderRadius: "8px",
                    fontWeight: 600,
                  }}
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
