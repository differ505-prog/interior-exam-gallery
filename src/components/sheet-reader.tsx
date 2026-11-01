"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn, Maximize2 } from "lucide-react";
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
 * 設計重點（UI/UX 總監精簡版）：
 * - 移除舊版 1/2 頁碼標籤與底部縮圖方塊，消除「題目圖」字樣重複
 * - 頂部採用 Apple / Stripe 風格的極簡分段頁籤（Segmented Control）
 * - 放大主圖可視範圍，底部保留 Zoom 控制與檢視模式切換
 * - 完整保留鍵盤 ← / → 切換與滑鼠長按翻面特性
 */
export function SheetReader({
  doc,
  onOpenLightbox,
  coverage,
  unarchivedMessage,
}: SheetReaderProps) {
  const { pages, code } = doc;

  const [activePage, setActivePage] = useState(0);
  const [zoom, setZoom] = useState<ZoomLevel>("fit");
  const [viewMode, setViewMode] = useState<ViewMode>("reader");
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldFiredRef = useRef(false);

  const totalPages = pages.length;
  const currentPage = pages[activePage];

  const markers = getPerspectiveMarkers(code);

  // 鍵盤左右鍵切換頁面
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

  // 清除長按計時器
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  // 長按翻面（快速在正/背面間來回，僅於兩頁時有效）
  const handleMouseDown = useCallback(() => {
    isHoldFiredRef.current = false;
    if (totalPages > 1) {
      holdTimerRef.current = setTimeout(() => {
        isHoldFiredRef.current = true;
        setActivePage((p) => (p === 0 ? 1 : 0));
      }, 400);
    }
  }, [totalPages]);

  const handleMouseUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (isHoldFiredRef.current) {
      isHoldFiredRef.current = false;
      return;
    }
    onOpenLightbox?.(currentPage.url, activePage);
  }, [currentPage.url, activePage, onOpenLightbox]);

  if (!doc || pages.length === 0) {
    return (
      <div className="sheet-reader--empty">
        <p className="sheet-reader--empty__code">{code}</p>
        <p className="sheet-reader--empty__msg">
          {unarchivedMessage ?? "題目圖紙建置中，掃描建檔後會自動顯示。"}
        </p>
        {coverage && <p className="sheet-reader--empty__coverage">{coverage}</p>}
      </div>
    );
  }

  return (
    <div
      className={`sheet-reader sheet-reader--${viewMode}`}
      role="region"
      aria-label={`試卷 ${code} 閱讀器`}
    >
      {/* 頂部直觀分段頁籤（取代舊 1/2 標籤與底部重複縮圖） */}
      {totalPages > 1 && (
        <div
          className="sheet-reader__segmented-tabs"
          role="tablist"
          aria-label={`${code} 題目圖紙切換`}
        >
          {pages.map((page, idx) => {
            const isActive = idx === activePage;
            const icon =
              page.isAnswer ||
              page.label.includes("需求") ||
              page.label.includes("答案")
                ? "📋"
                : page.label.includes("背面")
                ? "📑"
                : "📐";

            return (
              <button
                key={idx}
                role="tab"
                aria-selected={isActive}
                aria-controls={`sheet-page-${idx}`}
                className={`sheet-reader__tab-btn${
                  isActive ? " sheet-reader__tab-btn--active" : ""
                }`}
                onClick={() => setActivePage(idx)}
                type="button"
              >
                <span className="sheet-reader__tab-icon" aria-hidden="true">
                  {icon}
                </span>
                <span className="sheet-reader__tab-label">{page.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 主圖區 */}
      <div
        className={`sheet-reader__main${
          zoom !== "fit" ? " sheet-reader__main--zoomed" : ""
        }`}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        role="button"
        tabIndex={0}
        aria-label={`放大查看 ${currentPage.label}（點擊放大或長按翻面）`}
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
                className={`sheet-reader__marker sheet-reader__marker--${
                  marker.vpType === "一消點" ? "1vp" : "2vp"
                }`}
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

      {/* 控制列（保留 Zoom 與檢視模式，移除冗餘左右箭頭） */}
      <div className="sheet-reader__controls">
        {/* Zoom 控制 */}
        <div
          className="sheet-reader__zoom-btns"
          role="group"
          aria-label="縮放控制"
        >
          {(["fit", "medium", "large"] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              className={`sheet-reader__zoom-btn${
                zoom === z ? " sheet-reader__zoom-btn--active" : ""
              }`}
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
          onClick={() =>
            setViewMode((m) => (m === "reader" ? "compare" : "reader"))
          }
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
