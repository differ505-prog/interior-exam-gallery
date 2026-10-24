"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ArchiveSection, UploadEntry } from "@/types/exam";
import { ExamNoteCategory } from "@/types/exam-note";
import { ArchiveCard } from "@/components/archive-card";

type ArchiveSectionClientProps = {
  section: ArchiveSection;
  uploads: UploadEntry[];
  examNotes?: ExamNoteCategory[];
};

export function ArchiveSectionClient({ section, uploads, examNotes }: ArchiveSectionClientProps) {
  const router = useRouter();

  const handleDeleteEntry = async (id: string) => {
    await fetch(`/api/uploads?id=${id}`, { method: "DELETE" });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("uploads-changed"));
    }
    router.refresh();
  };
  const defaultExpanded = section.slug === "plan";
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const isPlan = section.slug === "plan";
  const isCeilingElevation = section.slug === "ceiling-elevation";
  const isPerspective = section.slug === "perspective";

  // 將上傳紀錄歸屬到當前章節：
  //   - 優先採 sectionSlug（新資料，鎖死）
  //   - 否則用 category 字串對應到章節（向後相容舊資料，避免 202B 立面跑到平面）
  //   - 兩者皆無 → 落入「未分類」，不歸屬任何章節
  const CATEGORY_TO_SECTION_SLUG: Record<string, string> = {
    "平面圖 201-206": "plan",
    "天花板圖 / 立面圖": "ceiling-elevation",
    "透視圖 207-212": "perspective",
    "大樣圖 213-224": "detail",
  };
  const belongsToThisSection = (u: UploadEntry) => {
    if (u.sectionSlug) return u.sectionSlug === section.slug;
    const fromCategory = CATEGORY_TO_SECTION_SLUG[u.category];
    return fromCategory === section.slug;
  };

  // Filter states
  const [selectedPlanQuestion, setSelectedPlanQuestion] = useState<string>("201");
  const [selectedQuestion, setSelectedQuestion] = useState<string>("201");
  const [selectedType, setSelectedType] = useState<string>("全部");
  
  // For perspective, default to 208, options are all 207-212 questions
  const [selectedPerspective, setSelectedPerspective] = useState<string>("208");

  const questions = ["201", "202", "203", "204", "205", "206"];
  const perspectiveQuestions = ["207", "208", "209", "210", "211", "212"];
  const ceilingTypes = ["客廳天花", "餐廳天花", "主臥天花", "全部天花"];
  const elevationTypes = ["客廳立面", "餐廳立面", "主臥立面", "全部立面"];

  // Calculate section stats
  const totalItems = section.items.length;
  
  const isMatch = (uCode: string, iCode: string) => {
    // 移除所有空白與連接號、底線，並轉小寫 (全形半形問題暫不處理，通常使用者會打半形)
    const cleanU = uCode.replace(/[\s\-_]/g, "").toLowerCase();
    const cleanI = iCode.replace(/[\s\-_]/g, "").toLowerCase();
    return cleanU === cleanI || cleanU.includes(cleanI);
  };

  // Only count student's own practices for completion and upload count
  // 雙鍵比對：(sheetCode) + (sectionSlug 或 category 推斷)，避免 202B 平面圖抓到 202B 客廳立面圖
  const myUploads = uploads.filter((u) => {
    const matchesSheet = section.items.some((item) => isMatch(u.sheetCode, item.code));
    const matchesSection = belongsToThisSection(u);
    return matchesSheet && matchesSection && u.kind === "我的練習圖";
  });
  const uploadedCount = myUploads.length;

  const completedKeys = new Set(
    myUploads.map((u) => `${u.sheetCode.trim().toLowerCase()}::${u.sectionSlug ?? section.slug}`)
  );
  const completedCount = completedKeys.size;
  const completionRate = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  // Filter logic
  const filteredItems = section.items.filter((item) => {
    if (isPlan) {
      return item.code.startsWith(selectedPlanQuestion);
    }

    if (isCeilingElevation) {
      const matchesQuestion = item.code.startsWith(selectedQuestion);
      let matchesType = true;
      if (selectedType === "全部") {
        matchesType = true;
      } else if (selectedType === "全部天花" || selectedType === "天花板配置圖") {
        matchesType =
          item.view?.endsWith("天") ||
          item.code.endsWith("客天") ||
          item.code.endsWith("餐天") ||
          item.code.endsWith("臥天") ||
          item.code.endsWith("天花");
      } else if (selectedType === "客廳天花") {
        matchesType =
          item.view === "客天" ||
          item.code.endsWith("客天") ||
          item.code.endsWith("天花");
      } else if (selectedType === "餐廳天花") {
        matchesType =
          item.view === "餐天" ||
          item.code.endsWith("餐天");
      } else if (selectedType === "主臥天花") {
        matchesType =
          item.view === "臥天" ||
          item.code.endsWith("臥天");
      } else if (selectedType === "全部立面") {
        matchesType =
          item.view?.endsWith("立") ||
          item.code.endsWith("客立") ||
          item.code.endsWith("餐立") ||
          item.code.endsWith("臥立");
      } else if (selectedType === "客廳立面" || selectedType === "客廳立面圖") {
        matchesType =
          item.view === "客立" ||
          item.code.endsWith("客立");
      } else if (selectedType === "餐廳立面" || selectedType === "餐廳立面圖") {
        matchesType =
          item.view === "餐立" ||
          item.code.endsWith("餐立");
      } else if (selectedType === "主臥立面" || selectedType === "主臥立面圖") {
        matchesType =
          item.view === "臥立" ||
          item.code.endsWith("臥立");
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
      {/* Collapsible Header */}
      <div className="archive-block__header">
        <div className="archive-block__header-left">
          <p className="eyebrow">{section.eyebrow}</p>
          <h2 className="archive-block__title">{section.title}</h2>
        </div>

        <button
          className="archive-block__toggle"
          onClick={() => setIsExpanded((v) => !v)}
          aria-expanded={isExpanded}
          aria-controls={`${section.slug}-content`}
          type="button"
        >
          <div className="section-stats" aria-label="章節統計資訊">
            <div className="stat-badge">
              <span className="stat-val">{totalItems}</span>
              <span className="stat-lbl">總題數</span>
            </div>
            <div className="stat-badge">
              <span className="stat-val">{uploadedCount}</span>
              <span className="stat-lbl">已上傳</span>
            </div>
            <div className="stat-badge stat-badge--accent">
              <span className="stat-val">{completionRate}%</span>
              <span className="stat-lbl">完成度</span>
            </div>
          </div>
          <ChevronDown
            size={20}
            className={`archive-block__toggle-icon ${isExpanded ? "archive-block__toggle-icon--open" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Collapsible Content */}
      <div
        id={`${section.slug}-content`}
        className={`archive-block__content ${isExpanded ? "archive-block__content--visible" : ""}`}
      >
        {/* Foldable/Collapsible Filters for Plan */}
        {isPlan && isExpanded && (
          <>
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

            {/* 使用引導：標記試卷上傳流程 */}
            <div className="guide-hint" role="note" aria-label="標記試卷上傳說明">
              <p className="guide-hint__text">
                想上傳標記試卷？點擊任一試卷卡 → 詳情 Modal 右側面板「標記試卷」區 → 新增
              </p>
            </div>
          </>
        )}

        {/* Foldable/Collapsible Filters for Ceiling & Elevation */}
        {isCeilingElevation && isExpanded && (
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
                <span className="filter-divider" aria-hidden="true" />
                <button
                  className={`filter-btn ${selectedType === "全部" ? "filter-btn--active" : ""}`}
                  onClick={() => setSelectedType("全部")}
                  type="button"
                >
                  全部圖面
                </button>
              </div>
            </div>

            <div className="filter-group">
              <span className="filter-label">天花板圖：</span>
              <div className="filter-options">
                {ceilingTypes.map((t) => (
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

            <div className="filter-group">
              <span className="filter-label">空間立面：</span>
              <div className="filter-options">
                {elevationTypes.map((t) => (
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
        {isPerspective && isExpanded && (
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
              (u) =>
                isMatch(u.sheetCode, item.code) &&
                belongsToThisSection(u)
            );
            return (
              <ArchiveCard
                item={item}
                key={`${section.slug}-${item.code}`}
                sectionSlug={section.slug}
                uploads={matchedUploads}
                examNotes={examNotes}
                onDeleteEntry={handleDeleteEntry}
              />
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="archive-empty">
            <p>此類別目前尚無練習或圖面資料。</p>
          </div>
        )}
      </div>
    </section>
  );
}
