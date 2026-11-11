"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, FileText, Image as ImageIcon } from "lucide-react";
import { ArchiveItem, UploadEntry } from "@/types/exam";
import { ExamNoteCategory } from "@/types/exam-note";
import { ArchiveDetailModal } from "@/components/archive-detail-modal";
import { getLocalNote } from "@/lib/user-data";
import { summarizeCardUploads } from "@/lib/upload-summary";

type ArchiveCardProps = {
  item: ArchiveItem;
  sectionSlug: string;
  uploads?: UploadEntry[];
  allUploads?: UploadEntry[];
  examNotes?: ExamNoteCategory[];
  onDeleteEntry?: (id: string) => Promise<void>;
};

/**
 * ArchiveCard
 * 從原本 archive-section.tsx 抽離出來的可複用卡片，
 * 加入 hover 微互動 + 流體排版防溢出，並加入點擊開啟題目與練習圖面詳情 Modal 的功能。
 */
export function ArchiveCard({ item, sectionSlug, uploads = [], allUploads = [], examNotes, onDeleteEntry }: ArchiveCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [noteSnippet, setNoteSnippet] = useState<string>("");
  const [thumbFailed, setThumbFailed] = useState(false);
  const uploadSummary = summarizeCardUploads(uploads);
  const hasNote = noteSnippet.trim().length > 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  // 監聽速記本更新，即時反應在卡片徽章上
  useEffect(() => {
    const updateNote = () => {
      const note = getLocalNote(item.code);
      setNoteSnippet(note);
    };
    updateNote();

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ sheetCode?: string; note?: string }>;
      if (!customEvent.detail || customEvent.detail.sheetCode === item.code) {
        updateNote();
      }
    };
    window.addEventListener("scratch-note-updated", handler);
    window.addEventListener("storage", updateNote);
    return () => {
      window.removeEventListener("scratch-note-updated", handler);
      window.removeEventListener("storage", updateNote);
    };
  }, [item.code]);

  // Listen for dismiss-modal events from ArchiveDetailModal and close the modal
  useEffect(() => {
    const handler = () => setIsOpen(false);
    window.addEventListener("dismiss-modal", handler);
    return () => window.removeEventListener("dismiss-modal", handler);
  }, []);

  return (
    <>
      <article
        className={`archive-card clickable-card${
          uploadSummary.hasMyPractice
            ? " archive-card--uploaded"
            : uploadSummary.hasUpload
              ? " archive-card--has-ref"
              : ""
        }${hasNote ? " archive-card--has-note" : ""}`}
        key={`${sectionSlug}-${item.code}`}
        onClick={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`${item.code} ${hasNote ? "含速記要點 " : ""}${
          uploadSummary.hasMyPractice
            ? `已上傳 ${uploadSummary.myImageCount} 張我的練習圖`
            : uploadSummary.hasUpload
              ? `含 ${uploadSummary.refImageCount} 張參考圖`
              : "尚未上傳練習圖"
        }`}
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
            {hasNote && (
              <span
                className="archive-card__note-badge"
                title={`速記要點：${noteSnippet.slice(0, 100)}`}
                aria-label={`此小題有速記要點：${noteSnippet.slice(0, 40)}`}
              >
                <FileText size={10} strokeWidth={2.5} />
                <span>要點</span>
                <span className="archive-card__note-tooltip" role="tooltip">
                  <span className="archive-card__note-tooltip-header">
                    <FileText size={10} strokeWidth={2.5} />
                    <span>速記要點</span>
                  </span>
                  <span className="archive-card__note-tooltip-body">
                    {noteSnippet.slice(0, 80)}{noteSnippet.length > 80 ? "…" : ""}
                  </span>
                </span>
              </span>
            )}
            {uploadSummary.hasMyPractice && (
              <span
                className="archive-card__upload-badge archive-card__upload-badge--mine"
                aria-label={`已練 ${uploadSummary.myImageCount} 張`}
              >
                <CheckCircle2 size={11} strokeWidth={2.6} />
                <span>已練 {uploadSummary.myImageCount} 張</span>
              </span>
            )}
            {uploadSummary.refImageCount > 0 && (
              <span
                className="archive-card__upload-badge archive-card__upload-badge--ref"
                aria-label={`含 ${uploadSummary.refImageCount} 張參考圖`}
              >
                <ImageIcon size={10} strokeWidth={2.3} />
                <span>參考 {uploadSummary.refImageCount}</span>
              </span>
            )}
            <span className="archive-card__variants">{item.variants.join(" / ")}</span>
          </div>
        </div>
        <h3 className="archive-card__title">{item.title}</h3>
        <p className="archive-card__focus">{item.focus}</p>
        <small className="archive-card__notes">{item.notes}</small>
        {item.view && (
          <span
            className={`archive-card__view-chip ${
              item.view.endsWith("天")
                ? "archive-card__view-chip--ceiling"
                : "archive-card__view-chip--elevation"
            }`}
            aria-label={`視角：${item.view}`}
          >
            {item.view}
          </span>
        )}
        {uploadSummary.hasUpload && (
          <div
            className={`archive-card__upload-strip ${
              uploadSummary.hasMyPractice
                ? "archive-card__upload-strip--mine"
                : "archive-card__upload-strip--ref"
            }`}
          >
            {uploadSummary.previewImageUrl && !thumbFailed ? (
              <img
                src={uploadSummary.previewImageUrl}
                alt={`${item.code} 已上傳作品縮圖`}
                className="archive-card__upload-thumb"
                width={36}
                height={27}
                loading="lazy"
                onError={() => setThumbFailed(true)}
              />
            ) : (
              <span className="archive-card__upload-thumb-fallback" aria-hidden="true">
                <ImageIcon size={14} strokeWidth={2} />
              </span>
            )}
            <div className="archive-card__upload-strip-text">
              <span className="archive-card__upload-strip-status">
                {uploadSummary.hasMyPractice
                  ? `已上傳練習（${uploadSummary.myImageCount} 張）`
                  : `參考／標記圖（${uploadSummary.refImageCount} 張）`}
              </span>
              {uploadSummary.latestTitle && (
                <span className="archive-card__upload-strip-title">
                  {uploadSummary.latestTitle}
                </span>
              )}
            </div>
          </div>
        )}
      </article>

      {isOpen && (
        <ArchiveDetailModal
          item={item}
          uploads={uploads}
          allUploads={allUploads.length > 0 ? allUploads : uploads}
          sectionSlug={sectionSlug}
          examNotes={examNotes}
          onClose={() => setIsOpen(false)}
          onDelete={onDeleteEntry}
        />
      )}
    </>
  );
}