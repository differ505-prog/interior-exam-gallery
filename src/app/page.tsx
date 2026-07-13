import Link from "next/link";
import { Suspense } from "react";
import { ArchiveSectionBlock } from "@/components/archive-section";
import { UploadStudio } from "@/components/upload-studio";
import { AsyncUploadsSection } from "@/components/recent-uploads-section";
import { EmptyState, SkeletonGrid, SurfacePanel } from "@/components/ui/primitives";
import { examSections } from "@/data/exam-content";
import { examNotes } from "@/data/exam-notes";

const chapterLinks = [
  { href: "#plan", label: "平面圖" },
  { href: "#ceiling-elevation", label: "天花與立面" },
  { href: "#perspective", label: "透視圖" },
  { href: "#detail", label: "大樣圖" },
] as const;

const actionLinks = [
  { href: "#upload-studio", label: "上傳", variant: "ghost" as const },
  { href: "#recent-uploads", label: "最近上傳", variant: "ghost" as const },
] as const;

const metrics = [
  { label: "平面圖版本", value: "30" },
  { label: "透視視角", value: "18" },
  { label: "大樣節點", value: "12" },
  { label: "練習複盤模組", value: "遠端同步" },
] as const;

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
          <nav aria-label="章節快速導覽" className="topbar__nav">
            <ul className="topbar__nav-list">
              {chapterLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <div className="hero-grid">
          <article className="hero-copy">
            <p>{HERO_DESCRIPTION}</p>
            <div className="hero-actions" role="group" aria-label="主要動作">
              <Link aria-label="建立複盤牆" className="solid-link" href="#upload-studio">
                建立複盤牆
              </Link>
              {actionLinks.map((link) => (
                <Link
                  aria-label={link.label}
                  className="ghost-link"
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </article>
        </div>

        <dl aria-label="題庫規模" className="metric-row">
          {metrics.map((metric) => (
            <div className="metric-card" key={metric.label}>
              <dt className="metric-card__label">{metric.label}</dt>
              <dd className="metric-card__value">{metric.value}</dd>
            </div>
          ))}
        </dl>
      </SurfacePanel>

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
    </main>
  );
}