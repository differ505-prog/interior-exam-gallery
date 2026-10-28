import { randomUUID } from "crypto";
import { existsSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  cloudinary,
  cloudinaryFolder,
  hasCloudinaryEnv,
} from "@/lib/cloudinary";
import {
  hasSheetRegistryEnv,
  kvGetSheetRecords,
  kvSetSheetRecord,
} from "@/lib/sheet-registry-kv";
import {
  applyApprove,
  applyDiscard,
  applyRollback,
  applyStage,
  buildRegistryKey,
  createRecord,
} from "@/lib/sheet-registry";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { SheetRecord, SheetSlot } from "@/types/sheet-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 10 * 1024 * 1024;
const allowedSections = new Set([
  "plan",
  "ceiling-elevation",
  "perspective",
  "detail",
]);

/** curator 驗證：token 僅存在 server-side env，前端只在 request header 傳送 */
function isCurator(request: Request): boolean {
  const expected = process.env.CURATOR_TOKEN;
  if (!expected) return false;
  const received = request.headers.get("x-curator-token");
  return typeof received === "string" && received === expected;
}

function unauthorized() {
  return NextResponse.json(
    { message: "需要管理權限才能變更官方圖檔。" },
    { status: 401 },
  );
}

function serverNotReady(message: string) {
  return NextResponse.json({ message }, { status: 503 });
}

function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

/** 靜態圖磁碟探測：讓「缺圖」是真實結果，不是推測 */
function probeStatic(url: string | null): boolean {
  if (!url || !url.startsWith("/images/")) return false;
  const relative = url.replace(/^\/images\//, "");
  if (relative.includes("..")) return false;
  return existsSync(path.join(process.cwd(), "public", "images", relative));
}

/** 靜態圖路徑規則（與 sheet-reader.ts 保持一致，僅供探測用） */
function buildStaticUrl(
  sectionSlug: string,
  code: string,
  slot: SheetSlot,
): string {
  const questionNo = code.slice(0, 3);
  if (sectionSlug === "detail") {
    return slot === "question"
      ? `/images/${code}/${code}-question.jpg`
      : `/images/${code}/${code}-answer.jpg`;
  }
  if (sectionSlug === "perspective") return "";
  if (sectionSlug === "plan" || sectionSlug === "ceiling-elevation") {
    if (slot === "question") return `/images/plan/question-${questionNo}.jpg`;
    const variantMatch = code.match(/^\d{3}([A-Z])/);
    if (variantMatch) {
      return `/images/plan/requirement-${variantMatch[1]}.jpg`;
    }
  }
  return "";
}

/**
 * GET /api/sheets?probe=1
 * 回傳全部建檔記錄；probe=1 時額外回傳靜態圖存在與否（僅 curator 可取）
 */
export async function GET(request: Request) {
  const records = await kvGetSheetRecords();

  const probeParam = new URL(request.url).searchParams.get("probe");
  if (probeParam !== "1") {
    return NextResponse.json({ records });
  }

  if (!isCurator(request)) return unauthorized();

  const { examSections } = await import("@/data/exam-content");
  const liveKeys = new Set(
    records
      .filter((r) => r.url)
      .map((r) => buildRegistryKey(r.sectionSlug, r.code, r.slot)),
  );
  const probe: Record<string, boolean> = {};

  for (const section of examSections) {
    for (const item of section.items) {
      for (const slot of ["question", "answer"] as SheetSlot[]) {
        const key = buildRegistryKey(section.slug, item.code, slot);
        if (liveKeys.has(key)) continue;
        probe[key] = probeStatic(buildStaticUrl(section.slug, item.code, slot));
      }
    }
  }

  return NextResponse.json({ records, probe });
}

/**
 * POST /api/sheets  — 上傳新圖並置為「待核准」
 * formData: image, sectionSlug, code, slot
 */
export async function POST(request: Request) {
  if (!process.env.CURATOR_TOKEN) {
    return serverNotReady("尚未設定 CURATOR_TOKEN，無法建檔。");
  }
  if (!isCurator(request)) return unauthorized();
  if (!hasSheetRegistryEnv()) return serverNotReady("尚未連接 Vercel KV。");
  if (!hasCloudinaryEnv) return serverNotReady("尚未連接 Cloudinary。上傳暫停。");

  const limit = checkRateLimit("sheets", getClientIp(request), 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `操作過於頻繁。${limit.retryAfter} 秒後再試。` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("無法解析表單資料。");
  }

  const image = formData.get("image");
  const sectionSlug = String(formData.get("sectionSlug") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().slice(0, 40);
  const slot = String(formData.get("slot") ?? "").trim();

  if (!allowedSections.has(sectionSlug)) return badRequest("章節參數無效。");
  if (slot !== "question" && slot !== "answer") {
    return badRequest("頁面槽位無效。");
  }
  if (!/^[\w一-龥-]{1,40}$/.test(code)) return badRequest("題號格式無效。");
  if (!(image instanceof File) || image.size === 0) {
    return badRequest("請選擇圖片。");
  }
  if (!allowedMimeTypes.has(image.type)) {
    return badRequest("僅支援 JPG、PNG、WEBP。");
  }
  if (image.size > maxFileSize) return badRequest("單張圖片不可超過 10MB。");

  const buffer = Buffer.from(await image.arrayBuffer());
  let url: string;
  try {
    url = await new Promise<string>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `${cloudinaryFolder}/registry/${sectionSlug}`,
            public_id: `${Date.now()}-${randomUUID()}`,
            resource_type: "image",
          },
          (error, result) => {
            if (error || !result) return reject(error ?? new Error("upload failed"));
            resolve(result.secure_url);
          },
        )
        .end(buffer);
    });
  } catch (error) {
    console.error("[sheets] Cloudinary 上傳失敗:", error);
    return NextResponse.json(
      { message: "圖片上傳失敗，請稍後再試。" },
      { status: 502 },
    );
  }

  const now = new Date().toISOString();
  const targetKey = buildRegistryKey(sectionSlug, code, slot);
  const existing = (await kvGetSheetRecords()).find(
    (r) => buildRegistryKey(r.sectionSlug, r.code, r.slot) === targetKey,
  );
  const record: SheetRecord = applyStage(
    existing ?? createRecord(sectionSlug, code, slot, now),
    url,
    now,
  );

  await kvSetSheetRecord(record);
  return NextResponse.json({ message: "已上傳，等待核准。", record });
}

