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
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to load uploads from Vercel KV", error);
    }
    return sampleUploads;
  }
}
