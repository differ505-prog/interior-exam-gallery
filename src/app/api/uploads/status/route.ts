import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, ready: hasSupabaseEnv });
}