/**
 * PATCH /api/sheets — 核准 / 撤銷 / 回滾
 * body: { sectionSlug, code, slot, action: "approve" | "discard" | "rollback" }
 */
export async function PATCH(request: Request) {
  if (!process.env.CURATOR_TOKEN) {
    return serverNotReady("尚未設定 CURATOR_TOKEN，無法建檔。");
  }
  if (!isCurator(request)) return unauthorized();
  if (!hasSheetRegistryEnv()) return serverNotReady("尚未連接 Vercel KV。");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("無法解析請求內容。");
  }

  const sectionSlug = String(body.sectionSlug ?? "").trim();
  const code = String(body.code ?? "").trim().slice(0, 40);
  const slot = String(body.slot ?? "").trim();
  const action = String(body.action ?? "").trim();

  if (!allowedSections.has(sectionSlug)) return badRequest("章節參數無效。");
  if (slot !== "question" && slot !== "answer") {
    return badRequest("頁面槽位無效。");
  }

  const records = await kvGetSheetRecords();
  const targetKey = buildRegistryKey(sectionSlug, code, slot);
  const existing = records.find(
    (r) => buildRegistryKey(r.sectionSlug, r.code, r.slot) === targetKey,
  );
  if (!existing) return badRequest("找不到這筆建檔記錄。");

  const now = new Date().toISOString();
  const next =
    action === "approve"
      ? applyApprove(existing, now)
      : action === "discard"
        ? applyDiscard(existing, now)
        : action === "rollback"
          ? applyRollback(existing, now)
          : null;

  if (!next) return badRequest("動作無效。");
  if (next === existing) return badRequest("此動作不適用於目前狀態。");

  await kvSetSheetRecord(next);
  return NextResponse.json({ message: "已更新。", record: next });
}