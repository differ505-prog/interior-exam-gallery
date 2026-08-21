"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dices } from "lucide-react";
import { SurfacePanel } from "@/components/ui/primitives";
import { examSections } from "@/data/exam-content";
import { drawExam, countPracticePerItem, DrawGroup, DrawResult } from "@/hooks/use-exam-draw";
import { ArchiveDetailModal } from "@/components/archive-detail-modal";
import { examNotes } from "@/data/exam-notes";
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

/** 組合區塊 slug */
const GROUP_SECTIONS: Record<DrawGroup, string[]> = {
  "plan-ceiling-elevation": ["plan", "ceiling-elevation"],
  "perspective-detail": ["perspective", "detail"],
};

export function ExamDrawSection() {
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [drawnResult, setDrawnResult] = useState<DrawResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  // 只在掛載時 fetch 一次（避免每次抽題都重複 fetch）
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch("/api/uploads/all")
      .then((r) => r.json())
      .then((data: { entries?: UploadEntry[] }) => {
        setUploads(data.entries ?? []);
      })
      .catch(() => {
        // fetch 失敗：降級為空陣列，不中斷抽題
        setUploads([]);
      });
  }, []);

  /** 從組合 slug 推斷 sectionSlug（用於 Modal 渲染） */
  const inferSectionSlug = useCallback((item: ArchiveItem): string => {
    for (const section of examSections) {
      if (section.items.some((i) => i.code === item.code)) {
        return section.slug;
      }
    }
    return "plan";
  }, []);

  /** 點擊抽題按鈕 */
  const handleDraw = useCallback(
    (group: DrawGroup) => {
      const sectionSlugs = GROUP_SECTIONS[group];

      // 收集該組合所有試卷項目
      const allItems: ArchiveItem[] = [];
      for (const section of examSections) {
        if (sectionSlugs.includes(section.slug)) {
          allItems.push(...section.items);
        }
      }

      const practiceCountMap = countPracticePerItem(allItems, uploads);
      const result = drawExam(allItems, practiceCountMap);

      if (!result) {
        alert(
          `${GROUP_META[group].title}\n所有題目練習次數已達 5 次以上，本輪練習完成！\n\n建議：進入備考複盤，整理扣分點。`
        );
        return;
      }

      setDrawnResult(result);
      setShowModal(true);

      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug("[ExamDrawSection] 抽出試卷", {
          code: result.item.code,
          practiceCount: result.practiceCount,
          group,
        });
      }
    },
    [uploads]
  );

  const sectionSlug = drawnResult ? inferSectionSlug(drawnResult.item) : "plan";
  const sectionExamNotes = examNotes.filter((cat) => cat.slug === sectionSlug);

  return (
    <>
      <SurfacePanel ariaLabel="抽題練習" className="exam-draw-panel" id="exam-draw">
        {/* Hero */}
        <div className="exam-draw-hero">
          <p className="eyebrow">🎲 Exam Draw</p>
          <h2 className="heading heading--h2 exam-draw-hero__title">抽題練習</h2>
          <p className="exam-draw-hero__subtitle">
            每次從最少練習次數的題目中抽取，確保均衡覆蓋所有試卷。
          </p>
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

      {/* 抽出結果 Modal */}
      {showModal && drawnResult && (
        <ArchiveDetailModal
          item={drawnResult.item}
          uploads={uploads}
          sectionSlug={sectionSlug}
          examNotes={sectionExamNotes}
          onClose={() => {
            setShowModal(false);
            setDrawnResult(null);
          }}
        />
      )}
    </>
  );
}
