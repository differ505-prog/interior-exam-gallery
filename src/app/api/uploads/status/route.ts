import { NextResponse } from "next/server";
import { hasCloudinaryEnv } from "@/lib/cloudinary";
import { hasKvEnv } from "@/lib/kv-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const kvReady = hasKvEnv();
  const cloudinaryReady = hasCloudinaryEnv;

  return NextResponse.json({
    ok: true,
    ready: cloudinaryReady && kvReady,
    cloudinary: cloudinaryReady,
    kv: kvReady,
  });
}
