"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { ArchiveItem, UploadEntry } from "@/types/exam";
import { ExamNoteCategory } from "@/types/exam-note";
import { ArchiveDetailModal } from "@/components/archive-detail-modal";

type ArchiveCardProps = {
  item: ArchiveItem;
  sectionSlug: string;
  uploads?: UploadEntry[];
  examNotes?: ExamNoteCategory[];
  onDeleteEntry?: (id: string) => Promise<void>;
};

/**
 * ArchiveCard
 * 從原本 archive-section.tsx 抽離出來的可複用卡片，
 * 加入 hover 微互動 + 流體排版防溢出，並加入點擊開啟題目與練習圖面詳情 Modal 的功能。
 */
export function ArchiveCard({ item, sectionSlug, uploads = [], examNotes, onDeleteEntry }: ArchiveCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasUpload = uploads.length > 0;
  const uploadCount = uploads.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  // Listen for dismiss-modal events from ArchiveDetailModal and close the modal
  useEffect(() => {
    const handler = () => setIsOpen(false);
    window.addEventListener("dismiss-modal", handler);
    return () => window.removeEventListener("dismiss-modal", handler);
  }, []);

  return (
    <>
      <article
        className={`archive-card clickable-card${hasUpload ? " archive-card--uploaded" : ""}`}
        key={`${sectionSlug}-${item.code}`}
        onClick={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`${item.code} ${hasUpload ? `已上傳 ${uploadCount} 張練習圖` : "尚未上傳練習圖"}`}
        style={{ cursor: "pointer" }}
      >
        <div className="archive-card-top">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <p className="archive-card__code">{item.code}</p>
            {/^[0-9]{3}[甲乙丙]$/.test(item.code) && (
              <span
                style={{
                  fontSize: "0.6rem",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                  color: "var(--color-accent)",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {item.code.endsWith("甲") ? "一消點" : "二消點"}
              </span>
            )}
          </div>
          <div className="archive-card-top-right">
            {hasUpload && (
              <span className="archive-card__upload-badge" aria-hidden="true">
                <Check size={10} strokeWidth={2.5} />
                {uploadCount}
              </span>
            )}
            <span className="archive-card__variants">{item.variants.join(" / ")}</span>
          </div>
        </div>
        <h3 className="archive-card__title">{item.title}</h3>
        <p className="archive-card__focus">{item.focus}</p>
        <small className="archive-card__notes">{item.notes}</small>
        {item.view && (
          <span className="archive-card__view-chip" aria-label={`視角：${item.view}`}>
            {item.view}
          </span>
        )}
      </article>

      {isOpen && (
        <ArchiveDetailModal
          item={item}
          uploads={uploads}
          sectionSlug={sectionSlug}
          examNotes={examNotes}
          onClose={() => setIsOpen(false)}
          onDelete={onDeleteEntry}
        />
      )}
    </>
  );
}