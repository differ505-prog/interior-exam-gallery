"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Check, CheckCircle2, Circle, Clock, Flame, Sparkles, RotateCcw, Ban } from "lucide-react";
import { SurfacePanel } from "@/components/ui/primitives";
import { SPRINT_DAYS_META, SPRINT_TASKS } from "@/data/sprint-tasks";
import { SprintDay, SprintCategory } from "@/types/sprint";
import {
  loadCompletedTasks,
  toggleTaskInStorage,
  calculateDaySprintStats,
  calculateOverallSprintStats,
  SPRINT_STORAGE_KEY,
} from "@/lib/sprint-storage";

/** 分類色彩標籤映射 */
const CATEGORY_COLORS: Record<
  SprintCategory,
  { bg: string; text: string; border: string }
> = {
  立面圖: {
    bg: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
    text: "var(--color-accent)",
    border: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
  },
  大樣圖: {
    bg: "rgba(59, 130, 246, 0.1)",
    text: "#2563eb",
    border: "rgba(59, 130, 246, 0.25)",
  },
  透視圖: {
    bg: "rgba(147, 51, 234, 0.1)",
    text: "#7c3aed",
    border: "rgba(147, 51, 234, 0.25)",
  },
  平面圖: {
    bg: "rgba(16, 185, 129, 0.1)",
    text: "#059669",
    border: "rgba(16, 185, 129, 0.25)",
  },
  "文具/拜文昌": {
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#d97706",
    border: "rgba(245, 158, 11, 0.3)",
  },
  考前整備: {
    bg: "rgba(107, 114, 128, 0.1)",
    text: "var(--color-text)",
    border: "var(--color-border)",
  },
};

