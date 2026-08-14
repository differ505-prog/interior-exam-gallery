import { NextResponse } from "next/server";
import { hasCloudinaryEnv } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, ready: hasCloudinaryEnv });
}
