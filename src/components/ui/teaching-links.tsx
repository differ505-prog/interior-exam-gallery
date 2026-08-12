"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Link2, Plus, X, ExternalLink } from "lucide-react";

type TeachingLinksProps = {
  /** 試卷代碼，用於 localStorage key */
  sheetCode: string;
  /** 初始連結（來自 Supabase） */
  initialLinks?: string[];
  /** 透視圖允許 2 欄，其餘 1 欄 */
  maxLinks: 1 | 2;
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

export function TeachingLinks({ sheetCode, initialLinks = [], maxLinks }: TeachingLinksProps) {
  const [links, setLinks] = useState<string[]>(() => {
    const saved = loadLinks(sheetCode);
    return saved.length > 0 ? saved : initialLinks;
  });
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const canAdd = links.length < maxLinks;

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!isValidUrl(trimmed)) {
      setError("請輸入有效的網址");
      return;
    }
    if (links.includes(trimmed)) {
      setError("連結已存在");
      return;
    }
    const next = [...links, trimmed];
    setLinks(next);
    saveLinks(sheetCode, next);
    setDraft("");
    setError("");
  };

  const handleRemove = (url: string) => {
    const next = links.filter((l) => l !== url);
    setLinks(next);
    saveLinks(sheetCode, next);
    setError("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === "Escape") {
      setDraft("");
      setError("");
    }
  };

  return (
    <div className="teaching-links">
      <div className="teaching-links__header">
        <span className="teaching-links__icon">
          <Link2 size={15} />
        </span>
        <span className="teaching-links__label">教學資源</span>
        <span className="teaching-links__count">
          {links.length}/{maxLinks}
        </span>
      </div>

      {/* 連結清單 */}
      {links.length > 0 && (
        <ul className="teaching-links__list">
          {links.map((url) => (
            <li key={url} className="teaching-links__item">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="teaching-links__link"
                title={url}
              >
                <ExternalLink size={13} className="teaching-links__link-icon" />
                <span className="teaching-links__link-text">
                  {url.replace(/^https?:\/\//, "").slice(0, 48)}
                  {url.length > 56 ? "…" : ""}
                </span>
              </a>
              <button
                className="teaching-links__remove"
                onClick={() => handleRemove(url)}
                aria-label={`移除連結 ${url}`}
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 輸入區 */}
      {canAdd ? (
        <div className="teaching-links__input-row">
          <div className="teaching-links__input-wrap">
            <input
              ref={inputRef}
              type="url"
              className={`teaching-links__input ${error ? "teaching-links__input--error" : ""}`}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="貼上 YouTube 或其他教學連結"
              enterKeyHint="done"
            />
            {draft && (
              <button
                className="teaching-links__clear"
                onClick={() => {
                  setDraft("");
                  setError("");
                  inputRef.current?.focus();
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
            onClick={handleAdd}
            disabled={!draft.trim()}
            type="button"
          >
            <Plus size={15} />
          </button>
        </div>
      ) : (
        <p className="teaching-links__max-note">
          已達上限 {maxLinks} 個連結
        </p>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <p className="teaching-links__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
