import Link from "next/link";
import { Suspense } from "react";
import { ArchiveSectionBlock } from "@/components/archive-section";
import { UploadStudio } from "@/components/upload-studio";
import { AsyncUploadsSection } from "@/components/recent-uploads-section";
import { PracticePlanSection } from "@/components/practice-plan-section";
import { FloatingTOC } from "@/components/floating-toc";
import { EmptyState, SkeletonGrid, SurfacePanel } from "@/components/ui/primitives";
import { examSections } from "@/data/exam-content";
import { examNotes } from "@/data/exam-notes";

const HERO_DESCRIPTION =
  "術科練習圖紙備份與對應大類對比系統。";

export default function HomePage() {
  return (
    <main id="main-content">
      <SurfacePanel ariaLabel="網站主視覺與導覽" className="hero-panel" id="hero">
        <header className="topbar">
          <div className="topbar__intro">
            <p className="eyebrow">Draft Gallery</p>
            <h1 className="heading heading--h1">
              術科圖庫，從閱讀到複盤。
            </h1>
          </div>
        </header>

        <div className="hero-grid">
          <article className="hero-copy">
            <p>{HERO_DESCRIPTION}</p>
            <div className="hero-actions" role="group" aria-label="主要動作">
              <Link aria-label="建立複盤牆" className="solid-link" href="#upload-studio">
                建立複盤牆
              </Link>
              <Link
                aria-label="上傳"
                className="ghost-link"
                href="#upload-studio"
              >
                上傳
              </Link>
              <Link
                aria-label="最近上傳"
                className="ghost-link"
                href="#recent-uploads"
              >
                最近上傳
              </Link>
            </div>
          </article>
        </div>

        <dl aria-label="題庫規模" className="metric-row">
          <div className="metric-card">
            <dt className="metric-card__label">平面圖版本</dt>
            <dd className="metric-card__value">30</dd>
          </div>
          <div className="metric-card">
            <dt className="metric-card__label">透視視角</dt>
            <dd className="metric-card__value">18</dd>
          </div>
          <div className="metric-card">
            <dt className="metric-card__label">大樣節點</dt>
            <dd className="metric-card__value">12</dd>
          </div>
          <div className="metric-card">
            <dt className="metric-card__label">練習複盤模組</dt>
            <dd className="metric-card__value">遠端同步</dd>
          </div>
        </dl>
      </SurfacePanel>

      <PracticePlanSection />

      <Suspense
        fallback={
          <SurfacePanel ariaLabel="題庫章節載入中">
            <SkeletonGrid ariaLabel="題庫章節載入中" count={6} height={180} />
          </SurfacePanel>
        }
      >
        {examSections.length === 0 ? (
          <SurfacePanel ariaLabel="題庫章節">
            <EmptyState
              description="章節資料建置中。"
              title="章節建置中"
            />
          </SurfacePanel>
        ) : (
          examSections.map((section) => (
            <ArchiveSectionBlock key={section.slug} section={section} examNotes={examNotes} />
          ))
        )}
      </Suspense>

      <UploadStudio />

      <AsyncUploadsSection />

      <FloatingTOC />
    </main>
  );
}