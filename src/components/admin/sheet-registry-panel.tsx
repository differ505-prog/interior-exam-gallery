"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  LoaderCircle,
  Lock,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import {
  EmptyState,
  Eyebrow,
  Heading,
  SkeletonGrid,
  SurfacePanel,
} from "@/components/ui/primitives";
import { SheetReader } from "@/components/sheet-reader";
import { compressImage, formatBytes } from "@/lib/image-compress";
import {
  clearCuratorToken,
  getCuratorToken,
  setCuratorToken,
} from "@/lib/curator-token";
import {
  buildRegistryKey,
  buildSectionCoverage,
  buildSlotStatus,
  REGISTRY_SECTIONS,
} from "@/lib/sheet-registry";
import { invalidateSheetRegistry } from "@/hooks/use-sheet-registry";
import type {
  SheetRecord,
  SheetRegistry,
  SheetSlot,
  SheetSlotStatus,
} from "@/types/sheet-registry";
import type { SheetDoc } from "@/types/sheet";
import { examSections } from "@/data/exam-content";

type PatchAction = "approve" | "discard" | "rollback";

type SheetDocPreview = { code: string; doc: SheetDoc };

const SLOT_LABELS: { slot: SheetSlot; label: string }[] = [
  { slot: "question", label: "題目圖" },
  { slot: "answer", label: "答案圖" },
];

/** 狀態燈文案（中文），與 CSS 四個狀態一對一 */
const STATE_LABELS: Record<SheetSlotStatus["state"], string> = {
  missing: "缺圖",
  live: "已生效",
  pending: "待核准",
  "rollback-ready": "可回滾",
};

function toRegistry(records: SheetRecord[]): SheetRegistry {
  const registry: SheetRegistry = {};
  for (const record of records) {
    registry[buildRegistryKey(record.sectionSlug, record.code, record.slot)] = record;
  }
  return registry;
}

