import { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  ariaLabel?: string;
};

/**
 * SurfacePanel
 * 共用面板容器。取代散落的 .hero-panel / .intro-panel / .archive-block 等區塊 class，
 * 統一繼承同一套 glass / shadow / radius 設計語言。
 */
export function SurfacePanel({ children, className, id, ariaLabel }: PanelProps) {
  const merged = ["surface-panel", className].filter(Boolean).join(" ");
  return (
    <section aria-label={ariaLabel} className={merged} id={id}>
      {children}
    </section>
  );
}

type EyebrowProps = {
  children: ReactNode;
  tone?: "default" | "muted";
};

/**
 * Eyebrow
 * 統一全站的「小標題」排版元件，避免每次重新散寫 letter-spacing / uppercase。
 */
export function Eyebrow({ children, tone = "default" }: EyebrowProps) {
  const toneClass = tone === "muted" ? "eyebrow eyebrow--muted" : "eyebrow";
  return <p className={toneClass}>{children}</p>;
}

type HeadingProps = {
  level: 1 | 2 | 3;
  children: ReactNode;
  id?: string;
  className?: string;
};

/**
 * Heading
 * 統一 H1-H3 標題樣式與語意層級，禁止使用 H4 以下作為語意結構性標題。
 */
export function Heading({ level, children, id, className }: HeadingProps) {
  const Tag = (`h${level}` as const) as keyof Pick<
    React.JSX.IntrinsicElements,
    "h1" | "h2" | "h3"
  >;
  const sizeClass = `heading heading--h${level}`;
  const merged = [sizeClass, className].filter(Boolean).join(" ");
  return (
    <Tag className={merged} id={id}>
      {children}
    </Tag>
  );
}

type LinkPillProps = {
  href: string;
  children: ReactNode;
  variant?: "solid" | "ghost";
  ariaLabel?: string;
};

/**
 * LinkPill
 * 圓角按鈕風格的導覽連結，solid 用於 CTA、ghost 用於次要動作。
 * 統一 hover / active 微互動，符合 Apple 微互動風格。
 */
export function LinkPill({ href, children, variant = "ghost", ariaLabel }: LinkPillProps) {
  const variantClass = variant === "solid" ? "pill pill--solid" : "pill pill--ghost";
  return (
    <a aria-label={ariaLabel} className={variantClass} href={href}>
      {children}
    </a>
  );
}

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  level?: 1 | 2;
  anchor?: string;
};

/**
 * SectionHeading
 * 統一章節開頭（eyebrow + title + 描述）排版，是頁面內最重複的區塊結構之一。
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  level = 2,
  anchor,
}: SectionHeadingProps) {
  return (
    <header className="section-heading">
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading id={anchor} level={level}>
        {title}
      </Heading>
      {description ? <p className="section-heading__desc">{description}</p> : null}
    </header>
  );
}

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/**
 * EmptyState
 * 統一處理「無資料 / 載入失敗」的防禦性 UI，貫徹憲法第 7 條。
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <p className="empty-state__title">{title}</p>
      {description ? <p className="empty-state__desc">{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}

type SkeletonProps = {
  count?: number;
  height?: number;
  ariaLabel?: string;
};

/**
 * SkeletonGrid
 * 載入佔位元素，避免資料未到時版面塌陷。
 */
export function SkeletonGrid({ count = 3, height = 220, ariaLabel = "載入中" }: SkeletonProps) {
  return (
    <div aria-label={ariaLabel} className="skeleton-grid" role="status">
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton-card" key={i} style={{ minHeight: `${height}px` }} />
      ))}
    </div>
  );
}