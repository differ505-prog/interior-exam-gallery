/**
 * dimension-table.ts — 尺寸對照表資料同步層
 *
 * 尺寸對照表是「跨所有平面圖共用」的資料，儲存於 Supabase public.dimension_entries 表。
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

export type DimensionEntry = {
  id: string;
  realSize: string;
  toolSize: string;
  sortOrder: number;
  createdAt: string;
};

// ─── localStorage 鍵名 ─────────────────────────────────────

const CACHE_KEY = "draft-gallery-dimension-table-v1";

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

// ─── localStorage 快取操作 ────────────────────────────────

/** 從快取讀取所有尺寸對照項目 */
export function getLocalDimensionEntries(): DimensionEntry[] {
  return safeGet<DimensionEntry[]>(CACHE_KEY, []);
}

/** 寫入快取（完整陣列） */
function setLocalDimensionEntries(entries: DimensionEntry[]) {
  safeSet(CACHE_KEY, entries);
}

// ─── Supabase 操作 ─────────────────────────────────────────

/** 從 Supabase 讀取該使用者的所有尺寸對照項目 */
export async function fetchRemoteDimensionEntries(): Promise<DimensionEntry[] | null> {
  const { supabase, isSupabaseConfigured } = await import("./supabase");

  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from("dimension_entries")
    .select("id, real_size, tool_size, sort_order, created_at")
    .order("sort_order", { ascending: true });

  if (error || !data) return null;

  return data.map((row) => ({
    id: row.id as string,
    realSize: row.real_size as string,
    toolSize: row.tool_size as string,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
  }));
}

/** 寫入單一項目至 Supabase（新增或更新） */
export async function saveRemoteDimensionEntry(
  entry: Omit<DimensionEntry, "createdAt"> & { createdAt?: string }
): Promise<{ id: string; ok: boolean }> {
  const { supabase, isSupabaseConfigured } = await import("./supabase");

  if (!isSupabaseConfigured || !supabase) return { id: "", ok: false };

  const { data, error } = await supabase
    .from("dimension_entries")
    .upsert(
      {
        id: entry.id || undefined,
        real_size: entry.realSize,
        tool_size: entry.toolSize,
        sort_order: entry.sortOrder,
      },
      { onConflict: "id" }
    )
    .select("id")
    .single();

  if (error) {
    console.warn("[dimension-table] Remote save failed:", error.message);
    return { id: entry.id, ok: false };
  }

  return { id: data.id as string, ok: true };
}

/** 刪除 Supabase 中的項目 */
export async function deleteRemoteDimensionEntry(id: string): Promise<boolean> {
  const { supabase, isSupabaseConfigured } = await import("./supabase");

  if (!isSupabaseConfigured || !supabase) return false;

  const { error } = await supabase
    .from("dimension_entries")
    .delete()
    .eq("id", id);

  if (error) {
    console.warn("[dimension-table] Remote delete failed:", error.message);
    return false;
  }

  return true;
}

// ─── 讀取：read-through cache ────────────────────────────

/**
 * 取得尺寸對照表
 * 優先 localStorage，若無則查 Supabase 並快取回 localStorage
 */
export async function getDimensionEntries(): Promise<DimensionEntry[]> {
  // Step 1：先取 localStorage
  const cached = getLocalDimensionEntries();
  if (cached.length > 0) return cached;

  // Step 2：查 Supabase
  const remote = await fetchRemoteDimensionEntries();
  if (remote && remote.length > 0) {
    setLocalDimensionEntries(remote);
    return remote;
  }

  // Step 3：降級 fallback（空資料）
  return [];
}

// ─── 新增項目 ─────────────────────────────────────────────

/**
 * 新增一列尺寸對照
 */
