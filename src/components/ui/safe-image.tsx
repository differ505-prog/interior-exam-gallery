"use client";

import { useState, SyntheticEvent, useEffect } from "react";

type SafeImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  aspectRatio?: string;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  fallbackLabel?: string;
  loading?: "lazy" | "eager";
};

/**
 * SafeImage
 * 統一處理：
 * - 圖片載入失敗 fallback（憲法第 7 條：圖片載入失敗 Fallback）
 * - 預設 lazy + async decoding（憲法第 6 條：SEO / 效能）
 * - 流體 aspect-ratio 避免版面塌陷（憲法第 7 條：禁止絕對固定寬高）
 * - 防衛性編程：處理 undefined src、自動偵測比例調整 object-fit、增加錯誤與載入日誌
 */
export function SafeImage({
  src,
  alt,
  className,
  aspectRatio = "4 / 3",
  objectFit,
  fallbackLabel,
  loading = "lazy",
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [autoObjectFit, setAutoObjectFit] = useState<"cover" | "contain" | null>(null);

  // 防衛性編程 1: src 空值檢查
  useEffect(() => {
    if (!src) {
      console.warn(`[SafeImage] 缺少 src 屬性，無法載入圖片 (alt: "${alt}")`);
      setHasError(true);
    } else {
      setHasError(false);
    }
  }, [src, alt]);

  const handleLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const { naturalWidth, naturalHeight } = img;
    const imgRatio = naturalWidth / naturalHeight;

    // 日誌記錄: 成功載入與尺寸追蹤
    console.info(`[SafeImage] 圖片載入成功: ${src}`, {
      naturalWidth,
      naturalHeight,
      aspectRatio: imgRatio.toFixed(2),
    });

    // 防衛性編程 2: 若未強制指定 objectFit，且圖片長寬比與常見橫式 (4:3) 差異過大 (如直式或極扁)
    // 則自動切換為 contain，避免工程圖面被過度裁切而遺失重點資訊
    if (!objectFit && naturalWidth > 0 && naturalHeight > 0) {
      if (imgRatio < 0.95 || imgRatio > 1.8) {
        console.info(`[SafeImage] 偵測到特殊比例 (${imgRatio.toFixed(2)})，自動將 objectFit 切換為 contain: ${src}`);
        setAutoObjectFit("contain");
      }
    }
  };

  const handleError = () => {
    console.error(`[SafeImage] 圖片載入失敗: ${src}`);
    setHasError(true);
  };

  if (hasError || !src) {
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

  const finalObjectFit = objectFit || autoObjectFit || "cover";

  return (
    <div className="safe-image" style={{ aspectRatio }}>
      <img
        alt={alt}
        className={className}
        decoding="async"
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        src={src}
        style={{ objectFit: finalObjectFit as React.CSSProperties["objectFit"] }}
      />
    </div>
  );
}