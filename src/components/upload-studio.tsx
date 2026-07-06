"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Upload, X } from "lucide-react";

const categoryOptions = [
  "平面圖 201-206",
  "天花板圖 / 立面圖",
  "透視圖 207-212",
  "大樣圖 213-224",
] as const;

const kindOptions = ["我的練習圖", "他人作品參考"] as const;

type CategoryOption = (typeof categoryOptions)[number];
type KindOption = (typeof kindOptions)[number];

const MAX_TITLE_LENGTH = 60;
const MAX_TEXTAREA_LENGTH = 500;

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function UploadStudio() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Autocomplete and suggestion dropdown states
  const [kind, setKind] = useState<string>("我的練習圖");
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
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
  // Listen for prefill events to automatically configure the upload fields
  useEffect(() => {
    const handlePrefill = (e: Event) => {
      const { sheetCode, category, kind: kindVal } = (e as CustomEvent).detail;
      if (sheetCode) {
        if (formRef.current) {
          const titleInput = formRef.current.querySelector("#title") as HTMLInputElement;
          const sheetCodeInput = formRef.current.querySelector("#sheetCode") as HTMLInputElement;
          const categorySelect = formRef.current.querySelector("#category") as HTMLSelectElement;
          const kindSelect = formRef.current.querySelector("#kind") as HTMLSelectElement;
          
          if (sheetCodeInput) sheetCodeInput.value = sheetCode;
          if (categorySelect) categorySelect.value = category;
          if (kindSelect) {
            kindSelect.value = kindVal;
            setKind(kindVal);
          }
          
          // Prefill default title
          if (titleInput) {
            titleInput.value = `${sheetCode} ${kindVal === "我的練習圖" ? "個人練習" : "作品參考"}`;
          }

          // Prepopulate authorName default for personal practice
          if (kindVal === "我的練習圖") {
            setAuthorName("我自己");
          } else {
            setAuthorName("");
          }
        }
      }
    };

    window.addEventListener("prefill-upload", handlePrefill);
    return () => window.removeEventListener("prefill-upload", handlePrefill);
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
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setMessageTone("info");
      setMessage("完成。已加入圖庫。");
      router.refresh();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "發生未知錯誤。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviewChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

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
              {kindOptions.map((option: KindOption) => (
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
          <Field id="image" label="圖片檔案" required>
            <input
              accept="image/png,image/jpeg,image/webp"
              id="image"
              name="image"
              onChange={handlePreviewChange}
              required
              type="file"
            />
          </Field>
        </div>

        <Field id="weaknesses" label="自評缺點 / 扣分點" required>
          <textarea
            id="weaknesses"
            maxLength={MAX_TEXTAREA_LENGTH}
            name="weaknesses"
            placeholder={"每行一點，例如：\n尺寸標註太擠\n走道淨寬不足\n主牆比例不穩"}
            required
            rows={5}
          />
        </Field>

        <Field id="scoreNote" label="綜合複盤" required>
          <textarea
            id="scoreNote"
            maxLength={MAX_TEXTAREA_LENGTH}
            name="scoreNote"
            placeholder="例如：櫃體比例有改善，但玄關與餐桌距離仍過近，預估扣 5 分。"
            required
            rows={4}
          />
        </Field>

        {previewUrl ? (
          <div className="preview-box" aria-label="選擇圖片預覽">
            <img alt="已選擇的圖片預覽" decoding="async" src={previewUrl} />
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

export type { CategoryOption };