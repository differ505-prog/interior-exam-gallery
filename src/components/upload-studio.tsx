"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Upload, X, Info, AlertTriangle, CheckCircle } from "lucide-react";
import {
  UPLOAD_CATEGORIES,
  UPLOAD_KINDS,
  SECTION_SLUG_TO_CATEGORY,
  type UploadCategoryValue,
  type UploadKindValue,
} from "@/lib/upload-constants";
import {
  buildSharedRequirementKey,
  parseSharedRequirementKey,
  listAffectedSheetCodes,
  getSharedRequirementSummary,
  type SharedRequirementKey,
} from "@/lib/requirement-resolver";

const categoryOptions = Object.values(UPLOAD_CATEGORIES) as [
  UploadCategoryValue,
  UploadCategoryValue,
  UploadCategoryValue,
  UploadCategoryValue,
];
const kindOptions = Object.values(UPLOAD_KINDS) as [UploadKindValue, UploadKindValue, UploadKindValue];

const MAX_TITLE_LENGTH = 60;
const MAX_TEXTAREA_LENGTH = 500;
const MAX_IMAGES_PER_SUBMISSION = 6;

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function UploadStudio() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isReady, setIsReady] = useState<boolean | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // ─── 共用需求圖上傳狀態 ────────────────────────────────
  const [sharedVariant, setSharedVariant] = useState<string>("A");
  const [sharedSection, setSharedSection] = useState<string>("plan");
  const [sharedPreview, setSharedPreview] = useState<string | null>(null);
  const [sharedFile, setSharedFile] = useState<File | null>(null);
  const [sharedSubmitting, setSharedSubmitting] = useState(false);
  const [sharedMessage, setSharedMessage] = useState<{ text: string; tone: "info" | "error" | "warn" } | null>(null);
  // 409 覆寫確認
  const [pendingOverride, setPendingOverride] = useState<{
    existingUploadAt: string;
    sectionSlug: string;
    variant: string;
    file: File;
    preview: string;
  } | null>(null);
  const sharedVariantRef = useRef<HTMLSelectElement>(null);

  // 檢查是否是第一次使用共用需求圖功能
  const [hasSeenSharedTooltip, setHasSeenSharedTooltip] = useState(false);
  useEffect(() => {
    const seen = localStorage.getItem("shared_req_seen");
    if (seen) setHasSeenSharedTooltip(true);
  }, []);

  const dismissSharedTooltip = () => {
    setHasSeenSharedTooltip(true);
    localStorage.setItem("shared_req_seen", "1");
  };

  // 共用需求圖 variant 選項
  const variantOptions = ["A", "B", "C", "D", "E"];
  const sectionOptions = [
    { value: "plan", label: "平面圖 201-206" },
    { value: "ceiling-elevation", label: "天花板與立面圖" },
  ];

  // Check Supabase readiness before rendering form
  useEffect(() => {
    fetch("/api/uploads/status")
      .then((r) => r.json())
      .then((data: { ready: boolean }) => setIsReady(data.ready))
      .catch(() => setIsReady(false));
  }, []);

  // Autocomplete and suggestion dropdown states
  const [kind, setKind] = useState<string>(UPLOAD_KINDS.MY_PRACTICE);
  const [authorName, setAuthorName] = useState<string>("");
  const [savedAuthors, setSavedAuthors] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load saved authors from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("saved_authors");
      if (saved) {
        setSavedAuthors(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load saved authors", e);
    }
  }, []);

  // Close suggestions list on clicking outside the input area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);
  // Listen for dismiss-modal events (fired by ArchiveDetailModal when user clicks "新增").
  // The modal close animation takes ~300ms, so we delay the scroll until after it completes.
  useEffect(() => {
    const handleDismiss = (e: Event) => {
      const { sheetCode, sectionSlug, category, kind: kindVal } = (e as CustomEvent).detail;
      if (!sheetCode || !formRef.current) return;

      // 優先採用 sectionSlug 鎖死的 category，否則退回 event 帶的 category
      const finalCategory =
        (sectionSlug && SECTION_SLUG_TO_CATEGORY[sectionSlug]) || category;

      const titleInput = formRef.current.querySelector("#title") as HTMLInputElement;
      const sheetCodeInput = formRef.current.querySelector("#sheetCode") as HTMLInputElement;
      const categorySelect = formRef.current.querySelector("#category") as HTMLSelectElement;
      const kindSelect = formRef.current.querySelector("#kind") as HTMLSelectElement;
      const sectionSlugInput = formRef.current.querySelector("#sectionSlug") as HTMLInputElement | null;

      if (sheetCodeInput) sheetCodeInput.value = sheetCode;
      if (categorySelect && finalCategory) categorySelect.value = finalCategory;
      if (sectionSlugInput && sectionSlug) sectionSlugInput.value = sectionSlug;
      if (kindSelect) {
        kindSelect.value = kindVal;
        setKind(kindVal);
      }
      if (kindVal === "我的練習圖") {
        titleInput.value = `${sheetCode} 個人練習`;
      } else if (kindVal === "標記試卷") {
        titleInput.value = `${sheetCode} 標記試卷`;
      } else {
        titleInput.value = `${sheetCode} 作品參考`;
      }
      if (kindVal === "我的練習圖" || kindVal === "標記試卷") {
        setAuthorName("我自己");
      } else {
        setAuthorName("");
      }

      // Wait for modal close animation (~300ms) before scrolling so the form is visible
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    };

    window.addEventListener("dismiss-modal", handleDismiss);
    return () => window.removeEventListener("dismiss-modal", handleDismiss);
  }, []);
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setMessage(null);

    try {
      const formData = new FormData(form);
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "上傳失敗，請稍後再試。");
      }

      // Save author memory on success for others' reference works
      if (kind === "他人作品參考" && authorName.trim()) {
        const trimmed = authorName.trim();
        const current = [...savedAuthors];
        if (!current.includes(trimmed)) {
          const updated = [trimmed, ...current].slice(0, 15);
          setSavedAuthors(updated);
          localStorage.setItem("saved_authors", JSON.stringify(updated));
        }
      }

      form.reset();
      setAuthorName(""); // Reset controlled input
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
      setPreviewUrls([]);
      setMessageTone("info");
      setMessage("完成。已加入圖庫。");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("uploads-changed"));
      }
      router.refresh();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "發生未知錯誤。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviewChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    if (files.length === 0) {
      setPreviewUrls([]);
      return;
    }
    const sliced = files.slice(0, MAX_IMAGES_PER_SUBMISSION);
    setPreviewUrls(sliced.map((f) => URL.createObjectURL(f)));
  };

  const handleRemovePreview = (idx: number) => {
    const target = previewUrls[idx];
    if (target) URL.revokeObjectURL(target);
    const next = previewUrls.filter((_, i) => i !== idx);
    setPreviewUrls(next);
    // 同步清空 input value，否則使用者移除後無法再次挑選同一檔案
    const input = document.getElementById("image") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  // ─── 共用需求圖處理 ───────────────────────────────────
  const handleSharedFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (sharedPreview) URL.revokeObjectURL(sharedPreview);
    const preview = URL.createObjectURL(file);
    setSharedFile(file);
    setSharedPreview(preview);
    setSharedMessage(null);
  };

  const handleSharedRemove = () => {
    if (sharedPreview) URL.revokeObjectURL(sharedPreview);
    setSharedFile(null);
    setSharedPreview(null);
    const input = document.getElementById("shared-requirement-image") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleSharedSubmit = async () => {
    if (!sharedFile) {
      setSharedMessage({ text: "請選擇一張圖片。", tone: "error" });
      return;
    }

    const sectionSlug = sharedSection;
    const variant = sharedVariant;
    const sheetCode = buildSharedRequirementKey({ sectionSlug, variant });

    // 先檢查是否已有共用需求圖（GET /api/uploads/all）
    try {
      const checkRes = await fetch("/api/uploads/all");
      if (checkRes.ok) {
        const data = await checkRes.json() as { entries?: { sheetCode: string }[] };
        const existing = data.entries?.find((e) => e.sheetCode === sheetCode);
        if (existing) {
          // 已有記錄，顯示 409 確認
          setPendingOverride({
            existingUploadAt: "已存在",
            sectionSlug,
            variant,
            file: sharedFile,
            preview: sharedPreview!,
          });
          return;
        }
      }
    } catch {
      // 忽略檢查錯誤，直接上傳
    }

    await doSharedUpload(sectionSlug, variant, sharedFile);
  };

  const doSharedUpload = async (
    sectionSlug: string,
    variant: string,
    file: File,
    confirmOverride = false,
  ) => {
    setSharedSubmitting(true);
    setSharedMessage(null);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("title", `${sectionSlug} ${variant} 共用需求圖`);
    formData.append("sheetCode", buildSharedRequirementKey({ sectionSlug, variant }));
    formData.append("sectionSlug", sectionSlug);
    formData.append("category", SECTION_SLUG_TO_CATEGORY[sectionSlug] || "平面圖 201-206");
    formData.append("kind", UPLOAD_KINDS.MARKED_SHEET);
    formData.append("authorName", "系統管理員");
    formData.append("confirmOverride", String(confirmOverride));

    try {
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const result = await res.json() as { message?: string };

      if (res.status === 409) {
        // 已有舊圖，需確認覆寫
        setPendingOverride({
          existingUploadAt: result.message || "已存在",
          sectionSlug,
          variant,
          file,
          preview: sharedPreview!,
        });
        return;
      }

      if (!res.ok) {
        throw new Error(result.message || "上傳失敗。");
      }

      setSharedMessage({ text: `已上傳至 ${sectionSlug} ${variant} 共用需求圖，受影響試卷已更新。`, tone: "info" });
      handleSharedRemove();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("uploads-changed"));
      }
      router.refresh();
    } catch (err) {
      setSharedMessage({ text: err instanceof Error ? err.message : "上傳失敗。", tone: "error" });
    } finally {
      setSharedSubmitting(false);
    }
  };

  const confirmSharedOverride = () => {
    if (!pendingOverride) return;
    const { sectionSlug, variant, file } = pendingOverride;
    setPendingOverride(null);
    doSharedUpload(sectionSlug, variant, file, true);
  };

  // 共用需求圖受影響範圍摘要
  const sharedSummary = (() => {
    try {
      return getSharedRequirementSummary({ sectionSlug: sharedSection, variant: sharedVariant });
    } catch {
      return { count: 0, preview: "" };
    }
  })();

  if (isReady === null) {
    return (
      <section aria-labelledby="upload-studio-title" className="studio-shell" id="upload-studio">
        <div className="studio-copy">
          <p className="eyebrow">Upload Studio</p>
          <h2 id="upload-studio-title">上傳圖紙與自評</h2>
        </div>
        <div className="form-message form-message--info" style={{ padding: "var(--space-4)" }}>
          讀取中…
        </div>
      </section>
    );
  }

  if (!isReady) {
    return (
      <section aria-labelledby="upload-studio-title" className="studio-shell" id="upload-studio">
        <div className="studio-copy">
          <p className="eyebrow">Upload Studio</p>
          <h2 id="upload-studio-title">上傳圖紙與自評</h2>
        </div>
        <div className="form-message form-message--error" style={{ padding: "var(--space-4)" }}>
          尚未連接 Supabase。上傳功能暫停，請聯繫站長設定資料庫環境。
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="upload-studio-title" className="studio-shell" id="upload-studio">
      <div className="studio-copy">
        <p className="eyebrow">Upload Studio</p>
        <h2 id="upload-studio-title">上傳圖紙與自評</h2>
      </div>

      <form
        aria-busy={isSubmitting}
        aria-describedby={message ? "upload-form-message" : undefined}
        className="studio-form"
        onSubmit={handleSubmit}
        ref={formRef}
      >
        <div className="field-grid">
          <Field id="title" label="圖面名稱" required>
            <input
              id="title"
              maxLength={MAX_TITLE_LENGTH}
              name="title"
              placeholder="例如：201A 平面圖第 3 次練習"
              required
              type="text"
            />
          </Field>
          <Field id="sheetCode" label="題號 / 版本" required>
            <input
              id="sheetCode"
              maxLength={20}
              name="sheetCode"
              placeholder="例如：201A、208乙、216"
              required
              type="text"
            />
          </Field>
          <Field id="category" label="類別" required>
            <select defaultValue={categoryOptions[0]} id="category" name="category" required>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input id="sectionSlug" name="sectionSlug" type="hidden" />
          </Field>
          <Field id="kind" label="圖像類型" required>
            <select
              value={kind}
              id="kind"
              name="kind"
              required
              onChange={(e) => {
                const val = e.target.value;
                setKind(val);
                if (val !== "他人作品參考") {
                  setShowSuggestions(false);
                }
              }}
            >
              {kindOptions.map((option: UploadKindValue) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field id="authorName" label="作者 / 來源" required>
            <div className="author-input-wrapper" ref={wrapperRef}>
              <input
                id="authorName"
                maxLength={MAX_TITLE_LENGTH}
                name="authorName"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                onFocus={() => {
                  if (kind === "他人作品參考" && savedAuthors.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder={kind === "他人作品參考" ? "例如：同學範例、大正講義" : "例如：我自己"}
                required
                type="text"
                autoComplete="off"
              />
              
              {showSuggestions && kind === "他人作品參考" && savedAuthors.length > 0 && (
                <div className="suggestions-dropdown" role="listbox">
                  {savedAuthors.map((author) => (
                    <div 
                      key={author} 
                      className="suggestion-item"
                      onClick={() => {
                        setAuthorName(author);
                        setShowSuggestions(false);
                      }}
                    >
                      <span className="suggestion-item-text">{author}</span>
                      <button
                        className="suggestion-delete-btn"
                        type="button"
                        aria-label={`刪除歷史紀錄 ${author}`}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent dropdown selection select
                          const updated = savedAuthors.filter((a) => a !== author);
                          setSavedAuthors(updated);
                          localStorage.setItem("saved_authors", JSON.stringify(updated));
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field id="image" label={kind === "我的練習圖" ? "練習圖（最多 6 張）" : kind === "標記試卷" ? "標記試卷圖片" : "圖片檔案"} required>
            <input
              accept="image/png,image/jpeg,image/webp"
              id="image"
              name={kind === "我的練習圖" ? "images" : "image"}
              multiple={kind === "我的練習圖"}
              onChange={handlePreviewChange}
              required
              type="file"
            />
            {kind === "我的練習圖" ? (
              <span className="form-field__hint">可一次選多張；總和不超過 60MB，單張 ≤ 10MB。</span>
            ) : kind === "標記試卷" ? (
              <span className="form-field__hint">題目卷上的格線、比例與計算數據會獨立保存，不計入完成度。</span>
            ) : null}
          </Field>
        </div>

        <Field id="weaknesses" label="自評缺點 / 扣分點">
          <textarea
            id="weaknesses"
            maxLength={MAX_TEXTAREA_LENGTH}
            name="weaknesses"
            placeholder={"每行一點，例如：\n尺寸標註太擠\n走道淨寬不足\n主牆比例不穩"}
            rows={5}
          />
        </Field>

        <Field id="scoreNote" label="綜合複盤">
          <textarea
            id="scoreNote"
            maxLength={MAX_TEXTAREA_LENGTH}
            name="scoreNote"
            placeholder="例如：櫃體比例有改善，但玄關與餐桌距離仍過近，預估扣 5 分。"
            rows={4}
          />
        </Field>

        <Field id="teacherComment" label="老師評圖評語">
          <textarea
            id="teacherComment"
            maxLength={MAX_TEXTAREA_LENGTH}
            name="teacherComment"
            placeholder="老師或同學給予的回饋與修正建議"
            rows={3}
          />
        </Field>

        {previewUrls.length > 0 ? (
          <div className="preview-box preview-thumbs" aria-label="選擇圖片預覽">
            {previewUrls.map((src, idx) => (
              <div className="preview-thumb" key={src}>
                <img alt={`已選擇的第 ${idx + 1} 張圖片預覽`} decoding="async" src={src} />
                <button
                  aria-label={`移除第 ${idx + 1} 張預覽`}
                  className="preview-thumb__remove"
                  onClick={() => handleRemovePreview(idx)}
                  type="button"
                >
                  <X aria-hidden="true" size={14} />
                </button>
                <span className="preview-thumb__index">{idx + 1}/{previewUrls.length}</span>
              </div>
            ))}
          </div>
        ) : null}

        <button className="submit-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <LoaderCircle aria-hidden="true" className="spin" size={18} />
          ) : (
            <Upload aria-hidden="true" size={18} />
          )}
          <span>{isSubmitting ? "送出中" : "送出"}</span>
        </button>

        {message ? (
          <p
            aria-live="polite"
            className={`form-message form-message--${messageTone}`}
            id="upload-form-message"
            role={messageTone === "error" ? "alert" : "status"}
          >
            {truncate(message, 240)}
          </p>
        ) : null}
      </form>

      {/* ─── 共用需求圖上傳區 ─────────────────────────── */}
      <div className="shared-requirement-section" aria-labelledby="shared-req-title">
        <div className="shared-requirement-header">
          <h3 id="shared-req-title">需求圖上傳</h3>
          {!hasSeenSharedTooltip && (
            <div className="shared-tooltip-wrapper">
              <button
                className="shared-tooltip-trigger"
                type="button"
                aria-label="查看說明"
                onClick={() => setHasSeenSharedTooltip(true)}
              >
                <Info size={14} />
              </button>
              <div className="shared-tooltip" role="tooltip">
                <p>上傳一次，所有{sharedVariant}版共用。刪除可還原為原始靜態圖。</p>
                <button
                  className="shared-tooltip-dismiss"
                  type="button"
                  onClick={dismissSharedTooltip}
                >
                  了解
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="shared-requirement-grid">
          {/* 左：設定區 */}
          <div className="shared-requirement-settings">
            <div className="shared-field">
              <label htmlFor="shared-section">章節</label>
              <select
                id="shared-section"
                value={sharedSection}
                onChange={(e) => setSharedSection(e.target.value)}
              >
                {sectionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="shared-field">
              <label htmlFor="shared-variant">版本</label>
              <select
                id="shared-variant"
                ref={sharedVariantRef}
                value={sharedVariant}
                onChange={(e) => setSharedVariant(e.target.value)}
              >
                {variantOptions.map((v) => (
                  <option key={v} value={v}>
                    {v} 版
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 右：受影響範圍預覽 */}
          <div className="shared-scope-preview">
            <p className="shared-scope-label">將出現在</p>
            <p className="shared-scope-codes">
              {sharedSummary.preview}
              {sharedSummary.count > 3 && <span className="shared-scope-more">…</span>}
            </p>
            <p className="shared-scope-count">共 {sharedSummary.count} 張試卷</p>
          </div>
        </div>

        {/* 圖片選擇 */}
        <div className="shared-upload-area">
          <input
            accept="image/png,image/jpeg,image/webp"
            id="shared-requirement-image"
            onChange={handleSharedFileChange}
            type="file"
          />
          {sharedPreview ? (
            <div className="shared-preview">
              <img alt="需求圖預覽" src={sharedPreview} />
              <button
                className="shared-preview-remove"
                type="button"
                aria-label="移除圖片"
                onClick={handleSharedRemove}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="shared-upload-placeholder" htmlFor="shared-requirement-image">
              <Upload size={24} />
              <span>選擇需求圖</span>
            </label>
          )}
        </div>

        {/* 提交按鈕 */}
        <button
          className="submit-button submit-button--secondary"
          disabled={!sharedFile || sharedSubmitting}
          onClick={handleSharedSubmit}
          type="button"
        >
          {sharedSubmitting ? (
            <LoaderCircle aria-hidden="true" className="spin" size={18} />
          ) : (
            <Upload aria-hidden="true" size={18} />
          )}
          <span>{sharedSubmitting ? "上傳中" : "上傳為共用需求圖"}</span>
        </button>

        {sharedMessage && (
          <p
            className={`form-message form-message--${sharedMessage.tone === "warn" ? "info" : sharedMessage.tone}`}
            role={sharedMessage.tone === "error" ? "alert" : "status"}
          >
            {sharedMessage.tone === "warn" && <AlertTriangle aria-hidden="true" size={14} style={{ marginRight: "6px", verticalAlign: "middle" }} />}
            {sharedMessage.text}
          </p>
        )}
      </div>

      {/* ─── 覆寫確認對話框 ──────────────────────────── */}
      {pendingOverride && (
        <div
          className="modal-overlay"
          onClick={() => setPendingOverride(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="override-dialog-title"
        >
          <div className="delete-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 id="override-dialog-title">已有共用需求圖</h3>
            <p>
              <strong>{pendingOverride.sectionSlug} {pendingOverride.variant}</strong> 已存在一張共用需求圖。
            </p>
            <p className="delete-dialog__hint">新圖將取代舊圖，原圖將自動失效。</p>
            <div className="delete-dialog__actions">
              <button
                className="delete-dialog__cancel"
                onClick={() => setPendingOverride(null)}
                disabled={sharedSubmitting}
                type="button"
              >
                取消
              </button>
              <button
                className="delete-dialog__confirm"
                onClick={confirmSharedOverride}
                disabled={sharedSubmitting}
                type="button"
              >
                {sharedSubmitting ? "上傳中…" : "是，覆寫並取代舊圖"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
};

function Field({ id, label, required, children }: FieldProps) {
  return (
    <label className="form-field" htmlFor={id}>
      <span className="form-field__label">
        {label}
        {required ? <span aria-hidden="true" className="form-field__required"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

