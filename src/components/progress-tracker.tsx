"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

const TOTAL_EXAMS = 180;

const CATEGORY_TOTAL = [
  { label: "平面圖", total: 30, key: "plan" },
  { label: "天花與立面", total: 120, key: "ceiling-elevation" },
  { label: "透視圖", total: 18, key: "perspective" },
  { label: "大樣圖", total: 12, key: "detail" },
] as const;

function normalizeCode(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, "");
}

export function ProgressTracker() {
  const [stats, setStats] = useState({ practiced: 0, total: TOTAL_EXAMS });
  const [categoryStats, setCategoryStats] = useState<
    Record<string, { practiced: number; total: number }>
  >({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/uploads");
        if (!res.ok) return;
        const data = await res.json();
        const uploads: Array<{ sheetCode: string; category: string }> = data.uploads ?? [];

        const practicedCodes = new Set(
          uploads.map((u) => normalizeCode(u.sheetCode))
        );
        setStats({ practiced: practicedCodes.size, total: TOTAL_EXAMS });

        const uploadsByCategory: Record<string, Set<string>> = {
          plan: new Set(),
          "ceiling-elevation": new Set(),
          perspective: new Set(),
          detail: new Set(),
        };

        uploads.forEach((u) => {
          const code = normalizeCode(u.sheetCode);
          if (/^(201|202|203|204|205|206)[a-e]$/i.test(code)) {
            uploadsByCategory.plan.add(code);
          } else if (/^(201|202|203|204|205|206)[a-e](天花|客立|餐立|臥立)$/.test(code)) {
            uploadsByCategory["ceiling-elevation"].add(code);
          } else if (/^(207|208|209|210|211|212)[甲乙丙]$/.test(code)) {
            uploadsByCategory.perspective.add(code);
          } else if (/^2(13|14|15|16|17|18|19|20|21|22|23|24)$/.test(code)) {
            uploadsByCategory.detail.add(code);
          }
        });

        const byCategory: Record<string, { practiced: number; total: number }> = {};
        CATEGORY_TOTAL.forEach(({ total, key }) => {
          byCategory[key] = {
            practiced: uploadsByCategory[key].size,
            total,
          };
        });
        setCategoryStats(byCategory);
      } catch {
        // ignore
      }
    }
    load();
  }, []);

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
