"use client";

import { useState } from "react";
import { SurfacePanel } from "@/components/ui/primitives";
import {
  practicePlanStats,
  practiceStrategies,
  weeklyPlan,
  practiceLog,
  tacticTools,
  examMindsets,
} from "@/data/practice-plan";

type SectionKey = "strategy" | "weekly" | "log" | "tools" | "mindset";

const SECTIONS: Array<{ key: SectionKey; label: string; icon: string }> = [
  { key: "strategy", label: "動態調整邏輯", icon: "🔄" },
  { key: "weekly", label: "週計畫框架", icon: "📅" },
  { key: "log", label: "練習日誌", icon: "📝" },
  { key: "tools", label: "高效工具 SOP", icon: "🛠️" },
  { key: "mindset", label: "考場應變心法", icon: "💡" },
];

export function PracticePlanSection() {
  const [activeSection, setActiveSection] = useState<SectionKey>("strategy");

  return (
    <SurfacePanel
      ariaLabel="3小時動態調控練習計畫書"
      className="practice-plan-panel"
      id="practice-plan"
    >
      {/* Hero 區 */}
      <div className="practice-plan-hero">
        <div className="practice-plan-hero__header">
          <p className="eyebrow">🏆 Practice Plan</p>
          <h2 className="heading heading--h2">室內設計乙級術科：3小時動態調控計畫書</h2>
          <p className="practice-plan-hero__subtitle">
            專為「每天只有 3 小時」且「筆試已達 100 分」的考生設計。
            採用「動態滾動機制」，結合「結構廣度優先」原則，確保在有限時間內掌握最多題型。
          </p>
        </div>

        {/* 統計卡 */}
        <dl className="practice-plan-stats" aria-label="練習計畫統計">
          <div className="practice-plan-stat">
            <dt>啟動日期</dt>
            <dd>{practicePlanStats.startDate}</dd>
          </div>
          <div className="practice-plan-stat">
            <dt>累計時數</dt>
            <dd>
              {practicePlanStats.totalHours}
              <span className="practice-plan-stat__unit"> 小時</span>
            </dd>
          </div>
          <div className="practice-plan-stat">
            <dt>有效通報天</dt>
            <dd>
              {practicePlanStats.loggedDays.length}
              <span className="practice-plan-stat__unit"> 天</span>
            </dd>
          </div>
          <div className="practice-plan-stat practice-plan-stat--highlight">
            <dt>筆試實力</dt>
            <dd>✅ {practicePlanStats.writtenScore}</dd>
          </div>
        </dl>
      </div>

      {/* Tab 切換 */}
      <div className="practice-plan-tabs" role="tablist" aria-label="計畫書章節">
        {SECTIONS.map((section) => (
          <button
            key={section.key}
            role="tab"
            aria-selected={activeSection === section.key}
            aria-controls={`plan-${section.key}`}
            className={`practice-plan-tab${activeSection === section.key ? " practice-plan-tab--active" : ""}`}
            onClick={() => setActiveSection(section.key)}
          >
            <span className="practice-plan-tab__icon">{section.icon}</span>
            <span className="practice-plan-tab__label">{section.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 內容 */}
      <div
        className="practice-plan-body"
        id={`plan-${activeSection}`}
        role="tabpanel"
        aria-label={SECTIONS.find((s) => s.key === activeSection)?.label}
      >
        {activeSection === "strategy" && <StrategySection />}
        {activeSection === "weekly" && <WeeklySection />}
        {activeSection === "log" && <LogSection />}
        {activeSection === "tools" && <ToolsSection />}
        {activeSection === "mindset" && <MindsetSection />}
      </div>
    </SurfacePanel>
  );
}

function StrategySection() {
  return (
    <div className="practice-plan-strategy">
      <p className="practice-plan-section-desc">
        根據你的反饋，我們將練習重心從「完整完稿」轉向「核心突破」。以下 4 個策略同步運作。
      </p>
      <div className="practice-plan-strategy-grid">
        {practiceStrategies.map((strategy) => (
          <article key={strategy.id} className="practice-plan-strategy-card">
            <h3 className="practice-plan-strategy-card__title">{strategy.title}</h3>
            <p className="practice-plan-strategy-card__desc">{strategy.description}</p>
            <div className="practice-plan-strategy-card__tactic">
              <span className="practice-plan-strategy-card__tactic-label">戰術</span>
              <p>{strategy.tactic}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function WeeklySection() {
  return (
    <div className="practice-plan-weekly">
      <p className="practice-plan-section-desc">
        基礎計畫框架，隨時滾動更新。「掌握重點優先」，並預留「調整彈性」兼顧記憶效力。
      </p>
      <div className="practice-plan-weekly-table-wrap">
        <table className="practice-plan-weekly-table" aria-label="週計畫">
          <thead>
            <tr>
              <th>星期</th>
              <th>場次</th>
              <th>預定目標</th>
              <th>練習重點</th>
              <th>調整彈性</th>
            </tr>
          </thead>
          <tbody>
            {weeklyPlan.map((day) => (
              <tr key={day.day}>
                <td className="practice-plan-weekly-table__day">{day.dayLabel}</td>
                <td>
                  <span className={`practice-plan-session-badge practice-plan-session-badge--${day.session}`}>
                    {day.session}場
                  </span>
                </td>
                <td className="practice-plan-weekly-table__goal">{day.goal}</td>
                <td>{day.focus}</td>
                <td className="practice-plan-weekly-table__adjust">{day.adjustment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LogSection() {
  return (
    <div className="practice-plan-log">
      <p className="practice-plan-section-desc">
        回歸原始日期的練習進度與動態調整日誌。標示「(待定)」之項目待回報後更新。
      </p>
      <div className="practice-plan-log-list">
        {practiceLog.map((entry, index) => (
          <article key={index} className="practice-plan-log-card">
            <header className="practice-plan-log-card__header">
              <span className="practice-plan-log-card__date">{entry.date}</span>
              <h3 className="practice-plan-log-card__topic">{entry.topic}</h3>
              <span className="practice-plan-log-card__mode">{entry.mode}</span>
            </header>
            <div className="practice-plan-log-card__body">
              <div className="practice-plan-log-card__row">
                <span className="practice-plan-log-card__label">每日通報進度</span>
                <p>{entry.progress}</p>
              </div>
              <div className="practice-plan-log-card__row">
                <span className="practice-plan-log-card__label">AI 建議</span>
                <p>{entry.aiAdvice}</p>
              </div>
              <div className="practice-plan-log-card__row">
                <span className="practice-plan-log-card__label">隔日調整</span>
                <p>{entry.nextDayAdjustment}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ToolsSection() {
  return (
    <div className="practice-plan-tools">
      <p className="practice-plan-section-desc">高效工具與戰術 SOP，專門對付 3 小時考試的時間壓力。</p>
      <div className="practice-plan-tools-grid">
        {tacticTools.map((tool) => (
          <article key={tool.id} className="practice-plan-tool-card">
            <h3 className="practice-plan-tool-card__title">{tool.title}</h3>
            <p className="practice-plan-tool-card__desc">{tool.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function MindsetSection() {
  return (
    <div className="practice-plan-mindset">
      <p className="practice-plan-section-desc">考場上的最後防線：心態對了，手才不會抖。</p>
      <div className="practice-plan-mindset-list">
        {examMindsets.map((mindset) => (
          <article key={mindset.id} className="practice-plan-mindset-card">
            <h3 className="practice-plan-mindset-card__title">{mindset.title}</h3>
            <p className="practice-plan-mindset-card__desc">{mindset.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
