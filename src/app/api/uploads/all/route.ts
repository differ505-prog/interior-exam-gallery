import { NextResponse } from "next/server";
import { kvGetAllEntries, hasKvEnv } from "@/lib/kv-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasKvEnv()) {
    return NextResponse.json({ entries: [] });
  }

  try {
    const entries = await kvGetAllEntries();
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("[uploads/all] 讀取失敗:", error);
    return NextResponse.json({ entries: [] });
  }
}
