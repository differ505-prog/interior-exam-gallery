import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { hasKvEnv, kvGetRecentEntries } from "@/lib/kv-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sheetCode = searchParams.get("sheetCode");

  if (!hasKvEnv()) {
    return NextResponse.json({ error: "KV not configured" }, { status: 503 });
  }

  try {
    const all = await kvGetRecentEntries(200);

    if (sheetCode) {
      const filtered = all.filter(
        (u) =>
          u.sheetCode.trim().toLowerCase() ===
          sheetCode.trim().toLowerCase()
      );
      return NextResponse.json({
        total: all.length,
        filteredCount: filtered.length,
        sheetCode,
        matched: filtered,
        allCodes: [...new Set(all.map((u) => u.sheetCode))],
      });
    }

    return NextResponse.json({ total: all.length, allCodes: [...new Set(all.map((u) => u.sheetCode))] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
