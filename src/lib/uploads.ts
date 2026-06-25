import { sampleUploads } from "@/data/exam-content";
import { hasSupabaseEnv, getSupabaseAdmin } from "@/lib/supabase";
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
  weaknesses: string[];
  created_at: string;
};

function mapUpload(row: DbUploadRow): UploadEntry {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    sheetCode: row.sheet_code,
    imageUrl: row.image_url,
    kind: row.kind,
    authorName: row.author_name,
    scoreNote: row.score_note,
    weaknesses: row.weaknesses,
    createdAt: row.created_at,
  };
}

export async function getRecentUploads(): Promise<UploadEntry[]> {
  if (!hasSupabaseEnv) {
    return sampleUploads;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("practice_entries")
      .select("id, title, category, sheet_code, image_url, kind, author_name, score_note, weaknesses, created_at")
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return sampleUploads;
    }

    return data.map((row) => mapUpload(row as DbUploadRow));
  } catch (error) {
    console.error("Failed to load uploads from Supabase", error);
    return sampleUploads;
  }
}
