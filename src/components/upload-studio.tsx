"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Upload, WandSparkles } from "lucide-react";

const categoryOptions = [
  "平面圖 201-206",
  "天花板圖",
  "立面圖：客廳",
  "立面圖：主臥",
  "立面圖：餐廳",
  "透視圖 207-212",
  "大樣圖 213-224",
];

const kindOptions = ["我的練習圖", "他人範例圖"] as const;

export function UploadStudio() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const guidance = useMemo(
    () => [
      "可上傳自己的練習圖，建立個人錯題牆。",
      "也可收藏他人範例圖，當作構圖或上色參考。",
      "每張圖都能附上自評缺點、扣分點與複盤重點。",
    ],
    [],
  );

  const handleSubmit = async (event: {
    preventDefault: () => void;
    currentTarget: HTMLFormElement;
  }) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "上傳失敗，請稍後再試。");
      }

      form.reset();
      setPreviewUrl(null);
      setMessage(
        "上傳完成，圖面與扣分點已加入圖庫。\n如果你已連接 Supabase，資料會同步存到遠端。",
      );
      router.refresh();
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "發生未知錯誤。";
      setMessage(nextMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="studio-shell" id="upload-studio">
      <div className="studio-copy">
        <p className="eyebrow">Upload Studio</p>
        <h2>上傳練習圖、收藏範例圖，建立自己的扣分點資料庫</h2>
        <p>
          這個區塊是整站的實戰核心。你可以把每次練習的圖面丟進來，直接記錄自己看見的缺點、預估扣分與下次修正方向。
        </p>
        <div className="studio-points">
          {guidance.map((item) => (
            <div className="studio-point" key={item}>
              <WandSparkles size={16} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <form className="studio-form" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label>
            圖面名稱
            <input
              name="title"
              placeholder="例如：201A 平面圖第 3 次練習"
              required
              type="text"
            />
          </label>
          <label>
            題號 / 版本
            <input
              name="sheetCode"
              placeholder="例如：201A、208乙、216"
              required
              type="text"
            />
          </label>
          <label>
            類別
            <select defaultValue={categoryOptions[0]} name="category">
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            圖像類型
            <select defaultValue={kindOptions[0]} name="kind">
              {kindOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            作者 / 來源
            <input
              name="authorName"
              placeholder="例如：我自己、同學範例、講義整理"
              required
              type="text"
            />
          </label>
          <label>
            圖片檔案
            <input
              accept="image/png,image/jpeg,image/webp"
              name="image"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setPreviewUrl(null);
                  return;
                }

                setPreviewUrl(URL.createObjectURL(file));
              }}
              required
              type="file"
            />
          </label>
        </div>

        <label>
          自評缺點 / 扣分點
          <textarea
            name="weaknesses"
            placeholder={"每行一點，例如：\n尺寸標註太擠\n走道淨寬不足\n主牆比例不穩"}
            required
            rows={5}
          />
        </label>

        <label>
          綜合複盤
          <textarea
            name="scoreNote"
            placeholder="例如：櫃體比例有改善，但玄關與餐桌距離仍過近，預估扣 5 分。"
            required
            rows={4}
          />
        </label>

        {previewUrl ? (
          <div className="preview-box">
            <img alt="預覽" src={previewUrl} />
          </div>
        ) : null}

        <button className="submit-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <Upload size={18} />
          )}
          {isSubmitting ? "上傳中" : "送出到圖庫"}
        </button>

        {message ? <p className="form-message">{message}</p> : null}
      </form>
    </section>
  );
}
