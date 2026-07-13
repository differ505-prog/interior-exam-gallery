"use client";

import { useState } from "react";
import {
  ExamNote,
  ExamNoteCategory,
} from "@/types/exam-note";

type ExamNotesPanelProps = {
  categories: ExamNoteCategory[];
  /** 只顯示與指定試卷相關的筆記（如 "208甲"） */
  relatedCode?: string;
};

const TYPE_LABEL: Record<string, string> = {
  formula: "公式",
  procedure: "步驟",
  checklist: "檢核",
  table: "數據表",
  note: "備考",
};

const TYPE_COLOR: Record<string, string> = {
  formula: "badge--formula",
  procedure: "badge--procedure",
  checklist: "badge--checklist",
  table: "badge--table",
  note: "badge--note",
};

function NoteCard({ note }: { note: ExamNote }) {
  const [expanded, setExpanded] = useState(false);
  const badgeClass = TYPE_COLOR[note.type] ?? "badge--note";

  return (
    <article className="note-card">
      <header className="note-card__header">
        <div className="note-card__meta">
          <span className={`note-badge ${badgeClass}`}>{TYPE_LABEL[note.type]}</span>
          {note.tags.map((tag) => (
            <span key={tag} className="note-tag">{tag}</span>
          ))}
        </div>
        <button
          className="note-card__toggle"
          onClick={() => setExpanded((p) => !p)}
          aria-expanded={expanded}
          aria-label={expanded ? "收合" : "展開"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`note-card__chevron${expanded ? " note-card__chevron--up" : ""}`}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      <h4 className="note-card__title">{note.title}</h4>

      {/* 內容行（永遠可見） */}
      {note.content.includes("\n") ? (
        <div className="note-card__content note-card__content--multiline">
          {note.content.split("\n").map((line, i) => {
            if (line.startsWith("- ") || line.startsWith("□ ")) {
              return (
                <p key={i} className="note-card__line note-card__line--check">
                  {line}
                </p>
              );
            }
            if (line.startsWith("|")) {
              return (
                <div key={i} className="note-card__table-wrap">
                  <pre className="note-card__table">{line}</pre>
                </div>
              );
            }
            if (line.match(/^\d+\.\s/)) {
              return (
                <p key={i} className="note-card__line note-card__line--step">
                  {line}
                </p>
              );
            }
            return (
              <p key={i} className="note-card__line">
                {line}
              </p>
            );
          })}
        </div>
      ) : (
        <p className="note-card__content">{note.content}</p>
      )}

      {/* 補充說明（展開後顯示） */}
      {note.detail && (
        <div className={`note-card__detail${expanded ? " note-card__detail--visible" : ""}`}>
          <div className="note-card__detail-inner">
            {expanded && <p className="note-card__detail-text">{note.detail}</p>}
          </div>
        </div>
      )}
    </article>
  );
}

function ScaleTable() {
  const table = {
    scale: ["1:12.5", "1:10", "1:20"],
    scaleLabel: ["1/125", "1/100", "1/200"],
    recommendedUse: ["400cm 櫃體、展示櫃", "600cm 整面牆", "1200cm 大尺度空間"],
    paperWidth40m: ["32.0 cm", "40.0 cm", "20.0 cm"],
    paperWidth80m: ["64.0 cm", "80.0 cm", "40.0 cm"],
    note: [
      "最推薦！細節佳，符合術科 30cm 門檻",
      "比例大，細節表現佳",
      "符合術科門檻，比例偏小",
    ],
  };

  return (
    <div className="note-scale-table">
      <div className="note-scale-table__scroll">
        <table className="note-table" aria-label="比例尺速查表">
          <thead>
            <tr>
              <th>比例</th>
              <th>尺面刻度</th>
              <th>適用場景</th>
              <th>400cm 圖面</th>
              <th>800cm 圖面</th>
              <th>備註</th>
            </tr>
          </thead>
          <tbody>
            {table.scale.map((_, i) => (
              <tr key={i} className={i === 0 ? "note-table__row--highlight" : ""}>
                <td className="note-table__cell--primary">{table.scale[i]}</td>
                <td>{table.scaleLabel[i]}</td>
                <td>{table.recommendedUse[i]}</td>
                <td className="note-table__cell--primary">{table.paperWidth40m[i]}</td>
                <td>{table.paperWidth80m[i]}</td>
                <td className="note-table__cell--muted">{table.note[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FormulaBlock() {
  return (
    <div className="note-formula-block">
      <div className="note-formula-block__header">
        <span className="note-badge badge--formula">公式</span>
        <span className="note-formula-block__name">比例投影公式（實體測量法）</span>
      </div>
      <div className="note-formula-block__equation">
        <span>H</span>
        <sub>圖面</sub>
        <span> = </span>
        <span>(H</span>
        <sub>實際</sub>
        <span> × D</span>
        <sub>實測</sub>
        <span>) ÷ 120</span>
      </div>
      <div className="note-formula-block__vars">
        <div className="note-formula-block__var">
          <span className="note-formula-block__sym">H<sub>實際</sub></span>
          <span>現場實際高度（cm）</span>
        </div>
        <div className="note-formula-block__var">
          <span className="note-formula-block__sym">D<sub>實測</sub></span>
          <span>櫃底至 EL 眼平線的垂直高度（cm）</span>
        </div>
      </div>
      <div className="note-formula-block__example">
        <span className="note-formula-block__example-label">實例</span>
        <span>
          90cm 櫃子，D = 6.7cm →{" "}
          <strong>(90 × 6.7) ÷ 120 = 5.025 cm</strong>
        </span>
      </div>
    </div>
  );
}

export function ExamNotesPanel({ categories, relatedCode }: ExamNotesPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>(
    categories[0]?.slug ?? ""
  );

  const current = categories.find((c) => c.slug === activeCategory);

  // 過濾只顯示與 relatedCode 相關的筆記
  const filteredNotes = current?.notes.filter(
    (n) =>
      !relatedCode ||
      !n.relatedCodes ||
      n.relatedCodes.length === 0 ||
      n.relatedCodes.includes(relatedCode)
  );

  if (categories.length === 0) return null;

  return (
    <div className="exam-notes-panel">
      {/* 類別切換 Tab */}
      <div className="exam-notes-panel__tabs" role="tablist">
        {categories.map((cat) => (
          <button
            key={cat.slug}
            role="tab"
            aria-selected={cat.slug === activeCategory}
            aria-controls={`tabpanel-${cat.slug}`}
            className={`exam-notes-tab${cat.slug === activeCategory ? " exam-notes-tab--active" : ""}`}
            onClick={() => setActiveCategory(cat.slug)}
          >
            <span className="exam-notes-tab__icon">{cat.icon}</span>
            <span className="exam-notes-tab__label">{cat.title}</span>
          </button>
        ))}
      </div>

      {/* Tab 內容 */}
      <div
        id={`tabpanel-${current?.slug}`}
        role="tabpanel"
        aria-label={current?.title}
        className="exam-notes-panel__body"
      >
        {current?.description && (
          <p className="exam-notes-panel__desc">{current.description}</p>
        )}

        {/* 特殊：比例尺速查表 */}
        {current?.slug === "scale-tactics" && <ScaleTable />}
        {current?.slug === "scale-tactics" && <FormulaBlock />}

        {/* 一般備考筆記卡片 */}
        {filteredNotes && filteredNotes.length > 0 && (
          <div className="note-card-list">
            {filteredNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
