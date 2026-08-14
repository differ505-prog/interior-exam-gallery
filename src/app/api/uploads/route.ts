import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { cloudinary, cloudinaryFolder, hasCloudinaryEnv } from "@/lib/cloudinary";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 10 * 1024 * 1024;
const maxRequestSize = 12 * 1024 * 1024;
const rateLimitWindowMs = 60_000;
const rateLimitMax = 8;

const categoryOptions = new Set([
  "平面圖 201-206",
  "天花板圖 / 立面圖",
  "透視圖 207-212",
  "大樣圖 213-224",
]);

const kindOptions = new Set(["我的練習圖", "他人範例圖", "他人作品參考"]);

const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);

  if (!bucket || bucket.resetAt < now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + rateLimitWindowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (bucket.count >= rateLimitMax) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfter: 0 };
}

function sanitizeSheetCode(value: string) {
  return value.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "-").slice(0, 40);
}

function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  if (!hasCloudinaryEnv) {
    return NextResponse.json(
      { message: "尚未連接 Cloudinary。上傳暫停。" },
      { status: 503 },
    );
  }

  const ip = getClientIp(request);
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `操作過於頻繁。${limit.retryAfter} 秒後再試。` },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter) },
      },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxRequestSize) {
    return badRequest("請求內容過大。");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("無法解析表單資料。");
  }

  const image = formData.get("image");
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const category = String(formData.get("category") ?? "").trim();
  const sheetCodeRaw = String(formData.get("sheetCode") ?? "").trim();
  const sheetCode = sanitizeSheetCode(sheetCodeRaw).slice(0, 40);
  const kind = String(formData.get("kind") ?? "").trim();
  const authorName = String(formData.get("authorName") ?? "").trim().slice(0, 60);
  const scoreNote = String(formData.get("scoreNote") ?? "").trim().slice(0, 600);
  const teacherComment = String(formData.get("teacherComment") ?? "").trim().slice(0, 600);
  const weaknesses = String(formData.get("weaknesses") ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 12);

  if (!(image instanceof File)) {
    return badRequest("請選擇一張圖片。");
  }

  if (!allowedMimeTypes.has(image.type)) {
    return badRequest("僅支援 JPG、PNG、WEBP。");
  }

  if (image.size <= 0) {
    return badRequest("圖片內容為空，請重新選擇。");
  }

  if (image.size > maxFileSize) {
    return badRequest("圖片大小不可超過 10MB。");
  }

  if (!title || !sheetCode) {
    return badRequest("請填寫圖面名稱與題號。");
  }

  if (!categoryOptions.has(category)) {
    return badRequest("請選擇有效的類別。");
  }

  if (!kindOptions.has(kind)) {
    return badRequest("請選擇有效的圖像類型。");
  }

  if (!authorName) {
    return badRequest("請填寫作者名稱。");
  }

  // Upload image to Cloudinary
  const arrayBuffer = await image.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const cloudinaryResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `${cloudinaryFolder}/${sheetCode}`,
          public_id: `${Date.now()}-${randomUUID()}`,
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
          resolve({ secure_url: result.secure_url });
        },
      )
      .end(buffer);
  });

  const imageUrl = cloudinaryResult.secure_url;

  // Save metadata to Supabase (create client inline to avoid bundling server key)
  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch {
    return NextResponse.json(
      { message: "伺服器尚未設定資料庫環境。" },
      { status: 503 },
    );
  }

  const { error: insertError } = await supabase.from("practice_entries").insert({
    title,
    category,
    sheet_code: sheetCode,
    image_url: imageUrl,
    kind,
    author_name: authorName,
    score_note: scoreNote,
    teacher_comment: teacherComment,
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
