/**
 * user-data.ts — 跨裝置同步層
 *
 * 提供速記本（scratch_note）與教學資源（teaching_links）的
 * 雲端同步讀寫介面，具備 localStorage 降級機制。
 *
 * 同步策略（read-through cache）：
 *   讀取：優先取 localStorage → 若無或過期 → 查 Supabase → 回寫 localStorage
 *   寫入：直接寫 Supabase → 回寫 localStorage
 *   降級：Supabase 不可用時，純 localStorage 操作（不中斷功能）
 *
 * 支援匿名簽入（anonymous sign-in），
 * UUID 存入 sessionStorage，同瀏覽器復用，換機即同步。
 */

// ─── 型別 ──────────────────────────────────────────────────

export type TeachingLinkEntry = {
  /** slot key，如 "slot-0", "slot-1" */
  slot: string;
  url: string;
};

export type UserSheetData = {
  sheetCode: string;
  scratchNote: string;
  teachingLinks: string[]; // index-based: [slot-0-url, slot-1-url]
};

export type SheetDataMap = Record<string, UserSheetData>;

// ─── localStorage 鍵名 ─────────────────────────────────────

const LEGACY_SCRATCH_KEY = (code: string) => `scratch:${code}`;
const LEGACY_LINKS_KEY = "draft-gallery-teaching-links";
const CACHE_KEY = "draft-gallery-user-data-v2"; // 新版統一的快取鍵

// ─── 內部工具 ─────────────────────────────────────────────

/** 讀取 localStorage（安全包裝） */
function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** 寫入 localStorage（安全包裝） */
function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 配額不足或其他錯誤，靜默忽略
  }
}

/** 延遲 N ms */
function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

// ─── localStorage 快取操作 ────────────────────────────────

/**
 * 從新版統一 cache 讀取單一試卷資料
 */
export function getLocalSheetData(sheetCode: string): UserSheetData | null {
  const cache = safeGet<SheetDataMap>(CACHE_KEY, {});
  return cache[sheetCode] ?? null;
}

/**
 * 寫入單一試卷資料至新版 cache，並同時維護舊版 legacy 鍵
 */
export function setLocalSheetData(data: UserSheetData) {
  const cache = safeGet<SheetDataMap>(CACHE_KEY, {});
  cache[data.sheetCode] = data;
  safeSet(CACHE_KEY, cache);
  // 同步 legacy scratch（速記本遷移用）
  safeSet(LEGACY_SCRATCH_KEY(data.sheetCode), data.scratchNote);
}

/**
 * 從 legacy localStorage 讀取 teaching links（相容舊資料）
 */
export function getLocalTeachingLinks(sheetCode: string): string[] {
  const legacy = safeGet<Record<string, string[]>>(LEGACY_LINKS_KEY, {});
  return legacy[sheetCode] ?? [];
}

// ─── Supabase 操作 ─────────────────────────────────────────

/**
 * 從 Supabase 讀取指定試卷的使用者資料
 */
export async function fetchRemoteSheetData(
  sheetCode: string
): Promise<UserSheetData | null> {
  const { supabase, isSupabaseConfigured } = await import("./supabase");

  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from("user_data")
    .select("scratch_note, teaching_links")
    .eq("sheet_code", sheetCode)
    .maybeSingle();

  if (error || !data) return null;

  return {
    sheetCode,
    scratchNote: data.scratch_note ?? "",
    teachingLinks: (data.teaching_links as string[]) ?? [],
  };
}

/**
 * 寫入（或 upsert）單一試卷資料至 Supabase
 */
export async function saveRemoteSheetData(
  data: UserSheetData
): Promise<boolean> {
  const { supabase, isSupabaseConfigured } = await import("./supabase");

  if (!isSupabaseConfigured || !supabase) return false;

  const { error } = await supabase
    .from("user_data")
    .upsert(
      {
        sheet_code: data.sheetCode,
        scratch_note: data.scratchNote,
        teaching_links: data.teachingLinks,
      },
      { onConflict: "user_id,sheet_code" }
    );

  if (error) {
    console.warn("[user-data] Remote save failed:", error.message);
    return false;
  }
  return true;
}

// ─── 讀取：read-through cache ─────────────────────────────

/**
 * 取得試卷資料（速記本 + 教學連結）
 * 優先 localStorage，若無則查 Supabase 並快取回 localStorage
 */
export async function getSheetData(
  sheetCode: string
): Promise<UserSheetData> {
  // Step 1：先取 localStorage
  const cached = getLocalSheetData(sheetCode);
  if (cached) return cached;

  // Step 2：查 Supabase
  const remote = await fetchRemoteSheetData(sheetCode);
  if (remote) {
    setLocalSheetData(remote);
    return remote;
  }

  // Step 3：降級 fallback（空白資料，嘗試遷移 legacy）
  const legacyScratch = safeGet<string>(LEGACY_SCRATCH_KEY(sheetCode), "");
  const legacyLinks = getLocalTeachingLinks(sheetCode);
  const fallback: UserSheetData = {
    sheetCode,
    scratchNote: legacyScratch,
    teachingLinks: legacyLinks,
  };
  setLocalSheetData(fallback);
  return fallback;
}

// ─── 寫入：雲端優先 + localStorage 兜底 ─────────────────

/**
 * 儲存速記本
 * 寫入 Supabase → 回寫 localStorage
 */
export async function saveScratchNote(
  sheetCode: string,
  note: string
): Promise<void> {
  // 寫入 Supabase（背景）
  const remoteOk = await saveRemoteSheetData({ sheetCode, scratchNote: note, teachingLinks: [] });

  // 讀取現有快取，取出 teachingLinks 保留
  const cached = getLocalSheetData(sheetCode);
  const teachingLinks = cached?.teachingLinks ?? [];

  // 寫入 localStorage（同步，確保即時 UI 更新）
  setLocalSheetData({ sheetCode, scratchNote: note, teachingLinks });

  // 若遠端寫入成功，立刻同步 teachingLinks（避免覆蓋）
  if (remoteOk) {
    await saveRemoteSheetData({ sheetCode, scratchNote: note, teachingLinks });
  }
}

/**
 * 儲存教學連結（完整 slot 陣列）
 * 寫入 Supabase → 回寫 localStorage
 */
export async function saveTeachingLinks(
  sheetCode: string,
  links: string[]
): Promise<void> {
  const remoteOk = await saveRemoteSheetData({ sheetCode, scratchNote: "", teachingLinks: links });

  const cached = getLocalSheetData(sheetCode);
  const scratchNote = cached?.scratchNote ?? "";

  setLocalSheetData({ sheetCode, scratchNote, teachingLinks: links });

  if (remoteOk) {
    await saveRemoteSheetData({ sheetCode, scratchNote, teachingLinks: links });
  }
}

// ─── 匿名簽入初始化 ───────────────────────────────────────

/**
 * 在 app 啟動時呼叫一次，確保匿名 session 已建立
 * 不影響功能正常運作（無 Supabase 時為 no-op）
 */
export async function initUserDataSync(): Promise<void> {
  const { ensureAnonymousSession, isSupabaseConfigured } = await import("./supabase");
  if (!isSupabaseConfigured) return;

  try {
    await ensureAnonymousSession();
  } catch {
    // 網路錯誤不影響功能
  }
}
