/**
 * image-compress.ts
 *
 * 瀏覽器端壓縮：解決手機 4K 掃描檔超過 API 10MB 上限而被擋的問題。
 * 純函式 + Canvas，無第三方依賴。
 */

export type CompressResult = {
  blob: Blob;
  width: number;
  height: number;
  originalBytes: number;
  outputBytes: number;
  /** true 表示壓縮後反而更大或無需壓縮，已沿用原檔 */
  skipped: boolean;
};

const DEFAULTS = { maxEdge: 3000, quality: 0.85, targetType: "image/webp" };

export async function compressImage(
  file: File,
  options: { maxEdge?: number; quality?: number; targetType?: string } = {},
): Promise<CompressResult> {
  const { maxEdge, quality, targetType } = { ...DEFAULTS, ...options };

  const fallback = (reason: string): CompressResult => {
    console.warn(`[compress] 略過壓縮（${reason}），沿用原檔`);
    return {
      blob: file,
      width: 0,
      height: 0,
      originalBytes: file.size,
      outputBytes: file.size,
      skipped: true,
    };
  };

  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return fallback("瀏覽器不支援 createImageBitmap");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return fallback("圖片解碼失敗");
  }

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return fallback("無法取得 canvas context");
  }

  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, targetType, quality),
  );

  if (!blob || blob.size >= file.size) {
    return fallback("壓縮後未變小");
  }

  return {
    blob,
    width,
    height,
    originalBytes: file.size,
    outputBytes: blob.size,
    skipped: false,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}