export function SheetRegistryPanel() {
  const [token, setToken] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [sectionSlug, setSectionSlug] = useState<string>(REGISTRY_SECTIONS[0].slug);
  const [registry, setRegistry] = useState<SheetRegistry>({});
  const [probe, setProbe] = useState<Record<string, boolean>>({});
  const [records, setRecords] = useState<SheetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<SheetDocPreview | null>(null);

  const authHeaders = useCallback(
    () => ({ "x-curator-token": getCuratorToken() }),
    [],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sheets?probe=1", {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (response.status === 401) {
        setIsAuthed(false);
        return;
      }
      const data = (await response.json()) as {
        records?: SheetRecord[];
        probe?: Record<string, boolean>;
      };
      const nextRecords = data.records ?? [];
      setRecords(nextRecords);
      setRegistry(toRegistry(nextRecords));
      setProbe(data.probe ?? {});
      setIsAuthed(true);
    } catch {
      setMessage("讀取建檔資料失敗，請確認網路與 KV 連線。");
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    setToken(getCuratorToken());
    if (getCuratorToken()) void load();
    else setIsLoading(false);
  }, [load]);

  const items = useMemo(
    () => examSections.find((s) => s.slug === sectionSlug)?.items ?? [],
    [sectionSlug],
  );

  const coverage = useMemo(
    () => buildSectionCoverage(sectionSlug, items, registry, probe),
    [sectionSlug, items, registry, probe],
  );

  /** 待處理清單：缺圖優先，其後為已有建檔記錄的題號，去重後依序顯示 */
  const cellCodes = useMemo(() => {
    const list = [
      ...coverage.missingCodes,
      ...records.filter((r) => r.sectionSlug === sectionSlug).map((r) => r.code),
    ];
    return Array.from(new Set(list));
  }, [coverage.missingCodes, records, sectionSlug]);

  const handleUnlock = () => {
    setCuratorToken(token.trim());
    void load();
  };

  const handleSignOut = () => {
    clearCuratorToken();
    setToken("");
    setIsAuthed(false);
    setRegistry({});
    setProbe({});
    setRecords([]);
    setMessage(null);
  };

  const upload = async (code: string, slot: SheetSlot, file: File) => {
    const key = buildRegistryKey(sectionSlug, code, slot);
    setBusyKey(key);
    setMessage(null);
    try {
      const result = await compressImage(file);
      const body = new FormData();
      body.append(
        "image",
        result.blob,
        `${file.name.replace(/\.[^.]+$/, "")}.webp`,
      );
      body.append("sectionSlug", sectionSlug);
      body.append("code", code);
      body.append("slot", slot);

      const response = await fetch("/api/sheets", {
        method: "POST",
        headers: authHeaders(),
        body,
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(data.message ?? "上傳失敗。");
        return;
      }
      setMessage(
        `${code} ${slot === "question" ? "題目圖" : "答案圖"} 已上傳，待核准（原檔 ${formatBytes(result.originalBytes)} → ${formatBytes(result.outputBytes)}）。`,
      );
      await load();
    } catch {
      setMessage("上傳失敗，請稍後再試。");
    } finally {
      setBusyKey(null);
    }
  };

  const patch = async (code: string, slot: SheetSlot, action: PatchAction) => {
    const key = buildRegistryKey(sectionSlug, code, slot);
    setBusyKey(key);
    try {
      const response = await fetch("/api/sheets", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ sectionSlug, code, slot, action }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(data.message ?? "操作失敗。");
        return;
      }
      setMessage(data.message ?? "已更新。");
      if (action === "approve") invalidateSheetRegistry();
      await load();
    } catch {
      setMessage("操作失敗，請稍後再試。");
    } finally {
      setBusyKey(null);
    }
  };

  if (!isAuthed) {
    return (
      <SurfacePanel className="registry-gate">
        <Eyebrow>建檔中心</Eyebrow>
        <Heading level={2}>輸入管理密碼以繼續</Heading>
        <p className="registry-gate__desc">建檔會變更全站試卷圖檔，僅限管理者操作。</p>
        <div className="registry-gate__field">
          <label className="form-field__label" htmlFor="registry-token">
            管理密碼
          </label>
          <input
            id="registry-token"
            type="password"
            className="registry-input"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="管理密碼"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUnlock();
            }}
          />
        </div>
        <button type="button" className="submit-button" onClick={handleUnlock}>
          <Lock size={16} /> 驗證並進入
        </button>
        {message ? <p className="form-message">{message}</p> : null}
      </SurfacePanel>
    );
  }

  return (
    <SurfacePanel className="registry-panel">
      <header className="registry-header">
        <div>
          <Eyebrow>建檔中心</Eyebrow>
          <Heading level={2}>試卷圖檔建檔</Heading>
        </div>
        <button type="button" className="ghost-link" onClick={handleSignOut}>
          登出
        </button>
      </header>

      <nav className="registry-tabs" aria-label="試卷區塊">
        {REGISTRY_SECTIONS.map((section) => (
          <button
            key={section.slug}
            type="button"
            className={`registry-tab${sectionSlug === section.slug ? " registry-tab--active" : ""}`}
            aria-current={sectionSlug === section.slug ? "true" : undefined}
            onClick={() => setSectionSlug(section.slug)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <div className="registry-summary">
        <span>
          題目圖備妥 <strong>{coverage.questionReady}</strong> / {coverage.totalCodes}
        </span>
        <span>
          答案圖備妥 <strong>{coverage.answerReady}</strong> / {coverage.totalCodes}
        </span>
        <span>
          待核准 <strong>{coverage.pendingCount}</strong>
        </span>
        <span>
          缺圖 <strong>{coverage.missingCodes.length}</strong>
        </span>
      </div>

      {message ? <p className="form-message">{message}</p> : null}

      {isLoading ? (
        <SkeletonGrid count={6} height={180} ariaLabel="載入建檔資料中" />
      ) : cellCodes.length === 0 ? (
        <EmptyState
          title="此區塊圖檔已完備"
          description="所有試卷的題目圖與答案圖皆已建檔，無待處理項目。"
        />
      ) : (
        <ul className="registry-grid">
          {cellCodes.map((code) => (
            <RegistryCell
              key={code}
              code={code}
              sectionSlug={sectionSlug}
              registry={registry}
              busyKey={busyKey}
              onUpload={upload}
              onPatch={patch}
              onPreview={setPreview}
            />
          ))}
        </ul>
      )}

      {preview ? (
        <div className="registry-preview" role="dialog" aria-label={`${preview.code} 預覽`}>
          <button
            type="button"
            className="registry-preview__close"
            onClick={() => setPreview(null)}
          >
            <X size={18} /> 關閉預覽
          </button>
          <SheetReader doc={preview.doc} />
        </div>
      ) : null}
    </SurfacePanel>
  );
}

function RegistryCell({
  code,
  sectionSlug,
  registry,
  busyKey,
  onUpload,
  onPatch,
  onPreview,
}: {
  code: string;
  sectionSlug: string;
  registry: SheetRegistry;
  busyKey: string | null;
  onUpload: (code: string, slot: SheetSlot, file: File) => Promise<void>;
  onPatch: (code: string, slot: SheetSlot, action: PatchAction) => Promise<void>;
  onPreview: (preview: SheetDocPreview) => void;
}) {
  const doc = useMemo<SheetDoc>(
    () => ({
      code,
      sectionSlug,
      pages: SLOT_LABELS.map(({ slot, label }) => ({
        url: registry[buildRegistryKey(sectionSlug, code, slot)]?.url ?? "",
        label,
        alt: `${code} ${label}`,
      })).filter((page) => Boolean(page.url)),
    }),
    [code, sectionSlug, registry],
  );

  const hasLivePage = doc.pages.length > 0;

  return (
    <li className="registry-cell">
      <div className="registry-cell__head">
        <span className="registry-cell__code">{code}</span>
        <span className="registry-cell__section">{sectionSlug}</span>
      </div>

      {SLOT_LABELS.map(({ slot, label }) => {
        const key = buildRegistryKey(sectionSlug, code, slot);
        const status: SheetSlotStatus = buildSlotStatus(registry[key], slot);
        const isBusy = busyKey === key;

        return (
          <div key={slot} className="registry-slot">
            <div className="registry-slot__head">
              <span className="registry-slot__label">{label}</span>
              <span className={`registry-status registry-status--${status.state}`}>
                {STATE_LABELS[status.state]}
              </span>
            </div>

            <SafeImage
              src={status.liveUrl ?? status.pendingUrl}
              alt={`${code} ${label}`}
              aspectRatio="4 / 3"
              objectFit="contain"
              fallbackLabel={status.state === "missing" ? "尚未建檔" : label}
            />

            <label className="registry-upload">
              <Upload size={14} />
              <span>選擇圖片</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isBusy}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void onUpload(code, slot, file);
                }}
              />
            </label>

            <div className="registry-slot__actions">
              {status.canApprove ? (
                <>
                  <button
                    type="button"
                    className="ghost-link"
                    disabled={isBusy}
                    onClick={() => void onPatch(code, slot, "approve")}
                  >
                    <CheckCircle2 size={14} /> 核准
                  </button>
                  <button
                    type="button"
                    className="ghost-link"
                    disabled={isBusy}
                    onClick={() => void onPatch(code, slot, "discard")}
                  >
                    <X size={14} /> 撤銷
                  </button>
                </>
              ) : null}
              {status.canRollback ? (
                <button
                  type="button"
                  className="ghost-link"
                  disabled={isBusy}
                  onClick={() => void onPatch(code, slot, "rollback")}
                >
                  <RotateCcw size={14} /> 回滾上一版
                </button>
              ) : null}
              {isBusy ? (
                <LoaderCircle size={14} className="registry-spinner" />
              ) : null}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        className="registry-preview-button"
        disabled={!hasLivePage}
        onClick={() => onPreview({ code, doc })}
      >
        <Eye size={14} /> 預覽生效圖
      </button>
    </li>
  );
}