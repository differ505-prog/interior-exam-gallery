import { UploadEntry } from "@/types/exam";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function RecentUploads({ uploads }: { uploads: UploadEntry[] }) {
  return (
    <div className="upload-wall">
      {uploads.map((upload) => (
        <article className="upload-card" key={upload.id}>
          <div className="upload-image-wrap">
            <img alt={upload.title} className="upload-image" src={upload.imageUrl} />
            <span className="upload-kind">{upload.kind}</span>
          </div>
          <div className="upload-body">
            <div className="upload-meta">
              <p>{upload.sheetCode}</p>
              <span>{formatDate(upload.createdAt)}</span>
            </div>
            <h3>{upload.title}</h3>
            <p className="upload-category">{upload.category}</p>
            <p className="upload-score">{upload.scoreNote}</p>
            <div className="tag-list">
              {upload.weaknesses.map((weakness) => (
                <span className="tag" key={`${upload.id}-${weakness}`}>
                  {weakness}
                </span>
              ))}
            </div>
            <small>整理者：{upload.authorName}</small>
          </div>
        </article>
      ))}
    </div>
  );
}
