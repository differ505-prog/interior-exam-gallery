"use client";

import { useEffect, useState } from "react";
import { X, ZoomIn, FileImage, Upload } from "lucide-react";
import { ArchiveItem, UploadEntry } from "@/types/exam";
import { SafeImage } from "@/components/ui/safe-image";

type ArchiveDetailModalProps = {
  item: ArchiveItem;
  uploads: UploadEntry[];
  onClose: () => void;
};

export function ArchiveDetailModal({ item, uploads, onClose }: ArchiveDetailModalProps) {
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Lock scroll on body when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const is208 = item.code.startsWith("208");
  const planUrl = is208 ? "/images/208/2021021722093353239 (1).jpg" : null;
  const elevUrl = is208 ? "/images/208/2021021722093353239 (2).jpg" : null;

  return (
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
          {/* Info area */}
          <section className="modal-info-section">
            <div className="modal-info-card">
              <h3>核心考點</h3>
              <p>{item.focus}</p>
            </div>
            <div className="modal-info-card">
              <h3>備考建議</h3>
              <p>{item.notes}</p>
            </div>
          </section>

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
            <h3 className="section-title">我的練習與範例回饋 ({uploads.length})</h3>
            {uploads.length > 0 ? (
              <div className="modal-uploads-grid">
                {uploads.map((upload) => (
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
                <p>尚未上傳此題目的練習圖面。</p>
                <a href="#upload-studio" className="modal-cta-btn" onClick={onClose}>
                  <Upload size={16} />
                  <span>立即上傳此題練習</span>
                </a>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Lightbox for Zoomed Image */}
      {activeImage && (
        <div className="lightbox-overlay" onClick={() => setActiveImage(null)}>
          <button className="lightbox-close" onClick={() => setActiveImage(null)} aria-label="關閉放大圖">
            <X size={24} />
          </button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={activeImage} alt="放大圖面" />
          </div>
        </div>
      )}
    </div>
  );
}
