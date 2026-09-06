import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { cloudinary, cloudinaryFolder, hasCloudinaryEnv } from "@/lib/cloudinary";
import { kvPushEntry, kvDeleteEntry, hasKvEnv } from "@/lib/kv-store";
import { UPLOAD_KIND_OPTIONS, UPLOAD_CATEGORY_OPTIONS, type UploadKindValue, type UploadCategoryValue } from "@/lib/upload-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 10 * 1024 * 1024;
const maxRequestSize = 50 * 1024 * 1024;
const rateLimitWindowMs = 60_000;
const rateLimitMax = 8;
const MAX_IMAGES_PER_SUBMISSION = 6;

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

  if (!hasKvEnv()) {
    return NextResponse.json(
      { message: "尚未連接 Vercel KV。請至 Vercel 啟用 KV 資料庫。" },
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
  // 多張上傳：僅「我的練習圖」支援，「他人作品參考」仍維持單張以維持信任鏈一致
  const multiImages = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
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

  // 收集要上傳的檔案：「我的練習圖」支援多張（最多 6 張），「他人作品參考」維持單張
  const filesToUpload: File[] = [];
  if (kind === "我的練習圖") {
    if (multiImages.length > 0) {
      filesToUpload.push(...multiImages.slice(0, MAX_IMAGES_PER_SUBMISSION));
    } else if (image instanceof File) {
      filesToUpload.push(image);
    }
  } else if (image instanceof File) {
    filesToUpload.push(image);
  }

  if (filesToUpload.length === 0) {
    return badRequest("請選擇至少一張圖片。");
  }

  for (const file of filesToUpload) {
    if (!allowedMimeTypes.has(file.type)) {
      return badRequest("僅支援 JPG、PNG、WEBP。");
    }
    if (file.size > maxFileSize) {
      return badRequest("單張圖片大小不可超過 10MB。");
    }
  }

  if (!title || !sheetCode) {
    return badRequest("請填寫圖面名稱與題號。");
  }

  if (!UPLOAD_CATEGORY_OPTIONS.includes(category as UploadCategoryValue)) {
    return badRequest("請選擇有效的類別。");
  }

  console.log("[uploads] 接收參數:", {
    title,
    category,
    sheetCode,
    kind,
    authorName,
    fileCount: filesToUpload.length,
  });

  if (!UPLOAD_KIND_OPTIONS.includes(kind as UploadKindValue)) {
    return badRequest("請選擇有效的圖像類型。");
  }

  if (!authorName) {
    return badRequest("請填寫作者名稱。");
  }

  // 1. 上傳所有圖片至 Cloudinary（並行）
  const uploadOne = (file: File) =>
    file.arrayBuffer().then((arrayBuffer) => {
      const buffer = Buffer.from(arrayBuffer);
      return new Promise<string>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: `${cloudinaryFolder}/${sheetCode}`,
              public_id: `${Date.now()}-${randomUUID()}`,
              resource_type: "image",
            },
            (error, result) => {
              if (error || !result)
                return reject(error ?? new Error("Cloudinary upload failed"));
              resolve(result.secure_url);
            },
          )
          .end(buffer);
      });
    });

  let uploadedUrls: string[];
  try {
    uploadedUrls = await Promise.all(filesToUpload.map(uploadOne));
  } catch (error) {
    console.error("[uploads] Cloudinary 上傳失敗:", error);
    return NextResponse.json(
      { message: "圖片上傳失敗，請稍後再試。" },
      { status: 502 },
    );
  }

  const imageUrl = uploadedUrls[0];
  const imageUrls = uploadedUrls.length > 1 ? uploadedUrls : undefined;

  // 2. Save metadata to Vercel KV
  console.log("[uploads] 圖片上傳成功，準備寫入 KV:", { title, sheetCode, imageUrl, total: uploadedUrls.length });
  try {
    await kvPushEntry({
      title,
      category,
      sheetCode,
      imageUrl,
      imageUrls,
      kind: kind as "我的練習圖" | "他人作品參考",
      authorName,
      scoreNote,
      teacherComment,
      weaknesses,
    });
    console.log("[uploads] KV 寫入成功:", { sheetCode });
  } catch (error) {
    console.error("[uploads] KV 寫入失敗:", error);
    return NextResponse.json(
      { message: "資料寫入失敗，請稍後再試。" },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "上傳完成。" });
}

// DELETE /api/uploads?id=xxx — 刪除指定記錄
export async function DELETE(request: Request) {
  if (!hasKvEnv()) {
    return NextResponse.json(
      { message: "尚未連接 Vercel KV。" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ message: "缺少 id 參數。" }, { status: 400 });
  }

  try {
    await kvDeleteEntry(id);
    return NextResponse.json({ message: "刪除完成。" });
  } catch (error) {
    console.error("[uploads] 刪除失敗:", error);
    return NextResponse.json({ message: "刪除失敗。" }, { status: 500 });
  }
}
