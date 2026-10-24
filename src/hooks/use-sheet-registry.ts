"use client";

import { useEffect, useState } from "react";
import { buildRegistryKey } from "@/lib/sheet-registry";
import type { SheetRecord, SheetRegistry } from "@/types/sheet-registry";

let cache: SheetRegistry | null = null;

function toRegistry(records: SheetRecord[]): SheetRegistry {
  const registry: SheetRegistry = {};
  for (const record of records) {
    registry[buildRegistryKey(record.sectionSlug, record.code, record.slot)] = record;
  }
  return registry;
}

/** 失效快取（建檔中心寫入後呼叫，讓下次開啟 Modal 立即反映） */
export function invalidateSheetRegistry(): void {
  cache = null;
}

export function useSheetRegistry(): {
  registry: SheetRegistry;
  isLoading: boolean;
} {
  const [registry, setRegistry] = useState<SheetRegistry>(cache ?? {});
  const [isLoading, setIsLoading] = useState(cache === null);

  useEffect(() => {
    let cancelled = false;
    if (cache) return;

    fetch("/api/sheets", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { records?: SheetRecord[] }) => {
        cache = toRegistry(data.records ?? []);
        if (!cancelled) setRegistry(cache);
      })
      .catch(() => {
        // 讀取失敗時以空 registry 降級，前台維持靜態圖行為
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { registry, isLoading };
}