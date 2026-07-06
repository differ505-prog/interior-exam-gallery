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

export function RecentUploads({ uploads }: RecentUploadsProps) {
  return (
    <ol className="upload-wall" aria-label="最近上傳的練習圖列表">
      {uploads.map((upload) => {
        const weaknesses = clampWeaknesses(upload.weaknesses);
        return (
          <li className="upload-card" key={upload.id}>
            <div className="upload-image-wrap">
              <SafeImage
                alt={`${upload.title}（${upload.sheetCode}）`}
                aspectRatio="4 / 3"
                className="upload-image"
                fallbackLabel="圖片載入失敗"
                src={upload.imageUrl}
              />
              <span className="upload-kind">{upload.kind}</span>
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
      })}
    </ol>
  );
}