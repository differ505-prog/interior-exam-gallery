"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Link2, Plus, X, ExternalLink } from "lucide-react";
import { getSheetData, saveTeachingLinks } from "@/lib/user-data";

export type TeachingLinkSlot = {
  label: string;
  placeholder: string;
  /** 允许多个链接（默认只允许一个） */
  multiple?: boolean;
};

type TeachingLinksProps = {
  /** 试卷代码，用于快取 key */
  sheetCode: string;
  /** 初始连结（由 exam-content.ts 静态提供，作为 fallback） */
  initialLinks?: string[];
  /** 每个 slot 有独立的 label + placeholder */
  slots: TeachingLinkSlot[];
};

/** localStorage 索引键（旧格式：扁平数组） */
const LEGACY_ANON_KEY = "draft-gallery-teaching-links";
/** localStorage 索引键（新格式：Record<slotIndex, string[]>） */
const ANON_KEY = "draft-gallery-teaching-links-v2";

/** 旧格式搬迁：将 string[] 迁移为 Record<number, string[]> */
function migrateLegacyLinks(sheetCode: string): Record<number, string[]> {
  try {
    const stored = localStorage.getItem(LEGACY_ANON_KEY);
    if (!stored) return {};
    const all: Record<string, string[]> = JSON.parse(stored);
    const legacy = all[sheetCode];
    if (!legacy || !Array.isArray(legacy)) return {};
    // 将扁平数组每个元素放入对应 slot 索引
    const migrated: Record<number, string[]> = {};
    legacy.forEach((url, i) => {
      if (url) migrated[i] = [url];
    });
    return migrated;
  } catch {
    return {};
  }
}

function loadLinks(sheetCode: string): Record<number, string[]> {
  try {
    const stored = localStorage.getItem(ANON_KEY);
    if (!stored) return migrateLegacyLinks(sheetCode);
    const all: Record<string, Record<number, string[]>> = JSON.parse(stored);
    const found = all[sheetCode];
    if (found && typeof found === "object") return found;
    return migrateLegacyLinks(sheetCode);
  } catch {
    return migrateLegacyLinks(sheetCode);
  }
}

