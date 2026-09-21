"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";

const TOTAL_EXAMS = 180;

const CATEGORY_TOTAL = [
  { label: "平面圖", total: 30, key: "plan" },
  { label: "天花與立面", total: 120, key: "ceiling-elevation" },
  { label: "透視圖", total: 18, key: "perspective" },
  { label: "大樣圖", total: 12, key: "detail" },
] as const;

type RawUpload = { sheetCode: string; category: string; kind: string };

function normalizeCode(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, "");
}

/** 將上傳資料歸類到四大章節，回傳各章節的「獨立練習題號集合」 */
function bucketUploads(uploads: RawUpload[]) {
  const byCode = new Set(
    uploads
      .filter((u) => u.kind === "我的練習圖")
      .map((u) => normalizeCode(u.sheetCode))
  );

  const buckets: Record<string, Set<string>> = {
    plan: new Set(),
    "ceiling-elevation": new Set(),
    perspective: new Set(),
    detail: new Set(),
  };

  byCode.forEach((code) => {
    // 透視圖：207–212 + 中文版本（甲/乙/丙）
    if (/^(207|208|209|210|211|212)(甲|乙|丙)$/.test(code)) {
      buckets.perspective.add(code);
      return;
    }
    // 天花板與立面圖：201–206 + A–E + (天花/客立/餐立/臥立)
    if (/^(201|202|203|204|205|206)[a-e](天花|客立|餐立|臥立)$/i.test(code)) {
      buckets["ceiling-elevation"].add(code);
      return;
    }
    // 平面圖 201–206 + A–E（純英文字母版本）
    if (/^(201|202|203|204|205|206)[a-e]$/i.test(code)) {
      buckets.plan.add(code);
      return;
    }
    // 大樣圖 213–224
    if (/^2(13|14|15|16|17|18|19|20|21|22|23|24)$/.test(code)) {
      buckets.detail.add(code);
    }
  });

  return { byCode, buckets };
}

export function ProgressTracker() {
  const [stats, setStats] = useState({ practiced: 0, total: TOTAL_EXAMS });
  const [categoryStats, setCategoryStats] = useState<
    Record<string, { practiced: number; total: number }>
  >({});
  // 透過改變這個 ref 來觸發 reload effect
  const reloadKeyRef = useRef(0);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    reloadKeyRef.current += 1;
    setReloadKey(reloadKeyRef.current);
  }, []);

  // 訂閱全域事件：上傳 / 刪除後立即重新計算完成度
  useEffect(() => {
    const handler = () => reload();
    window.addEventListener("uploads-changed", handler);
    return () => window.removeEventListener("uploads-changed", handler);
  }, [reload]);

  // 首次載入 + 收到 reload 訊號時重新 fetch /api/uploads/all
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/uploads/all");
        const data = (await res.json().catch(() => ({}))) as { entries?: RawUpload[] };
        if (cancelled) return;
        const uploads = data.entries ?? [];
        const { byCode, buckets } = bucketUploads(uploads);

        setStats({ practiced: byCode.size, total: TOTAL_EXAMS });
        const byCategory: Record<string, { practiced: number; total: number }> = {};
        CATEGORY_TOTAL.forEach(({ total, key }) => {
          byCategory[key] = { practiced: buckets[key].size, total };
        });
        setCategoryStats(byCategory);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const pct = Math.round((stats.practiced / stats.total) * 100);
  const isEmpty = stats.practiced === 0;

  return (
    <div className="progress-tracker">
      <div className="progress-tracker__header">
        <div className="progress-tracker__title-row">
          <TrendingUp size={15} aria-hidden="true" />
          <span className="progress-tracker__label">備考上膛進度</span>
        </div>
        <div className="progress-tracker__summary">
          <span className="progress-tracker__count">{stats.practiced}</span>
          <span className="progress-tracker__denom">/{stats.total}</span>
          <span className="progress-tracker__pct">{pct}%</span>
        </div>
      </div>

      <div className="progress-tracker__bar-wrap">
        <div
          className="progress-tracker__bar"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="備考進度"
        />
      </div>

      {isEmpty && (
        <p className="progress-tracker__hint">
          上傳第一張練習圖，進度就會開始追蹤
        </p>
      )}

      {!isEmpty && (
        <div className="progress-tracker__cats">
          {CATEGORY_TOTAL.map(({ label, key }) => {
            const cat = categoryStats[key];
            const practiced = cat?.practiced ?? 0;
            const total = cat?.total ?? 0;
            const catPct = total > 0 ? Math.round((practiced / total) * 100) : 0;
            return (
              <div key={key} className="progress-tracker__cat">
                <div className="progress-tracker__cat-meta">
                  <span className="progress-tracker__cat-label">{label}</span>
                  <span className="progress-tracker__cat-val">
                    {practiced}/{total}
                  </span>
                </div>
                <div className="progress-tracker__cat-bar">
                  <div
                    className="progress-tracker__cat-fill"
                    style={{ width: `${catPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
