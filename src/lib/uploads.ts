import { sampleUploads } from "@/data/exam-content";
import { createClient } from "@supabase/supabase-js";
import { UploadEntry } from "@/types/exam";

type DbUploadRow = {
  id: string;
  title: string;
  category: string;
  sheet_code: string;
  image_url: string;
  kind: UploadEntry["kind"];
  author_name: string;
  score_note: string;
  teacher_comment: string;
  weaknesses: string[];
  created_at: string;
};

const ALLOWED_KINDS: ReadonlySet<string> = new Set([
  "我的練習圖",
  "他人範例圖",
  "他人作品參考",
]);

function mapUpload(row: DbUploadRow): UploadEntry | null {
  if (!ALLOWED_KINDS.has(row.kind)) {
    return null;
  }

  const created = new Date(row.created_at);
  if (Number.isNaN(created.getTime())) {
    return null;
  }

  // Normalize "他人範例圖" to "他人作品參考" for UI consistency
  let mappedKind = row.kind as UploadEntry["kind"];
  if (row.kind === "他人範例圖") {
    mappedKind = "他人作品參考";
  }

  return {
    id: String(row.id),
    title: String(row.title ?? "").trim() || "未命名圖面",
    category: String(row.category ?? "").trim() || "未分類",
    sheetCode: String(row.sheet_code ?? "").trim() || "—",
    imageUrl: String(row.image_url ?? "").trim(),
    kind: mappedKind,
    authorName: String(row.author_name ?? "").trim() || "匿名",
    scoreNote: String(row.score_note ?? "").trim(),
    teacherComment: String(row.teacher_comment ?? "").trim(),
    weaknesses: Array.isArray(row.weaknesses)
      ? row.weaknesses.filter((w): w is string => typeof w === "string" && w.trim().length > 0)
      : [],
    createdAt: created.toISOString(),
  };
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function getRecentUploads(): Promise<UploadEntry[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return sampleUploads;
  }

  try {
    const { data, error } = await supabase
      .from("practice_entries")
      .select(
        "id, title, category, sheet_code, image_url, kind, author_name, score_note, teacher_comment, weaknesses, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return sampleUploads;
    }

    const mapped = data
      .map((row) => mapUpload(row as DbUploadRow))
      .filter((item): item is UploadEntry => item !== null);

    return mapped.length > 0 ? mapped : sampleUploads;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to load uploads from Supabase", error);
    }
    return sampleUploads;
  }
}
