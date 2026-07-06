"use client";

import { useState } from "react";
import { ArchiveSection, UploadEntry } from "@/types/exam";
import { ArchiveCard } from "@/components/archive-card";

type ArchiveSectionClientProps = {
  section: ArchiveSection;
  uploads: UploadEntry[];
};

export function ArchiveSectionClient({ section, uploads }: ArchiveSectionClientProps) {
  const isPlan = section.slug === "plan";
  const isCeilingElevation = section.slug === "ceiling-elevation";
  const isPerspective = section.slug === "perspective";

  // Filter states
  const [selectedPlanQuestion, setSelectedPlanQuestion] = useState<string>("201");
  const [selectedQuestion, setSelectedQuestion] = useState<string>("201");
  const [selectedType, setSelectedType] = useState<string>("全部");
  
  // For perspective, default to 208, options are all 207-212 questions
  const [selectedPerspective, setSelectedPerspective] = useState<string>("208");

  const questions = ["201", "202", "203", "204", "205", "206"];
  const perspectiveQuestions = ["207", "208", "209", "210", "211", "212"];
  const types = ["全部", "天花板配置圖", "客廳立面圖", "餐廳立面圖", "主臥立面圖"];

  // Calculate section stats
  const totalItems = section.items.length;
  const sectionCodes = new Set(section.items.map((item) => item.code.trim().toLowerCase()));
  
  // Only count student's own practices for completion and upload count
  const myUploads = uploads.filter(
    (u) => sectionCodes.has(u.sheetCode.trim().toLowerCase()) && u.kind === "我的練習圖"
  );
  const uploadedCount = myUploads.length;
  
  const completedCodes = new Set(myUploads.map((u) => u.sheetCode.trim().toLowerCase()));
  const completedCount = completedCodes.size;
  const completionRate = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  // Split perspective completion rates
  let onePointRate = 0;
  let twoPointRate = 0;
  if (isPerspective) {
    const endsWithChar = (str: string, char: string) => {
      const normalized = str.trim().toUpperCase();
      return normalized.endsWith(char.toUpperCase());
    };
    
    const onePointItems = section.items.filter((item) => endsWithChar(item.code, "甲"));
    const twoPointItems = section.items.filter((item) => endsWithChar(item.code, "乙") || endsWithChar(item.code, "丙"));
    
    const onePointUploads = myUploads.filter((u) => endsWithChar(u.sheetCode, "甲"));
    const twoPointUploads = myUploads.filter((u) => endsWithChar(u.sheetCode, "乙") || endsWithChar(u.sheetCode, "丙"));
    
    const completedOnePoint = new Set(onePointUploads.map((u) => u.sheetCode.trim().toLowerCase()));
    const completedTwoPoint = new Set(twoPointUploads.map((u) => u.sheetCode.trim().toLowerCase()));
    
    onePointRate = onePointItems.length > 0 ? Math.round((completedOnePoint.size / onePointItems.length) * 100) : 0;
    twoPointRate = twoPointItems.length > 0 ? Math.round((completedTwoPoint.size / twoPointItems.length) * 100) : 0;
  }

  // Filter logic
  const filteredItems = section.items.filter((item) => {
    if (isPlan) {
      return item.code.startsWith(selectedPlanQuestion);
    }

    if (isCeilingElevation) {
      const matchesQuestion = item.code.startsWith(selectedQuestion);
      let matchesType = true;
      if (selectedType === "天花板配置圖") {
        matchesType = item.code.endsWith("天花");
      } else if (selectedType === "客廳立面圖") {
        matchesType = item.code.endsWith("客立");
      } else if (selectedType === "餐廳立面圖") {
        matchesType = item.code.endsWith("餐立");
      } else if (selectedType === "主臥立面圖") {
        matchesType = item.code.endsWith("臥立");
      }
      return matchesQuestion && matchesType;
    }
    
    if (isPerspective) {
      return item.code.startsWith(selectedPerspective);
    }

    return true;
  });

  return (
    <section className="archive-block" id={section.slug}>
      <div className="archive-heading-container">
        <div className="archive-heading">
          <p className="eyebrow">{section.eyebrow}</p>
          <div>
            <h2>{section.title}</h2>
          </div>
        </div>

        <div className="section-stats" aria-label="章節統計資訊">
          <div className="stat-badge">
            <span className="stat-val">{totalItems}</span>
            <span className="stat-lbl">總題數</span>
          </div>
          <div className="stat-badge">
            <span className="stat-val">{uploadedCount}</span>
            <span className="stat-lbl">已上傳</span>
          </div>
          {isPerspective ? (
            <>
              <div className="stat-badge stat-badge--accent">
                <span className="stat-val">{onePointRate}%</span>
                <span className="stat-lbl">一消(甲)</span>
              </div>
              <div className="stat-badge stat-badge--accent">
                <span className="stat-val">{twoPointRate}%</span>
                <span className="stat-lbl">二消(乙丙)</span>
              </div>
            </>
          ) : (
            <div className="stat-badge stat-badge--accent">
              <span className="stat-val">{completionRate}%</span>
              <span className="stat-lbl">完成度</span>
            </div>
          )}
        </div>
      </div>

      {/* Foldable/Collapsible Filters for Plan */}
      {isPlan && (
        <div className="archive-filters" aria-label="平面圖篩選面板">
          <div className="filter-group">
            <span className="filter-label">選擇題號：</span>
            <div className="filter-options">
              {questions.map((q) => (
                <button
                  key={q}
                  className={`filter-btn ${selectedPlanQuestion === q ? "filter-btn--active" : ""}`}
                  onClick={() => setSelectedPlanQuestion(q)}
                  type="button"
                >
                  {q} 題
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Foldable/Collapsible Filters for Ceiling & Elevation */}
      {isCeilingElevation && (
        <div className="archive-filters" aria-label="天花與立面篩選面板">
          <div className="filter-group">
            <span className="filter-label">選擇題號：</span>
            <div className="filter-options">
              {questions.map((q) => (
                <button
                  key={q}
                  className={`filter-btn ${selectedQuestion === q ? "filter-btn--active" : ""}`}
                  onClick={() => setSelectedQuestion(q)}
                  type="button"
                >
                  {q} 題
                </button>
              ))}
            </div>
          </div>
          
          <div className="filter-group">
            <span className="filter-label">圖面種類：</span>
            <div className="filter-options">
              {types.map((t) => (
                <button
                  key={t}
                  className={`filter-btn ${selectedType === t ? "filter-btn--active" : ""}`}
                  onClick={() => setSelectedType(t)}
                  type="button"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Foldable/Collapsible Filters for Perspective (207-212) */}
      {isPerspective && (
        <div className="archive-filters" aria-label="透視圖篩選面板">
          <div className="filter-group">
            <span className="filter-label">選擇題號：</span>
            <div className="filter-options">
              {perspectiveQuestions.map((q) => (
                <button
                  key={q}
                  className={`filter-btn ${selectedPerspective === q ? "filter-btn--active" : ""}`}
                  onClick={() => setSelectedPerspective(q)}
                  type="button"
                >
                  {q} 題
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="archive-grid">
        {filteredItems.map((item) => {
          const matchedUploads = uploads.filter(
            (u) => u.sheetCode.trim().toLowerCase() === item.code.trim().toLowerCase()
          );
          return (
            <ArchiveCard
              item={item}
              key={`${section.slug}-${item.code}`}
              sectionSlug={section.slug}
              uploads={matchedUploads}
            />
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="archive-empty">
          <p>此類別目前尚無練習或圖面資料。</p>
        </div>
      )}
    </section>
  );
}
