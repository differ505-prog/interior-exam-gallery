"use client";

import { useState } from "react";
import { ArchiveItem, UploadEntry } from "@/types/exam";
import { ArchiveDetailModal } from "@/components/archive-detail-modal";

type ArchiveCardProps = {
  item: ArchiveItem;
  sectionSlug: string;
  uploads?: UploadEntry[];
};

/**
 * ArchiveCard
 * 從原本 archive-section.tsx 抽離出來的可複用卡片，
 * 加入 hover 微互動 + 流體排版防溢出，並加入點擊開啟題目與練習圖面詳情 Modal 的功能。
 */
export function ArchiveCard({ item, sectionSlug, uploads = [] }: ArchiveCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <>
      <article
        className="archive-card clickable-card"
        key={`${sectionSlug}-${item.code}`}
        onClick={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        style={{ cursor: "pointer" }}
      >
        <div className="archive-card-top">
          <p className="archive-card__code">{item.code}</p>
          <span className="archive-card__variants">{item.variants.join(" / ")}</span>
        </div>
        <h3 className="archive-card__title">{item.title}</h3>
        <p className="archive-card__focus">{item.focus}</p>
        <small className="archive-card__notes">{item.notes}</small>
      </article>

      {isOpen && (
        <ArchiveDetailModal
          item={item}
          uploads={uploads}
          sectionSlug={sectionSlug}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}