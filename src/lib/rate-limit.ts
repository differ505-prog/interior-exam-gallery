/**
 * rate-limit.ts
 *
 * 極簡記憶體限流（單一 instance 適用，Serverless 每實例獨立計數）。
 *
 * 注意：本輪僅供 /api/sheets 使用。
 * /api/uploads 既有實作本輪不重構，避免改動核心商業邏輯（憲法第十一條）。
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit(
  scope: string,
  ip: string,
  max: number,
  windowMs: number,
): { allowed: boolean; retryAfter: number } {
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfter: 0 };
}