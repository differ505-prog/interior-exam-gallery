"use client";

import { useState } from "react";

type SafeImageProps = {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  fallbackLabel?: string;
  loading?: "lazy" | "eager";
};

/**
 * SafeImage
 * 統一處理：
 * - 圖片載入失敗 fallback（憲法第 7 條：圖片載入失敗 Fallback）
 * - 預設 lazy + async decoding（憲法第 6 條：SEO / 效能）
 * - 流體 aspect-ratio 避免版面塌陷（憲法第 7 條：禁止絕對固定寬高）
 */
export function SafeImage({
  src,
  alt,
  className,
  aspectRatio = "4 / 3",
  fallbackLabel,
  loading = "lazy",
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        aria-label={fallbackLabel ?? alt}
        className={["safe-image safe-image--fallback", className].filter(Boolean).join(" ")}
        role="img"
        style={{ aspectRatio }}
      >
        <span className="safe-image__fallback-text">{fallbackLabel ?? "圖片無法顯示"}</span>
      </div>
    );
  }

  return (
    <div className="safe-image" style={{ aspectRatio }}>
      <img
        alt={alt}
        className={className}
        decoding="async"
        loading={loading}
        onError={() => setHasError(true)}
        src={src}
      />
    </div>
  );
}