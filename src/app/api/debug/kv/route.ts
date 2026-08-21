import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const listLen = await kv.llen("practice_entries");
    const raw = await kv.lrange("practice_entries", 0, 9);
    const parsed = raw.map((item: unknown, i: number) => {
      const s = String(item ?? "");
      return {
        i,
        type: typeof item,
        isString: typeof item === "string",
        preview: s.slice(0, 80),
        parsed: (() => {
          try { return JSON.parse(s); }
          catch { return null; }
        })(),
      };
    });

    return NextResponse.json({
      listLen,
      parsed,
      kvUrl: !!process.env.KV_REST_API_URL,
      kvToken: !!process.env.KV_REST_API_TOKEN,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
