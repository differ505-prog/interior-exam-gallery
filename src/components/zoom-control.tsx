"use client";

import { Minus, Plus } from "lucide-react";
import {
  ZoomLevel,
  ZOOM_SCALE_OPTIONS,
  getNextZoomLevel,
  getPrevZoomLevel,
} from "@/lib/zoom-scale";

export interface ZoomControlProps {
  /** 目前縮放檔位 */
  zoom: ZoomLevel;
  /** 變更縮放回調 */
  onZoomChange: (level: ZoomLevel) => void;
  /** 呈現模式：嵌入閱讀器 (reader) 或 全螢幕燈箱 (lightbox) */
  variant?: "reader" | "lightbox";
  /** 是否顯示快速微調步進按鈕（預設 true） */
  showStepper?: boolean;
  /** 自訂外層 class */
  className?: string;
}

/**
 * ZoomControl — 9+ 分級圖面縮放控制器
 *
 * 具備：
 * 1. 6 階尺度切換（符合 / 1000 / 1200 / 1400 / 1800 / 2200）
 * 2. 左右 - / + 微步進按鈕，解決使用者不想精確點按數字的直覺人體工學
 * 3. 語意清晰之 Tooltip，說明各檔位最佳使用場景（如 1200px 舒適閱讀甜蜜點）
 * 4. 完整的無障礙標記（ARIA roles, aria-pressed, keyboard focus）
 */
export function ZoomControl({
  zoom,
  onZoomChange,
  variant = "reader",
  showStepper = true,
  className = "",
}: ZoomControlProps) {
  const isMin = zoom === "fit";
  const isMax = zoom === "2200";

  return (
    <div
      className={`zoom-control zoom-control--${variant} ${className}`.trim()}
      role="group"
      aria-label="題目圖面縮放控制"
    >
      {showStepper && (
        <button
          type="button"
          className="zoom-control__step-btn zoom-control__step-btn--minus"
          onClick={(e) => {
            e.stopPropagation();
            onZoomChange(getPrevZoomLevel(zoom));
          }}
          disabled={isMin}
          aria-label={isMin ? "已是最小檢視尺寸" : `縮小一階至 ${getPrevZoomLevel(zoom)}`}
          title={isMin ? "已是最小檢視尺寸 (符合視窗)" : `縮小一階 (目前 ${zoom})`}
        >
          <Minus size={14} strokeWidth={2.2} />
        </button>
      )}

      <div className="zoom-control__segments">
        {ZOOM_SCALE_OPTIONS.map((opt) => {
          const isActive = zoom === opt.level;
          return (
            <button
              key={opt.level}
              type="button"
              className={`zoom-control__btn${
                isActive ? " zoom-control__btn--active" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onZoomChange(opt.level);
              }}
              aria-pressed={isActive}
              title={`${opt.title} · ${opt.description}`}
            >
              <span className="zoom-control__btn-label">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {showStepper && (
        <button
          type="button"
          className="zoom-control__step-btn zoom-control__step-btn--plus"
          onClick={(e) => {
            e.stopPropagation();
            onZoomChange(getNextZoomLevel(zoom));
          }}
          disabled={isMax}
          aria-label={isMax ? "已是最大檢視尺寸" : `放大一階至 ${getNextZoomLevel(zoom)}`}
          title={isMax ? "已是最大檢視尺寸 (2200px)" : `放大一階 (目前 ${zoom})`}
        >
          <Plus size={14} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}
