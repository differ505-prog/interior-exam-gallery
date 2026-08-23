"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, FileImage, Upload, ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { ArchiveItem, UploadEntry } from "@/types/exam";
import { ExamNoteCategory } from "@/types/exam-note";
import { SafeImage } from "@/components/ui/safe-image";
import { TeachingLinks } from "@/components/ui/teaching-links";
import { MarkerPalette } from "@/components/ui/marker-palette";
import { ExamNotesPanel } from "@/components/exam-notes-panel";
import { DimensionTable } from "@/components/ui/dimension-table";
import { getSheetData, saveScratchNote } from "@/lib/user-data";
import { UPLOAD_KINDS } from "@/lib/upload-constants";

// ─── 配置驅動：題目區渲染參數 ───────────────────────────────
type LayoutVariant = "two-col" | "one-col";

type QuestionConfig = {
  title: string;
  layout: LayoutVariant;
};

const QUESTION_CONFIGS: Record<string, QuestionConfig> = {
  perspective: {
    title: "題目區（平面圖＋立面圖）",
    layout: "two-col",
  },
  detail: {
    title: "題目區（大樣圖）",
    layout: "two-col",
  },
  plan: {
    title: "題目區（題目圖＋需求圖）",
    layout: "two-col",
  },
  "ceiling-elevation": {
    title: "題目區（平面圖＋立面圖）",
    layout: "two-col",
  },
};
// ───────────────────────────────────────────────────────────

type ArchiveDetailModalProps = {
  item: ArchiveItem;
  uploads: UploadEntry[];
  sectionSlug: string;
  examNotes?: ExamNoteCategory[];
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
};

