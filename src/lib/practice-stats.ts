/**
 * practice-stats.ts
 *
 * 練習統計單一事實來源（Single Source of Truth）。
 * 統計口徑：上傳圖片張數（UPLOAD_KINDS.MY_PRACTICE 的 imageUrls?.length ?? 1）
 */

import { ArchiveItem, UploadEntry } from "@/types/exam";
import { UPLOAD_KINDS } from "@/lib/upload-constants";

/**
 * 題目級練習次數（圖片張數）。
 * 同一題上傳 2 張圖，回傳 2（不是去重後的 1）。
 */
export function countPracticePerItem(
  items: ArchiveItem[],
  uploads: UploadEntry[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) {
    const iCode = item.code.trim().toLowerCase();
    map[item.code] = uploads
      .filter((u) => {
        const uCode = u.sheetCode.replace(/[\s\-_]/g, "").toLowerCase();
        const cleanI = iCode.replace(/[\s\-_]/g, "").toLowerCase();
        const isMatch = uCode === cleanI || uCode.includes(cleanI);
        return isMatch && u.kind === UPLOAD_KINDS.MY_PRACTICE;
      })
      .reduce(
        (sum, u) => sum + (u.imageUrls?.length ?? (u.imageUrl ? 1 : 0)),
        0
      );
  }
  return map;
}

/**
 * 群組級練習張數（圖片張數總和）。
 * @param items 試卷池
 * @param uploads 上傳記錄
 * @param groupOf 從 ArchiveItem 取出群組 key 的函式
 */
export function sumByGroup(
  items: ArchiveItem[],
  uploads: UploadEntry[],
  groupOf: (item: ArchiveItem) => string
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) {
    const groupKey = groupOf(item);
    if (!map[groupKey]) map[groupKey] = 0;

    const iCode = item.code.trim().toLowerCase();
    const count = uploads
      .filter((u) => {
        const uCode = u.sheetCode.replace(/[\s\-_]/g, "").toLowerCase();
        const cleanI = iCode.replace(/[\s\-_]/g, "").toLowerCase();
        return (
          (uCode === cleanI || uCode.includes(cleanI)) &&
          u.kind === UPLOAD_KINDS.MY_PRACTICE
        );
      })
      .reduce(
        (sum, u) => sum + (u.imageUrls?.length ?? (u.imageUrl ? 1 : 0)),
        0
      );

    map[groupKey] += count;
  }
  return map;
}