export function SprintChecklistSection() {
  const [activeDay, setActiveDay] = useState<SprintDay>("11/09");
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  // 載入 localStorage
  useEffect(() => {
    setCompletedMap(loadCompletedTasks());
    setMounted(true);
  }, []);

  // 切換任務完成狀態
  const handleToggleTask = useCallback((taskId: string) => {
    const updated = toggleTaskInStorage(taskId);
    setCompletedMap(updated);
  }, []);

  // 一鍵重設當前天（防禦性確認）
  const handleResetDay = useCallback(() => {
    if (!window.confirm(`確定要重設 ${activeDay} 的任務勾選狀態嗎？`)) return;
    const current = loadCompletedTasks();
    const dayTasks = SPRINT_TASKS.filter((t) => t.day === activeDay);
    const updated = { ...current };
    for (const t of dayTasks) {
      if (t.defaultCompleted) {
        updated[t.id] = true;
      } else {
        delete updated[t.id];
      }
    }
    try {
      localStorage.setItem(SPRINT_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    setCompletedMap(updated);
  }, [activeDay]);

  // 當前日任務清單
  const currentTasks = useMemo(
    () => SPRINT_TASKS.filter((t) => t.day === activeDay),
    [activeDay]
  );

  // 當日統計
  const dayStats = useMemo(
    () => calculateDaySprintStats(activeDay, SPRINT_TASKS, completedMap),
    [activeDay, completedMap]
  );

  // 3天總體統計
  const overallStats = useMemo(
    () => calculateOverallSprintStats(SPRINT_TASKS, completedMap),
    [completedMap]
  );

  const activeMeta = useMemo(
    () => SPRINT_DAYS_META.find((m) => m.day === activeDay)!,
    [activeDay]
  );

  return (
    <SurfacePanel
      ariaLabel="考前 72 小時衝刺看板"
      className="sprint-panel"
      id="sprint-playbook"
    >
      {/* 頂部 Header */}
      <div className="sprint-hero">
        <div className="sprint-hero__header">
          <div className="sprint-hero__eyebrow-row">
            <p className="eyebrow sprint-hero__eyebrow">
              <Flame className="sprint-hero__icon" size={14} />
              72H SPRINT PLAYBOOK
            </p>
            <span className="sprint-hero__badge">9.8 終極定案版</span>
          </div>
          <h2 className="heading heading--h2 sprint-hero__title">
            考前 72 小時衝刺看板
          </h2>
          <p className="sprint-hero__subtitle">
            倒數計時 · 每日 25min × 8 顆番茄磚 · 點擊卡片即時自動儲存打勾
          </p>
        </div>

        {/* 總體進度指示卡 */}
        <div className="sprint-hero__stats">
          <div className="sprint-stat-card">
            <span className="sprint-stat-card__label">全期總進度</span>
            <span className="sprint-stat-card__value">
              {overallStats.completedTasks}
              <span className="sprint-stat-card__unit">
                / {overallStats.totalTasks}
              </span>
            </span>
            <div className="sprint-mini-track">
              <div
                className="sprint-mini-fill"
                style={{ width: `${overallStats.progressPercent}%` }}
              />
            </div>
          </div>
          <div className="sprint-stat-card">
            <span className="sprint-stat-card__label">番茄磚完成</span>
            <span className="sprint-stat-card__value">
              {overallStats.completedBricks}
              <span className="sprint-stat-card__unit">/ 24 磚</span>
            </span>
            <span className="sprint-stat-card__hint">
              {overallStats.progressPercent}% 達成率
            </span>
          </div>
        </div>
      </div>

      {/* 日期切換 Tab 膠囊列 */}
      <div
        className="sprint-tabs"
        role="tablist"
        aria-label="衝刺日程切換"
      >
        {SPRINT_DAYS_META.map((meta) => {
          const stats = calculateDaySprintStats(
            meta.day,
            SPRINT_TASKS,
            completedMap
          );
          const isActive = activeDay === meta.day;
          return (
            <button
              key={meta.day}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`sprint-tab${isActive ? " sprint-tab--active" : ""}`}
              onClick={() => setActiveDay(meta.day)}
            >
              <div className="sprint-tab__head">
                <span className="sprint-tab__day">{meta.day}</span>
                <span className="sprint-tab__weekday">
                  {meta.weekday} ({meta.countdown})
                </span>
              </div>
              <div className="sprint-tab__foot">
                <span className="sprint-tab__badge">{meta.badge}</span>
                <span className="sprint-tab__progress">
                  {stats.completedBricks}/8 磚
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 當日戰略摘要橫幅 */}
      <div className="sprint-day-banner">
        <div className="sprint-day-banner__info">
          <div className="sprint-day-banner__title-row">
            <span className="sprint-day-banner__tag">{activeMeta.countdown} 焦點</span>
            <h3 className="sprint-day-banner__title">{activeMeta.focus}</h3>
          </div>
          <p className="sprint-day-banner__meta">
            今日進度：
            <strong>
              {dayStats.completedBricks} / {dayStats.totalBricks} 磚
            </strong>
            （共 {dayStats.completedTasks}/{dayStats.totalTasks} 項任務 · {dayStats.progressPercent}%）
          </p>
        </div>

        <div className="sprint-day-banner__actions">
          <button
            type="button"
            className="sprint-reset-btn"
            onClick={handleResetDay}
            title="重設當日任務勾選狀態"
          >
            <RotateCcw size={12} />
            重設進度
          </button>
        </div>
      </div>

      {/* 進度條 */}
      <div
        className="sprint-progress-bar"
        role="progressbar"
        aria-valuenow={dayStats.progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="sprint-progress-fill"
          style={{ width: `${dayStats.progressPercent}%` }}
        />
      </div>

      {/* 任務清單網格 */}
      <div className="sprint-task-list" role="list">
        {currentTasks.map((task) => {
          const isDone = mounted && !!completedMap[task.id];
          const color = CATEGORY_COLORS[task.category];

          return (
            <div
              key={task.id}
              role="listitem"
              className={`sprint-task-card${
                isDone ? " sprint-task-card--completed" : ""
              }${task.isMilestone ? " sprint-task-card--milestone" : ""}${
                task.isErrand ? " sprint-task-card--errand" : ""
              }`}
              onClick={() => handleToggleTask(task.id)}
            >
              {/* 勾選核取紐 */}
              <button
                type="button"
                className={`sprint-checkbox${
                  isDone ? " sprint-checkbox--checked" : ""
                }`}
                aria-checked={isDone}
                role="checkbox"
                aria-label={`標記 ${task.title} 為${isDone ? "未完成" : "已完成"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleTask(task.id);
                }}
              >
                {isDone ? (
                  <Check size={14} className="sprint-checkbox__icon" />
                ) : (
                  <Circle size={14} className="sprint-checkbox__icon-blank" />
                )}
              </button>

              {/* 卡片本體內容 */}
              <div className="sprint-task-content">
                <div className="sprint-task-meta-row">
                  {/* 分類標籤 */}
                  <span
                    className="sprint-pill sprint-pill--category"
                    style={{
                      background: color.bg,
                      color: color.text,
                      borderColor: color.border,
                    }}
                  >
                    {task.category}
                  </span>

                  {/* 番茄磚 / 標記 */}
                  {task.isMilestone && (
                    <span className="sprint-pill sprint-pill--milestone">
                      <Sparkles size={11} />
                      晨間首戰已達成
                    </span>
                  )}
                  {task.brickNumber && (
                    <span className="sprint-pill sprint-pill--brick">
                      🍅 磚 {task.brickNumber}
                    </span>
                  )}
                  {task.isErrand && (
                    <span className="sprint-pill sprint-pill--errand">
                      ☕ 實體中場
                    </span>
                  )}

                  {/* 時長 */}
                  <span className="sprint-pill sprint-pill--duration">
                    <Clock size={11} />
                    {task.duration}
                  </span>

                  {/* 關聯試卷 */}
                  {task.sheetCode && (
                    <span className="sprint-pill sprint-pill--sheet">
                      {task.sheetCode}
                    </span>
                  )}
                </div>

                <h4 className="sprint-task-title">{task.title}</h4>
                <p className="sprint-task-desc">{task.description}</p>
                {task.stopBoundary && (
                  <div className="sprint-task-boundary">
                    <span className="sprint-task-boundary__label">
                      <Ban size={11} className="sprint-task-boundary__icon" />
                      不用做到底：
                    </span>
                    <span className="sprint-task-boundary__text">
                      {task.stopBoundary}
                    </span>
                  </div>
                )}
              </div>

              {/* 右側狀態小字 */}
              <div className="sprint-task-state">
                {isDone ? (
                  <span className="sprint-state-tag sprint-state-tag--done">
                    <CheckCircle2 size={13} />
                    已完成
                  </span>
                ) : (
                  <span className="sprint-state-tag sprint-state-tag--todo">
                    待執行
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SurfacePanel>
  );
}
