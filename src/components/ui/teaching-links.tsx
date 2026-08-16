"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Link2, Plus, X, ExternalLink } from "lucide-react";

export type TeachingLinkSlot = {
  label: string;
  placeholder: string;
};

type TeachingLinksProps = {
  /** 試卷代碼，用於 localStorage key */
  sheetCode: string;
  /** 初始連結（依序對應每個 slot） */
  initialLinks?: string[];
  /** 每個 slot 有獨立的 label + placeholder */
  slots: TeachingLinkSlot[];
};

const STORAGE_KEY = "draft-gallery-teaching-links";

function loadLinks(sheetCode: string): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const all: Record<string, string[]> = JSON.parse(stored);
    return all[sheetCode] ?? [];
  } catch {
    return [];
  }
}

function saveLinks(sheetCode: string, links: string[]) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const all: Record<string, string[]> = stored ? JSON.parse(stored) : {};
    all[sheetCode] = links;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function TeachingLinks({ sheetCode, initialLinks = [], slots }: TeachingLinksProps) {
  // 初始化：優先取 localStorage，否則取 initialLinks
  const [links, setLinks] = useState<string[]>(() => {
    const saved = loadLinks(sheetCode);
    if (saved.length > 0) return saved;
    // 截斷至 slot 數量
    return slots.map((_, i) => initialLinks[i] ?? "");
  });

  const [drafts, setDrafts] = useState<string[]>(() =>
    slots.map(() => "")
  );
  const [errors, setErrors] = useState<string[]>(() =>
    slots.map(() => "")
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleAdd = (slotIndex: number) => {
    const trimmed = drafts[slotIndex].trim();
    if (!trimmed) return;
    if (!isValidUrl(trimmed)) {
      setErrors((prev) => {
        const next = [...prev];
        next[slotIndex] = "請輸入有效的網址";
        return next;
      });
      return;
    }
    const next = [...links];
    next[slotIndex] = trimmed;
    setLinks(next);
    saveLinks(sheetCode, next);
    setDrafts((prev) => {
      const d = [...prev];
      d[slotIndex] = "";
      return d;
    });
    setErrors((prev) => {
      const e = [...prev];
      e[slotIndex] = "";
      return e;
    });
  };

  const handleRemove = (slotIndex: number) => {
    const next = [...links];
    next[slotIndex] = "";
    setLinks(next);
    saveLinks(sheetCode, next);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, slotIndex: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd(slotIndex);
    }
    if (e.key === "Escape") {
      setDrafts((prev) => {
        const d = [...prev];
        d[slotIndex] = "";
        return d;
      });
      setErrors((prev) => {
        const e = [...prev];
        e[slotIndex] = "";
        return e;
      });
    }
  };

  const handleDraftChange = (value: string, slotIndex: number) => {
    setDrafts((prev) => {
      const d = [...prev];
      d[slotIndex] = value;
      return d;
    });
    if (errors[slotIndex]) {
      setErrors((prev) => {
        const e = [...prev];
        e[slotIndex] = "";
        return e;
      });
    }
  };

  return (
    <div className="teaching-links">
      <div className="teaching-links__header">
        <span className="teaching-links__icon">
          <Link2 size={15} />
        </span>
        <span className="teaching-links__label">教學資源</span>
      </div>

      <div className="teaching-links__slots">
        {slots.map((slot, slotIndex) => {
          const filledUrl = links[slotIndex];
          const draft = drafts[slotIndex];
          const error = errors[slotIndex];

          return (
            <div key={slotIndex} className="teaching-links__slot">
              <div className="teaching-links__slot-label">
                {slot.label}
              </div>

              {filledUrl ? (
                <div className="teaching-links__item">
                  <a
                    href={filledUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="teaching-links__link"
                    title={filledUrl}
                  >
                    <ExternalLink size={13} className="teaching-links__link-icon" />
                    <span className="teaching-links__link-text">
                      {filledUrl.replace(/^https?:\/\//, "").slice(0, 48)}
                      {filledUrl.length > 56 ? "…" : ""}
                    </span>
                  </a>
                  <button
                    className="teaching-links__remove"
                    onClick={() => handleRemove(slotIndex)}
                    aria-label={`移除 ${slot.label}`}
                    type="button"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="teaching-links__input-row">
                  <div className="teaching-links__input-wrap">
                    <input
                      ref={(el) => { inputRefs.current[slotIndex] = el; }}
                      type="url"
                      className={`teaching-links__input ${error ? "teaching-links__input--error" : ""}`}
                      value={draft}
                      onChange={(e) => handleDraftChange(e.target.value, slotIndex)}
                      onKeyDown={(e) => handleKeyDown(e, slotIndex)}
                      placeholder={slot.placeholder}
                      enterKeyHint="done"
                    />
                    {draft && (
                      <button
                        className="teaching-links__clear"
                        onClick={() => {
                          setDrafts((prev) => {
                            const d = [...prev];
                            d[slotIndex] = "";
                            return d;
                          });
                          setErrors((prev) => {
                            const e = [...prev];
                            e[slotIndex] = "";
                            return e;
                          });
                          inputRefs.current[slotIndex]?.focus();
                        }}
                        aria-label="清除輸入"
                        type="button"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <button
                    className="teaching-links__add-btn"
                    onClick={() => handleAdd(slotIndex)}
                    disabled={!draft.trim()}
                    type="button"
                    aria-label={`新增 ${slot.label}`}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              )}

              {error && (
                <p className="teaching-links__error" role="alert">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
