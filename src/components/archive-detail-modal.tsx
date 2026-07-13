"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, FileImage, Upload, ArrowLeft, ArrowRight } from "lucide-react";
import { ArchiveItem, UploadEntry } from "@/types/exam";
import { ExamNoteCategory } from "@/types/exam-note";
import { SafeImage } from "@/components/ui/safe-image";
import { ExamNotesPanel } from "@/components/exam-notes-panel";

type ArchiveDetailModalProps = {
  item: ArchiveItem;
  uploads: UploadEntry[];
  sectionSlug: string;
  examNotes?: ExamNoteCategory[];
  onClose: () => void;
};

export function ArchiveDetailModal({ item, uploads, sectionSlug, examNotes, onClose }: ArchiveDetailModalProps) {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isLargeZoom, setIsLargeZoom] = useState(false);
  const [mounted, setMounted] = useState(false);

  const myPractices = useMemo(() => uploads.filter((u) => u.kind === "我的練習圖"), [uploads]);
  const otherReferences = useMemo(() => uploads.filter((u) => u.kind === "他人範例圖"), [uploads]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const is208 = item.code.startsWith("208");
  const planUrl = is208 ? "/images/208/2021021722093353239 (1).jpg" : null;
  const elevUrl = is208 ? "/images/208/2021021722093353239 (2).jpg" : null;

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
      planUrl,
      elevUrl,
      ...uploads.map((u) => u.imageUrl),
    ].filter((url): url is string => !!url);
  }, [planUrl, elevUrl, uploads]);

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
            <h2>{item.title}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="關閉視窗">
            <X size={20} />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="modal-content">
          {/* Question Reference Area (題目區) */}
          <section className="modal-section">
            <h3 className="section-title">題目區（平面圖＋立面圖）</h3>
            {is208 ? (
              <div className="question-grid">
                <div className="question-image-box">
                  <div className="question-image-header">
                    <h4>平面配置參考圖</h4>
                    <button className="zoom-btn" onClick={() => setActiveImage(planUrl)} aria-label="放大平面圖">
                      <ZoomIn size={16} /> <span>放大</span>
                    </button>
                  </div>
                  <div className="question-image-container" onClick={() => setActiveImage(planUrl)}>
                    <SafeImage src={planUrl!} alt={`${item.code} 平面配置參考圖`} aspectRatio="4 / 3" />
                  </div>
                </div>
                <div className="question-image-box">
                  <div className="question-image-header">
                    <h4>立面配置參考圖</h4>
                    <button className="zoom-btn" onClick={() => setActiveImage(elevUrl)} aria-label="放大立面圖">
                      <ZoomIn size={16} /> <span>放大</span>
                    </button>
                  </div>
                  <div className="question-image-container" onClick={() => setActiveImage(elevUrl)}>
                    <SafeImage src={elevUrl!} alt={`${item.code} 立面配置參考圖`} aspectRatio="4 / 3" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="question-placeholder">
                <div className="placeholder-content">
                  <FileImage className="placeholder-icon" size={48} />
                  <h4>題目圖紙建置中</h4>
                  <p>
                    此題目的平面與立面配置圖正在編校上傳中。<br />
                    您可以點擊檢視 <strong>208甲、208乙 或 208丙</strong>，預覽完整的平面與立面圖配置。
                  </p>
                </div>
              </div>
            )}
          </section>

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
        </div>
      </div>
    </div>

      {/* Lightbox for Zoomed Image */}
      {activeImage && (
        <div 
          className={`lightbox-overlay ${isLargeZoom ? "lightbox-overlay--zoomed" : ""}`}
          onClick={() => {
            setActiveImage(null);
            setIsLargeZoom(false);
          }}
        >
          <button 
            className="lightbox-close" 
            onClick={() => {
              setActiveImage(null);
              setIsLargeZoom(false);
            }} 
            aria-label="關閉放大圖"
          >
            <X size={24} />
          </button>
          
          {zoomableImages.length > 1 && (
            <>
              <button 
                className="lightbox-nav-btn lightbox-nav-btn--left" 
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = zoomableImages.indexOf(activeImage);
                  const prevIndex = (currentIndex - 1 + zoomableImages.length) % zoomableImages.length;
                  setActiveImage(zoomableImages[prevIndex]);
                  setIsLargeZoom(false);
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
                  setIsLargeZoom(false);
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
            className={isLargeZoom ? "img-zoomed-large" : "img-zoomed-fit"}
            onClick={(e) => {
              e.stopPropagation();
              setIsLargeZoom(!isLargeZoom);
            }}
          />
        </div>
      )}
    </>,
    document.body
  );
}
