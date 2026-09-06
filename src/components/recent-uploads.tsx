"use client";

import { useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { UploadEntry } from "@/types/exam";

type RecentUploadsProps = {
  uploads: UploadEntry[];
};

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return dateFormatter.format(parsed);
}

function clampWeaknesses(items: string[]) {
  return items.slice(0, 4);
}

/**
 * 將 UploadEntry 攤平為「每張圖一張卡」的呈現單位。
 * 單張維持一筆，多張展開成多筆（共用同一筆的 metadata）。
 */
function expandToImages(upload: UploadEntry): { id: string; key: string; url: string }[] {
  const urls = upload.imageUrls && upload.imageUrls.length > 0 ? upload.imageUrls : [upload.imageUrl];
  return urls.map((url, idx) => ({
    id: upload.id,
    key: `${upload.id}-${idx}`,
    url,
  }));
}

export function RecentUploads({ uploads }: RecentUploadsProps) {
  return (
    <ol className="upload-wall" aria-label="最近上傳的練習圖列表">
      {uploads.map((upload) => (
        <UploadCard key={upload.id} upload={upload} />
      ))}
    </ol>
  );
}

function UploadCard({ upload }: { upload: UploadEntry }) {
  const images = expandToImages(upload);
  const hasMultiple = images.length > 1;
  const weaknesses = clampWeaknesses(upload.weaknesses);

  const [activeIdx, setActiveIdx] = useState(0);
  const activeImage = images[Math.min(activeIdx, images.length - 1)] ?? images[0];

  return (
    <li className="upload-card" key={upload.id}>
      <div className="upload-image-wrap">
        <SafeImage
          alt={`${upload.title}（${upload.sheetCode}）`}
          aspectRatio="4 / 3"
          className="upload-image"
          fallbackLabel="圖片載入失敗"
          src={activeImage.url}
        />
        <span className="upload-kind">{upload.kind}</span>
        {hasMultiple ? (
          <>
            <span className="upload-multi-badge" aria-label={`共 ${images.length} 張圖`}>
              {images.length} 張
            </span>
            <ol className="upload-card__thumbs" aria-label={`${upload.title} 圖片切換`}>
              {images.map((img, idx) => (
                <li key={img.key}>
                  <button
                    aria-current={idx === activeIdx ? "true" : undefined}
                    aria-label={`切換至第 ${idx + 1} 張`}
                    className={`upload-card__thumb${idx === activeIdx ? " upload-card__thumb--active" : ""}`}
                    onClick={() => setActiveIdx(idx)}
                    type="button"
                  >
                    <SafeImage alt="" aspectRatio="1 / 1" fallbackLabel="" src={img.url} />
                  </button>
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </div>
      <div className="upload-body">
        <div className="upload-meta">
          <p className="upload-meta__code">{upload.sheetCode}</p>
          <time className="upload-meta__date" dateTime={upload.createdAt}>
            {formatDate(upload.createdAt)}
          </time>
        </div>
        <h3 className="upload-card__title">{upload.title}</h3>
        <p className="upload-category">{upload.category}</p>
        <p className="upload-score">{upload.scoreNote}</p>
        <ul aria-label={`${upload.title} 的扣分點`} className="tag-list">
          {weaknesses.map((weakness) => (
            <li className="tag" key={`${upload.id}-${weakness}`}>
              {weakness}
            </li>
          ))}
        </ul>
        <small className="upload-author">整理者：{upload.authorName}</small>
      </div>
    </li>
  );
}