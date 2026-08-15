import { sampleUploads } from "@/data/exam-content";
import { kvGetRecentEntries, hasKvEnv } from "@/lib/kv-store";
import { UploadEntry } from "@/types/exam";

export async function getRecentUploads(): Promise<UploadEntry[]> {
  if (!hasKvEnv()) {
    return sampleUploads;
  }

  try {
    const entries = await kvGetRecentEntries(6);

    if (!entries || entries.length === 0) {
      return sampleUploads;
    }

    return entries;
  } catch (error) {
    console.error("[uploads] KV 讀取失敗:", error);
    return sampleUploads;
  }
}