export async function addDimensionEntry(
  realSize: string,
  toolSize: string
): Promise<DimensionEntry | null> {
  const localEntries = getLocalDimensionEntries();
  const newEntry: DimensionEntry = {
    id: crypto.randomUUID(),
    realSize: realSize.trim(),
    toolSize: toolSize.trim(),
    sortOrder: localEntries.length,
    createdAt: new Date().toISOString(),
  };

  // 先寫 localStorage（同步，立即 UI 更新）
  const nextEntries = [...localEntries, newEntry];
  setLocalDimensionEntries(nextEntries);

  // 再寫 Supabase（背景）
  const { id, ok } = await saveRemoteDimensionEntry(newEntry);

  // 若遠端成功，用 server 返回的 id 更新本地（確保一致性）
  if (ok && id && id !== newEntry.id) {
    const updated = nextEntries.map((e) =>
      e.id === newEntry.id ? { ...e, id } : e
    );
    setLocalDimensionEntries(updated);
    return { ...newEntry, id };
  }

  // 無論遠端成功與否，本地已成功，回傳實體以便 UI 即時顯示
  return newEntry;
}

// ─── 更新項目 ─────────────────────────────────────────────

/**
 * 更新一列尺寸對照
 */
export async function updateDimensionEntry(
  id: string,
  realSize: string,
  toolSize: string
): Promise<boolean> {
  const localEntries = getLocalDimensionEntries();
  const index = localEntries.findIndex((e) => e.id === id);
  if (index === -1) return false;

  const updated: DimensionEntry = {
    ...localEntries[index],
    realSize: realSize.trim(),
    toolSize: toolSize.trim(),
  };

  // 更新 localStorage
  const nextEntries = [...localEntries];
  nextEntries[index] = updated;
  setLocalDimensionEntries(nextEntries);

  // 寫入 Supabase (不論成功與否，本地都算更新成功)
  await saveRemoteDimensionEntry(updated);
  return true;
}

// ─── 刪除項目 ─────────────────────────────────────────────

/**
 * 刪除一列尺寸對照
 */
export async function deleteDimensionEntry(id: string): Promise<boolean> {
  const localEntries = getLocalDimensionEntries();
  const nextEntries = localEntries.filter((e) => e.id !== id);

  // 更新 localStorage
  setLocalDimensionEntries(nextEntries);

  // 刪除 Supabase (不論成功與否，本地都算刪除成功)
  await deleteRemoteDimensionEntry(id);
  return true;
}

// ─── 重新排序 ─────────────────────────────────────────────

/**
 * 重新排序尺寸對照表（拖曳後觸發）
 * @param orderedIds 重新排序後的 id 陣列
 */
export async function reorderDimensionEntries(orderedIds: string[]): Promise<void> {
  const localEntries = getLocalDimensionEntries();

  // 建立 id → entry map
  const entryMap = new Map(localEntries.map((e) => [e.id, e]));

  // 依 orderedIds 順序重建陣列，並重新賦予 sortOrder
  const nextEntries: DimensionEntry[] = orderedIds
    .map((id, index) => {
      const entry = entryMap.get(id);
      if (!entry) return null;
      return { ...entry, sortOrder: index };
    })
    .filter((e): e is DimensionEntry => e !== null);

  // 寫入 localStorage
  setLocalDimensionEntries(nextEntries);

  // 同步寫入 Supabase（背景，失敗不阻斷）
  const { supabase, isSupabaseConfigured } = await import("./supabase");
  if (!isSupabaseConfigured || !supabase) return;

  // 批量 upsert
  const updates = nextEntries.map((e) => ({
    id: e.id,
    real_size: e.realSize,
    tool_size: e.toolSize,
    sort_order: e.sortOrder,
  }));

  const { error } = await supabase
    .from("dimension_entries")
    .upsert(updates, { onConflict: "id" });

  if (error) {
    console.warn("[dimension-table] Reorder sync failed:", error.message);
  }
}

// ─── 匿名簽入初始化 ───────────────────────────────────────

/**
 * 在 app 啟動時呼叫一次，確保匿名 session 已建立
 * 不影響功能正常運作（無 Supabase 時為 no-op）
 */
export async function initDimensionTableSync(): Promise<void> {
  const { ensureAnonymousSession, isSupabaseConfigured } = await import("./supabase");
  if (!isSupabaseConfigured) return;

  try {
    await ensureAnonymousSession();
  } catch {
    // 網路錯誤不影響功能
  }
}