function saveLinks(sheetCode: string, links: Record<number, string[]>) {
  try {
    const stored = localStorage.getItem(ANON_KEY);
    const all: Record<string, Record<number, string[]>> = stored ? JSON.parse(stored) : {};
    all[sheetCode] = links;
    localStorage.setItem(ANON_KEY, JSON.stringify(all));
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

/** 将 Record<number, string[]> 摊平为 string[]（slot 顺序保持） */
function flattenLinks(links: Record<number, string[]>): string[] {
  const maxSlot = Math.max(...Object.keys(links).map(Number), -1);
  const result: string[] = [];
  for (let i = 0; i <= maxSlot; i++) {
    result.push(...(links[i] ?? []));
  }
  return result;
}

export function TeachingLinks({ sheetCode, initialLinks = [], slots }: TeachingLinksProps) {
  // links: 每个 slot index 对应一个 string[]（支援多连结）
  const [links, setLinks] = useState<Record<number, string[]>>({});
  const [initialized, setInitialized] = useState(false);

  // drafts / errors 仍以 slot 为单位（每个 slot 一个输入框）
  const [drafts, setDrafts] = useState<string[]>(() => slots.map(() => ""));
  const [errors, setErrors] = useState<string[]>(() => slots.map(() => ""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      console.info(`[TeachingLinks] 正在载入教学连结 (sheetCode: ${sheetCode})`);
      const data = await getSheetData(sheetCode);
      if (cancelled) return;

      const remoteLinks = data.teachingLinks;

      if (remoteLinks.length > 0) {
        // 远端数据是旧格式 string[]，迁移为新格式
        console.info(`[TeachingLinks] 使用远端同步的连结 (sheetCode: ${sheetCode})`);
        const migrated: Record<number, string[]> = {};
        remoteLinks.forEach((url, i) => {
          if (url) migrated[i] = [url];
        });
        setLinks(migrated);
      } else {
        // 尝试本地新格式 → 旧格式
        const local = loadLinks(sheetCode);
        if (Object.keys(local).length > 0) {
          console.info(`[TeachingLinks] 使用本地连结 (sheetCode: ${sheetCode})`);
          setLinks(local);
        } else {
          // fallback：使用 initialLinks 初始化 slot 0
          console.info(`[TeachingLinks] 使用初始/预设连结 (sheetCode: ${sheetCode})`);
          const init: Record<number, string[]> = {};
          if (initialLinks[0]) init[0] = [initialLinks[0]];
          setLinks(init);
        }
      }
      setInitialized(true);
    })();
    return () => { cancelled = true; };
  }, [sheetCode, slots.length]);

  const handleAdd = async (slotIndex: number) => {
    const trimmed = drafts[slotIndex].trim();
    if (!trimmed) return;
    if (!isValidUrl(trimmed)) {
      setErrors((prev) => { const next = [...prev]; next[slotIndex] = "请输入有效的网址"; return next; });
      return;
    }
    const next: Record<number, string[]> = { ...links };
    if (!next[slotIndex]) next[slotIndex] = [];
    next[slotIndex] = [...next[slotIndex], trimmed];
    setLinks(next);
    setDrafts((prev) => { const d = [...prev]; d[slotIndex] = ""; return d; });
    setErrors((prev) => { const e = [...prev]; e[slotIndex] = ""; return e; });
    // 写入云端（摊平格式） + localStorage（新格式）
    await saveTeachingLinks(sheetCode, next);
    saveLinks(sheetCode, next);
  };

  const handleRemove = async (slotIndex: number, linkIndex: number) => {
    const next: Record<number, string[]> = { ...links };
    if (!next[slotIndex]) return;
    next[slotIndex] = next[slotIndex].filter((_, i) => i !== linkIndex);
    if (next[slotIndex].length === 0) delete next[slotIndex];
    setLinks(next);
    await saveTeachingLinks(sheetCode, next);
    saveLinks(sheetCode, next);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, slotIndex: number) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(slotIndex); }
    if (e.key === "Escape") {
      setDrafts((prev) => { const d = [...prev]; d[slotIndex] = ""; return d; });
      setErrors((prev) => { const e = [...prev]; e[slotIndex] = ""; return e; });
    }
  };

  const handleDraftChange = (value: string, slotIndex: number) => {
    setDrafts((prev) => { const d = [...prev]; d[slotIndex] = value; return d; });
    if (errors[slotIndex]) setErrors((prev) => { const e = [...prev]; e[slotIndex] = ""; return e; });
  };

  if (!initialized) {
    return (
      <div className="teaching-links">
        <div className="teaching-links__header">
          <span className="teaching-links__icon"><Link2 size={15} /></span>
          <span className="teaching-links__label">教学资源</span>
        </div>
      </div>
    );
  }

  return (
    <div className="teaching-links">
      <div className="teaching-links__header">
        <span className="teaching-links__icon">
          <Link2 size={15} />
        </span>
        <span className="teaching-links__label">教学资源</span>
      </div>

      <div className="teaching-links__slots">
        {slots.map((slot, slotIndex) => {
          const slotLinks = links[slotIndex] ?? [];
          const draft = drafts[slotIndex];
          const error = errors[slotIndex];
          const isMultiple = slot.multiple ?? false;
          const hasAnyLink = slotLinks.length > 0;

          return (
            <div key={slotIndex} className="teaching-links__slot">
              <div className="teaching-links__slot-label">
                {slot.label}
              </div>

              {/* 单一连结 slot：已有连结时直接显示，无连结时显示输入框 */}
              {!isMultiple && (
                hasAnyLink ? (
                  <div className="teaching-links__item">
                    <a
                      href={slotLinks[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="teaching-links__link"
                      title={slotLinks[0]}
                    >
                      <ExternalLink size={13} className="teaching-links__link-icon" />
                      <span className="teaching-links__link-text">
                        {slotLinks[0].replace(/^https?:\/\//, "").slice(0, 48)}
                        {slotLinks[0].length > 56 ? "…" : ""}
                      </span>
                    </a>
                    <button
                      className="teaching-links__remove"
                      onClick={() => handleRemove(slotIndex, 0)}
                      aria-label={`移除 ${slot.label}`}
                      type="button"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : null
              )}

              {/* 多连结 slot：列出所有已存连结 + 输入框 */}
              {isMultiple && hasAnyLink && (
                <ul className="teaching-links__list" aria-label={`${slot.label} 列表`}>
                  {slotLinks.map((url, linkIndex) => (
                    <li key={`${slotIndex}-${linkIndex}`} className="teaching-links__item">
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
                        onClick={() => handleRemove(slotIndex, linkIndex)}
                        aria-label={`移除第 ${linkIndex + 1} 個 ${slot.label}`}
                        type="button"
                      >
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* 输入框：单一 slot 无连结时 或 multiple slot 始终显示 */}
              {(!isMultiple && !hasAnyLink) || isMultiple ? (
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
                          setDrafts((prev) => { const d = [...prev]; d[slotIndex] = ""; return d; });
                          setErrors((prev) => { const e = [...prev]; e[slotIndex] = ""; return e; });
                          inputRefs.current[slotIndex]?.focus();
                        }}
                        aria-label="清除输入"
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
              ) : null}

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