export function ArchiveDetailModal({ item, uploads, sectionSlug, examNotes, onClose, onDelete }: ArchiveDetailModalProps) {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<"fit" | "medium" | "large">("fit");
  const [mounted, setMounted] = useState(false);

  // ─── 刪除確認對話框 ────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<UploadEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (entry: UploadEntry) => {
    setDeleteTarget(entry);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // 失敗不關 dialog，讓使用者重試
    } finally {
      setIsDeleting(false);
    }
  };
  // ───────────────────────────────────────────────────────────

  // ─── 速記本：跨裝置雲端同步，localStorage 降級 ──────────
  const [scratchNote, setScratchNote] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemCodeRef = useRef(item.code);
  itemCodeRef.current = item.code;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getSheetData(item.code);
      if (cancelled) return;
      setScratchNote(data.scratchNote);
    })();
    return () => { cancelled = true; };
  }, [item.code]);

  const handleScratchChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setScratchNote(val);
    setSaveStatus("saving");

    // 防抖：停止前一個計時器，300ms 後才寫入
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await saveScratchNote(itemCodeRef.current, val);
      setSaveStatus("saved");
      // 2 秒後回到 idle
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);
  // ───────────────────────────────────────────────────────────

  // ─── 配置查表 ────────────────────────────────────────────
  const questionConfig = QUESTION_CONFIGS[sectionSlug] ?? {
    title: "題目區（平面圖＋立面圖）",
    layout: "two-col",
  };
  // ─────────────────────────────────────────────────────────

  // 防衛性日誌：開發期追蹤上傳資料與 Modal 篩選狀態
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[ArchiveDetailModal] 渲染日誌", {
      itemCode: item.code,
      sectionSlug,
      totalUploads: uploads.length,
      uploadKinds: [...new Set(uploads.map((u) => u.kind))],
      myPracticesCount: uploads.filter((u) => u.kind === UPLOAD_KINDS.MY_PRACTICE).length,
      otherReferencesCount: uploads.filter((u) => u.kind === UPLOAD_KINDS.OTHERS_REFERENCE).length,
    });
  }

  const myPractices = useMemo(() => {
    const matched = uploads.filter((u) => u.kind === UPLOAD_KINDS.MY_PRACTICE);
    if (matched.length > 0 && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug(`[ArchiveDetailModal] 找到 ${matched.length} 張「${UPLOAD_KINDS.MY_PRACTICE}」 for ${item.code}`);
    }
    return matched;
  }, [uploads, item.code]);

  const otherReferences = useMemo(() => {
    const matched = uploads.filter((u) => u.kind === UPLOAD_KINDS.OTHERS_REFERENCE);
    if (matched.length > 0 && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug(`[ArchiveDetailModal] 找到 ${matched.length} 張「${UPLOAD_KINDS.OTHERS_REFERENCE}」 for ${item.code}`);
    }
    // 防衛性偵錯：若 kind 值未被任何 filter 命中，吐出實際 kind 值協助快速定位
    if (matched.length === 0 && uploads.length > 0 && process.env.NODE_ENV === "development") {
      const actualKinds = [...new Set(uploads.map((u) => u.kind))];
      const validKinds = Object.values(UPLOAD_KINDS);
      const unknownKinds = actualKinds.filter((k) => !validKinds.includes(k as typeof validKinds[number]));
      // eslint-disable-next-line no-console
      console.warn(
        `[ArchiveDetailModal] kind 篩選未命中。期望其一: ${JSON.stringify(validKinds)}，實際 kind 值: ${JSON.stringify(actualKinds)}${unknownKinds.length > 0 ? `（含未知值: ${JSON.stringify(unknownKinds)}）` : ""}。若上傳成功但未顯示，請確認上傳表單的 kind 值是否與 UPLOAD_KINDS 常數一致。`
      );
    }
    return matched;
  }, [uploads, item.code]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // ─── 題目圖 URL 解析（共用）：根據 sectionSlug + item.code 決定兩張圖紙 URL ────
  // plan：題目圖（按數字前綴）+ 需求圖（按字母末位）
  // ceiling-elevation：與 plan 相同，題目圖（按數字）+ 需求圖（按字母）
  // detail：題目圖 + 官方答案圖（各題獨立資料夾）
  // perspective：固定兩張參考圖
  const questionImageUrl = (() => {
    if (sectionSlug === "plan" || sectionSlug === "ceiling-elevation") {
      const numPart = item.code.slice(0, 3);
      if (!/^\d{3}$/.test(numPart)) return null;
      return `/images/plan/question-${numPart}.jpg`;
    }
    if (sectionSlug === "detail") return `/images/${item.code}/213-question.jpg`;
    if (sectionSlug === "perspective") return "/images/208/2021021722093353239 (1).jpg";
    return null;
  })();

  const referenceImageUrl = (() => {
    if (sectionSlug === "plan" || sectionSlug === "ceiling-elevation") {
      const letterPart = item.code.slice(3, 4);
      return `/images/plan/requirement-${letterPart}.jpg`;
    }
    if (sectionSlug === "detail") return `/images/${item.code}/213-answer.jpg`;
    if (sectionSlug === "perspective") return "/images/208/2021021722093353239 (2).jpg";
    return null;
  })();

  const handlePrefill = (kindVal: "我的練習圖" | "他人作品參考") => {
    let uploadCategory = "平面圖 201-206";
    if (sectionSlug === "ceiling-elevation") uploadCategory = "天花板圖 / 立面圖";
    if (sectionSlug === "perspective") uploadCategory = "透視圖 207-212";
    if (sectionSlug === "detail") uploadCategory = "大樣圖 213-224";

    window.dispatchEvent(
      new CustomEvent("prefill-upload", {
        detail: {
          sheetCode: item.code,
          category: uploadCategory,
          kind: kindVal
        }
      })
    );
    onClose();
  };

  // Build the list of all zoomable images in order
  const zoomableImages = useMemo(() => {
    return [
      questionImageUrl,
      referenceImageUrl,
      ...uploads.map((u) => u.imageUrl),
    ].filter((url): url is string => !!url);
  }, [questionImageUrl, referenceImageUrl, uploads]);

  // Lock scroll on body and manage keyboard events when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeImage) {
          setActiveImage(null);
          setIsLargeZoom(false);
        } else {
          onClose();
        }
      } else if (activeImage && zoomableImages.length > 1) {
        if (e.key === "ArrowRight" || e.key === "Right") {
          const currentIndex = zoomableImages.indexOf(activeImage);
          if (currentIndex !== -1) {
            const nextIndex = (currentIndex + 1) % zoomableImages.length;
            setActiveImage(zoomableImages[nextIndex]);
            setIsLargeZoom(false);
          }
        } else if (e.key === "ArrowLeft" || e.key === "Left") {
          const currentIndex = zoomableImages.indexOf(activeImage);
          if (currentIndex !== -1) {
            const prevIndex = (currentIndex - 1 + zoomableImages.length) % zoomableImages.length;
            setActiveImage(zoomableImages[prevIndex]);
            setIsLargeZoom(false);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, activeImage, zoomableImages]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="modal-header">
          <div className="modal-header-title">
            <span className="modal-badge">{item.code}</span>
            <h2>{item.title.replace(new RegExp(`^${item.code}\\s*`), "")}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="關閉視窗">
            <X size={20} />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="modal-content">
          {/* Question Reference Area */}
          <section className="modal-section">
            <h3 className="section-title">{questionConfig.title}</h3>
            {questionConfig.layout === "two-col" && questionImageUrl && referenceImageUrl ? (
              <div className="question-grid">
                <div className="question-image-box">
                  <div className="question-image-header">
                    <h4>{sectionSlug === "detail" ? "題目圖" : sectionSlug === "plan" ? "題目圖" : "平面配置參考圖"}</h4>
                    <button className="zoom-btn" onClick={() => setActiveImage(questionImageUrl)} aria-label={sectionSlug === "detail" ? "放大題目圖" : sectionSlug === "plan" ? "放大題目圖" : "放大平面圖"}>
                      <ZoomIn size={16} /> <span>放大</span>
                    </button>
                  </div>
                  <div className="question-image-container" onClick={() => setActiveImage(questionImageUrl)}>
                    <SafeImage src={questionImageUrl} alt={sectionSlug === "detail" ? `${item.code} 題目圖` : sectionSlug === "plan" ? `${item.code} 題目圖` : `${item.code} 平面配置參考圖`} aspectRatio="4 / 3" />
                  </div>
                </div>
                <div className="question-image-box">
                  <div className="question-image-header">
                    <h4>{sectionSlug === "detail" ? "官方答案圖" : sectionSlug === "plan" ? "需求圖" : "立面配置參考圖"}</h4>
                    <button className="zoom-btn" onClick={() => setActiveImage(referenceImageUrl)} aria-label={sectionSlug === "detail" ? "放大官方答案圖" : sectionSlug === "plan" ? "放大需求圖" : "放大立面圖"}>
                      <ZoomIn size={16} /> <span>放大</span>
                    </button>
                  </div>
                  <div className="question-image-container" onClick={() => setActiveImage(referenceImageUrl)}>
                    <SafeImage src={referenceImageUrl} alt={sectionSlug === "detail" ? `${item.code} 官方答案圖` : sectionSlug === "plan" ? `${item.code} 需求圖` : `${item.code} 立面配置參考圖`} aspectRatio="4 / 3" />
                  </div>
                </div>
              </div>
            ) : questionConfig.layout === "two-col" && questionImageUrl ? (
              <div className="question-single">
                <div className="question-image-box">
                  <div className="question-image-header">
                    <h4>大樣圖參考</h4>
                    <button className="zoom-btn" onClick={() => setActiveImage(questionImageUrl)} aria-label="放大參考圖">
                      <ZoomIn size={16} /> <span>放大</span>
                    </button>
                  </div>
                  <div className="question-image-container" onClick={() => setActiveImage(questionImageUrl)}>
                    <SafeImage src={questionImageUrl} alt={`${item.code} 大樣圖參考`} aspectRatio="4 / 3" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="question-placeholder">
                <div className="placeholder-content">
                  <FileImage className="placeholder-icon" size={48} />
                  <h4>題目圖紙建置中</h4>
                  <p>
                    此題目的題目參考圖正在編校上傳中。
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* 尺寸對照表（僅平面圖顯示） */}
          {sectionSlug === "plan" && <DimensionTable />}

          {/* Practice submissions */}
          <section className="modal-section">
            <h3 className="section-title">我的練習成果 ({myPractices.length})</h3>
            {myPractices.length > 0 ? (
              <div className="modal-uploads-grid">
                {myPractices.map((upload) => (
                  <div className="modal-upload-card" key={upload.id}>
                    <div className="modal-upload-img-wrap" onClick={() => setActiveImage(upload.imageUrl)}>
                      <SafeImage src={upload.imageUrl} alt={upload.title} aspectRatio="4 / 3" />
                      <span className="modal-upload-kind">{upload.kind}</span>
                      <button className="modal-upload-zoom" aria-label="放大圖面">
                        <ZoomIn size={16} />
                      </button>
                    </div>
                    <div className="modal-upload-details">
                      <div className="modal-upload-meta">
                        <span className="modal-upload-author">{upload.authorName}</span>
                        <span className="modal-upload-date">
                          {new Date(upload.createdAt).toLocaleDateString("zh-TW")}
                        </span>
                      </div>
                      <h4>{upload.title}</h4>
                      <p className="modal-upload-score">{upload.scoreNote}</p>
                      {upload.weaknesses.length > 0 && (
                        <div className="modal-upload-weaknesses">
                          {upload.weaknesses.map((w, idx) => (
                            <span className="modal-weakness-tag" key={idx}>
                              {w}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-uploads-box">
                <p>尚未上傳您的個人練習圖面。</p>
                <a href="#upload-studio" className="modal-cta-btn" onClick={() => handlePrefill("我的練習圖")}>
                  <Upload size={16} />
                  <span>立即上傳個人練習</span>
                </a>
              </div>
            )}
          </section>

          {/* Others' Reference Submissions */}
          <section className="modal-section">
            <h3 className="section-title">他人優秀作品參考 ({otherReferences.length})</h3>
            {otherReferences.length > 0 ? (
              <div className="modal-uploads-grid">
                {otherReferences.map((upload) => (
                  <div className="modal-upload-card" key={upload.id}>
                    <div className="modal-upload-img-wrap" onClick={() => setActiveImage(upload.imageUrl)}>
                      <SafeImage src={upload.imageUrl} alt={upload.title} aspectRatio="4 / 3" />
                      <span className="modal-upload-kind">他人作品參考</span>
                      <button className="modal-upload-zoom" aria-label="放大圖面">
                        <ZoomIn size={16} />
                      </button>
                    </div>
                    <div className="modal-upload-details">
                      <div className="modal-upload-meta">
                        <span className="modal-upload-author">{upload.authorName}</span>
                        <span className="modal-upload-date">
                          {new Date(upload.createdAt).toLocaleDateString("zh-TW")}
                        </span>
                        <button
                          className="modal-upload-delete"
                          aria-label={`刪除 ${upload.title}`}
                          onClick={() => handleDeleteClick(upload)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <h4>{upload.title}</h4>
                      <p className="modal-upload-score">{upload.scoreNote}</p>
                      {upload.weaknesses.length > 0 && (
                        <div className="modal-upload-weaknesses">
                          {upload.weaknesses.map((w, idx) => (
                            <span className="modal-weakness-tag" key={idx}>
                              {w}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-uploads-box no-uploads-box--neutral">
                <p>尚未收藏他人優秀練習圖面。上傳可以方便收藏對照學習。</p>
                <a href="#upload-studio" className="modal-cta-btn modal-cta-btn--secondary" onClick={() => handlePrefill("他人作品參考")}>
                  <Upload size={16} />
                  <span>上傳他人作品參考</span>
                </a>
              </div>
            )}
          </section>

          {/* 速記本：作圖時自由記錄，之後彙整 */}
          <section className="modal-section modal-section--notes">
            <h3 className="section-title">速記本</h3>
            <div className="scratch-pad">
              <textarea
                className="scratch-pad__input"
                value={scratchNote}
                onChange={handleScratchChange}
                placeholder="作圖時想到什麼就寫什麼——尺寸、比例、扣分點、靈感。有空時再彙整進正式備考筆記。"
                rows={4}
                aria-label="速記本"
              />
              {saveStatus === "saving" ? (
                <p className="scratch-pad__meta">儲存中…</p>
              ) : saveStatus === "saved" ? (
                <p className="scratch-pad__meta">已自動暫存</p>
              ) : scratchNote ? (
                <p className="scratch-pad__meta">輸入時自動儲存</p>
              ) : null}
            </div>
          </section>

          {/* 備考知識面板 */}
          {examNotes && examNotes.length > 0 && (
            <section className="modal-section modal-section--notes">
              <h3 className="section-title">備考知識</h3>
              <ExamNotesPanel
                categories={examNotes}
                relatedCode={item.code}
              />
            </section>
          )}

          {/* 教學資源連結 */}
          <section className="modal-section modal-section--notes">
            <h3 className="section-title">教學資源</h3>
            <TeachingLinks
              sheetCode={item.code}
              initialLinks={item.links}
              slots={
                sectionSlug === "perspective" || sectionSlug === "detail"
                  ? [
                      { label: "教學示範影片", placeholder: "貼上 YouTube 或教學影片連結" },
                      { label: "3D 渲染模型", placeholder: "貼上 SketchFab、Artstation 等 3D 模型連結" },
                    ]
                  : [
                      { label: "教學示範影片", placeholder: "貼上 YouTube 或教學影片連結" },
                    ]
              }
            />
          </section>

          {/* 麥克筆資料庫（僅透視圖顯示） */}
          {sectionSlug === "perspective" && (
            <section className="modal-section modal-section--notes">
              <MarkerPalette />
            </section>
          )}
        </div>
      </div>
    </div>

        {/* Lightbox for Zoomed Image */}
      {activeImage && (
        <div
          className={`lightbox-overlay${zoomLevel !== "fit" ? " lightbox-overlay--zoomed" : ""}`}
          onClick={() => {
            setActiveImage(null);
            setZoomLevel("fit");
          }}
        >
          <button
            className="lightbox-close"
            onClick={() => {
              setActiveImage(null);
              setZoomLevel("fit");
            }}
            aria-label="關閉放大圖"
          >
            <X size={24} />
          </button>

          {/* 三段式縮放控制 */}
          <div className="lightbox-zoom-controls" onClick={(e) => e.stopPropagation()}>
            <button
              className={`lightbox-zoom-btn${zoomLevel === "fit" ? " lightbox-zoom-btn--active" : ""}`}
              onClick={() => setZoomLevel("fit")}
              aria-label="符合視窗"
              title="符合視窗"
            >
              <span className="lightbox-zoom-btn__label">現況</span>
            </button>
            <button
              className={`lightbox-zoom-btn${zoomLevel === "medium" ? " lightbox-zoom-btn--active" : ""}`}
              onClick={() => setZoomLevel("medium")}
              aria-label="放大至 1400px"
              title="放大至 1400px"
            >
              <span className="lightbox-zoom-btn__label">1400</span>
            </button>
            <button
              className={`lightbox-zoom-btn${zoomLevel === "large" ? " lightbox-zoom-btn--active" : ""}`}
              onClick={() => setZoomLevel("large")}
              aria-label="放大至 2200px"
              title="放大至 2200px"
            >
              <span className="lightbox-zoom-btn__label">超大</span>
            </button>
          </div>

          {zoomableImages.length > 1 && (
            <>
              <button
                className="lightbox-nav-btn lightbox-nav-btn--left"
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = zoomableImages.indexOf(activeImage);
                  const prevIndex = (currentIndex - 1 + zoomableImages.length) % zoomableImages.length;
                  setActiveImage(zoomableImages[prevIndex]);
                  setZoomLevel("fit");
                }}
                aria-label="上一張"
              >
                <ArrowLeft size={28} />
              </button>
              <button
                className="lightbox-nav-btn lightbox-nav-btn--right"
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = zoomableImages.indexOf(activeImage);
                  const nextIndex = (currentIndex + 1) % zoomableImages.length;
                  setActiveImage(zoomableImages[nextIndex]);
                  setZoomLevel("fit");
                }}
                aria-label="下一張"
              >
                <ArrowRight size={28} />
              </button>
            </>
          )}

          <img
            src={activeImage}
            alt="放大圖面"
            className={`img-zoomed-${zoomLevel === "fit" ? "fit" : zoomLevel === "medium" ? "medium" : "large"}`}
          />
        </div>
      )}

      {/* 刪除確認對話框 */}
      {deleteTarget && (
        <div
          className="modal-overlay"
          onClick={() => !isDeleting && setDeleteTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="delete-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-dialog-title">確認刪除</h3>
            <p>即將刪除：<strong>{deleteTarget.title}</strong></p>
            <p className="delete-dialog__hint">此操作不可撤銷。</p>
            <div className="delete-dialog__actions">
              <button
                className="delete-dialog__cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                取消
              </button>
              <button
                className="delete-dialog__confirm"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "刪除中…" : "確認刪除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
