"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Maximize2 } from "lucide-react";
import { SheetDoc } from "@/types/sheet";
import { getPerspectiveMarkers } from "@/data/perspective-markers";
import { SafeImage } from "@/components/ui/safe-image";

type ZoomLevel = "fit" | "medium" | "large";
type ViewMode = "reader" | "compare";

type SheetReaderProps = {
  /** 試卷文件（通常 1-2 頁） */
  doc: SheetDoc;
  /** 開啟 lightbox 的回調 */
  onOpenLightbox?: (url: string, pageIndex: number) => void;
  /** 誠實佔位時的建檔進度敘述 */
  coverage?: string;
  /** 無法讀取時的替代描述 */
  unarchivedMessage?: string;
};

/**
 * SheetReader — 試卷閱讀器
 *
 * 設計：
 * - 單一試卷文件呈現（替代舊的兩欄並排 question + requirement grid）
 * - 分頁導航：左右箭頭 + 頁碼指示器 + 縮圖列
 * - 滿寬顯示：max-width: 912px（現行 446px 的 2.05 倍）+ object-fit: contain
 * - 翻面比較：長按按鈕可在正/背面間快速翻頁，保持縮放倍率與平移位置同步
 * - 自動偵測圖片比例，必要時切換 contain
 */
export function SheetReader({ doc, onOpenLightbox, coverage, unarchivedMessage }: SheetReaderProps) {
  const { pages, code } = doc;

  const [activePage, setActivePage] = useState(0);
  const [zoom, setZoom] = useState<ZoomLevel>("fit");
  const [viewMode, setViewMode] = useState<ViewMode>("reader");
  const [holdTimer, setHoldTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const activePageRef = useRef(activePage);
  activePageRef.current = activePage;

  const totalPages = pages.length;
  const currentPage = pages[activePage];

  const markers = getPerspectiveMarkers(code);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        if (e.key === "ArrowLeft") {
          setActivePage((p) => Math.max(0, p - 1));
        } else {
          setActivePage((p) => Math.min(totalPages - 1, p + 1));
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [totalPages]);

  const handlePrev = useCallback(() => {
    setActivePage((p) => Math.max(0, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    setActivePage((p) => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

  // 長按翻面（快速在正/背面間來回）
  const handleMouseDown = useCallback(() => {
    const timer = setTimeout(() => {
      setActivePage((p) => (p === 0 ? 1 : 0));
    }, 400);
    setHoldTimer(timer);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      setHoldTimer(null);
    }
  }, [holdTimer]);

  if (!doc || pages.length === 0) {
    return (
      <div className="sheet-reader--empty">
        <p className="sheet-reader--empty__code">{code}</p>
        <p className="sheet-reader--empty__msg">
          {unarchivedMessage ?? "題目圖紙建置中，掃描建檔後會自動顯示。"}
        </p>
        {coverage && (
          <p className="sheet-reader--empty__coverage">{coverage}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`sheet-reader sheet-reader--${viewMode}`}
      role="region"
      aria-label={`試卷 ${code} 閱讀器`}
    >
      {/* 頁碼指示器 */}
      {totalPages > 1 && (
        <div className="sheet-reader__page-indicator" aria-live="polite" aria-atomic="true">
          <span className="sheet-reader__page-current">{activePage + 1}</span>
          <span className="sheet-reader__page-sep">/</span>
          <span className="sheet-reader__page-total">{totalPages}</span>
          <span className="sheet-reader__page-label">{currentPage.label}</span>
        </div>
      )}

      {/* 主圖區 */}
      <div
        className="sheet-reader__main"
        onClick={() => onOpenLightbox?.(currentPage.url, activePage)}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        role="button"
        tabIndex={0}
        aria-label={`放大查看 ${currentPage.label}（點擊或長按翻面）`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenLightbox?.(currentPage.url, activePage);
          }
        }}
      >
        {/* 方向標註（僅 208 正面顯示） */}
        {activePage === 0 && markers.length > 0 && (
          <div className="sheet-reader__marker-overlay" aria-hidden="true">
            {markers.map((marker) => (
              <div
                key={marker.direction}
                className={`sheet-reader__marker sheet-reader__marker--${marker.vpType === "一消點" ? "1vp" : "2vp"}`}
                style={{
                  top: `${marker.position.top}%`,
                  left: `${marker.position.left}%`,
                  width: `${marker.position.width}%`,
                  height: `${marker.position.height}%`,
                }}
              >
                <span className="sheet-reader__marker-label">
                  {marker.label}
                  <small>{marker.vpType}</small>
                </span>
              </div>
            ))}
          </div>
        )}

        <SafeImage
          src={currentPage.url}
          alt={`${code} ${currentPage.alt}`}
          aspectRatio={viewMode === "compare" ? "4 / 3" : undefined}
          objectFit="contain"
          className={`sheet-reader__img sheet-reader__img--${zoom}`}
          fallbackLabel={currentPage.label}
        />

        {/* 放大提示 */}
        <div className="sheet-reader__zoom-hint" aria-hidden="true">
          <ZoomIn size={20} />
          <span>點擊放大</span>
        </div>

        {/* 翻面提示（僅兩頁時顯示） */}
        {totalPages === 2 && (
          <div className="sheet-reader__flip-hint" aria-hidden="true">
            長按翻面
          </div>
        )}
      </div>

      {/* 縮圖列 */}
      {totalPages > 1 && (
        <div
          className="sheet-reader__thumbs"
          role="tablist"
          aria-label={`${code} 圖頁切換，共 ${totalPages} 頁`}
        >
          {pages.map((page, idx) => (
            <button
              key={idx}
              role="tab"
              aria-selected={idx === activePage}
              aria-controls={`sheet-page-${idx}`}
              className={`sheet-reader__thumb-btn${idx === activePage ? " sheet-reader__thumb-btn--active" : ""}`}
              onClick={() => setActivePage(idx)}
              type="button"
            >
              <SafeImage
                src={page.url}
                alt={`${page.label} 縮圖`}
                aspectRatio="1 / 1"
                objectFit="cover"
                className="sheet-reader__thumb-img"
              />
              <span className="sheet-reader__thumb-label">{page.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 導航控制列 */}
      <div className="sheet-reader__controls">
        {totalPages > 1 && (
          <>
            <button
              className="sheet-reader__nav-btn"
              onClick={handlePrev}
              disabled={activePage === 0}
              aria-label="上一頁"
              type="button"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="sheet-reader__nav-btn"
              onClick={handleNext}
              disabled={activePage === totalPages - 1}
              aria-label="下一頁"
              type="button"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Zoom 控制 */}
        <div className="sheet-reader__zoom-btns" role="group" aria-label="縮放控制">
          {(["fit", "medium", "large"] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              className={`sheet-reader__zoom-btn${zoom === z ? " sheet-reader__zoom-btn--active" : ""}`}
              onClick={() => setZoom(z)}
              type="button"
              aria-pressed={zoom === z}
            >
              {z === "fit" ? "符合" : z === "medium" ? "1400" : "2200"}
            </button>
          ))}
        </div>

        {/* 檢視模式切換 */}
        <button
          className="sheet-reader__mode-btn"
          onClick={() => setViewMode((m) => (m === "reader" ? "compare" : "reader"))}
          type="button"
          aria-pressed={viewMode === "compare"}
        >
          <Maximize2 size={16} />
          <span>{viewMode === "compare" ? "閱讀模式" : "比對模式"}</span>
        </button>
      </div>
    </div>
  );
}
