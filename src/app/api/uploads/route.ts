import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { bucketName, getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";

export const runtime = "nodejs";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 10 * 1024 * 1024;

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv) {
    return NextResponse.json(
      {
        message:
          "目前尚未設定 Supabase 環境變數。請先填入 .env.local 並部署到 Vercel，才可啟用遠端上傳。",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const image = formData.get("image");
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const sheetCode = String(formData.get("sheetCode") || "").trim();
  const kind = String(formData.get("kind") || "").trim();
  const authorName = String(formData.get("authorName") || "").trim();
  const scoreNote = String(formData.get("scoreNote") || "").trim();
  const weaknesses = String(formData.get("weaknesses") || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!(image instanceof File)) {
    return NextResponse.json({ message: "請選擇一張圖片。" }, { status: 400 });
  }

  if (!allowedMimeTypes.has(image.type)) {
    return NextResponse.json({ message: "僅支援 JPG、PNG、WEBP。" }, { status: 400 });
  }

  if (image.size > maxFileSize) {
    return NextResponse.json({ message: "圖片大小不可超過 10MB。" }, { status: 400 });
  }

  if (
    !title ||
    !category ||
    !sheetCode ||
    !kind ||
    !authorName ||
    !scoreNote ||
    weaknesses.length === 0
  ) {
    return NextResponse.json({ message: "請完整填寫所有欄位。" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const extension = image.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeSheetCode = sheetCode.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "-");
  const path = `${safeSheetCode}/${Date.now()}-${randomUUID()}.${extension}`;
  const arrayBuffer = await image.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(path, arrayBuffer, {
      contentType: image.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { message: `圖片上傳失敗：${uploadError.message}` },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucketName).getPublicUrl(path);

  const { error: insertError } = await supabase.from("practice_entries").insert({
    title,
    category,
    sheet_code: sheetCode,
    image_url: publicUrl,
    kind,
    author_name: authorName,
    score_note: scoreNote,
    weaknesses,
  });

  if (insertError) {
    return NextResponse.json(
      { message: `資料寫入失敗：${insertError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "上傳完成。" });
}
