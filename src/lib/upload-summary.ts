/**
 * upload-summary.ts
 * 試卷卡上傳成果摘要計算（單一事實來源）。
 * 區分「我的練習圖」與「他人作品參考／標記試卷」，並計算總圖數與縮圖預覽 URL。
 */

import type { UploadEntry } from "@/types/exam";
import { UPLOAD_KINDS } from "@/lib/upload-constants";

export interface CardUploadSummary {
  hasUpload: boolean;
  hasMyPractice: boolean;
  myEntryCount: number;
  myImageCount: number;
  refEntryCount: number;
  refImageCount: number;
  totalImageCount: number;
  previewImageUrl: string | null;
  latestTitle: string;
}

function getEntryImageCount(entry: UploadEntry): number {
  if (Array.isArray(entry.imageUrls) && entry.imageUrls.length > 0) {
    return entry.imageUrls.length;
  }
  return entry.imageUrl ? 1 : 0;
}

function getEntryFirstImageUrl(entry: UploadEntry): string | null {
  if (Array.isArray(entry.imageUrls) && entry.imageUrls.length > 0) {
    return entry.imageUrls[0] ?? null;
  }
  return entry.imageUrl || null;
}

/**
 * 彙整單張試卷卡所屬的上傳資料
 */
export function summarizeCardUploads(uploads: UploadEntry[]): CardUploadSummary {
  if (!uploads || uploads.length === 0) {
    return {
      hasUpload: false,
      hasMyPractice: false,
      myEntryCount: 0,
      myImageCount: 0,
      refEntryCount: 0,
      refImageCount: 0,
      totalImageCount: 0,
      previewImageUrl: null,
      latestTitle: "",
    };
  }

  const myEntries = uploads.filter((u) => u.kind === UPLOAD_KINDS.MY_PRACTICE);
  const refEntries = uploads.filter((u) => u.kind !== UPLOAD_KINDS.MY_PRACTICE);

  const myImageCount = myEntries.reduce((sum, u) => sum + getEntryImageCount(u), 0);
  const refImageCount = refEntries.reduce((sum, u) => sum + getEntryImageCount(u), 0);

  const primaryEntry = myEntries[0] ?? refEntries[0];
  const previewImageUrl = primaryEntry ? getEntryFirstImageUrl(primaryEntry) : null;
  const latestTitle = primaryEntry?.title ?? "";

  return {
    hasUpload: true,
    hasMyPractice: myEntries.length > 0,
    myEntryCount: myEntries.length,
    myImageCount,
    refEntryCount: refEntries.length,
    refImageCount,
    totalImageCount: myImageCount + refImageCount,
    previewImageUrl,
    latestTitle,
  };
}
