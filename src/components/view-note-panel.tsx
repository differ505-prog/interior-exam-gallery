"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ViewNoteTarget } from "@/lib/view-note";
import { getViewNote, saveViewNote } from "@/lib/user-data";

type ViewNotePanelProps = {
  target: ViewNoteTarget;
};

/**
 * ViewNotePanel
 * 視角專用筆記面板：以 8 大工法視角為單位的共用筆記。
 * 同一視角的所有試卷（例如客廳立面圖 36 張、一消點透視圖 6 張）
 * 共用同一份筆記內容，跨版本跨試卷即時同步。
 */
export function ViewNotePanel({ target }: ViewNotePanelProps) {
  const [note, setNote] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetTypeRef = useRef(target.type);
  targetTypeRef.current = target.type;

  // 載入該視角的專用筆記
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const text = await getViewNote(target.type);
      if (cancelled) return;
      setNote(text);
    })();
    return () => {
      cancelled = true;
    };
  }, [target.type]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setNote(val);
      setSaveStatus("saving");

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        await saveViewNote(targetTypeRef.current, val);
        setSaveStatus("saved");
        window.dispatchEvent(
          new CustomEvent("view-note-changed", { detail: targetTypeRef.current })
        );
        setTimeout(() => setSaveStatus("idle"), 2000);
      }, 300);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <section className="modal-section modal-section--notes vnote-panel">
      <div className="vnote-panel__head">
        <div className="vnote-panel__title-wrap">
          <h3 className="section-title vnote-panel__title">
            {target.meta.title}
          </h3>
          <span className="vnote-panel__badge">
            工法專用 · {target.affectedCodes.length} {target.meta.sectionSlug === "detail" ? "題大樣跨題同步" : "張試卷跨卷同步"}
          </span>
        </div>
        <p className="vnote-panel__desc">{target.meta.description}</p>
      </div>

      <div className="vnote-panel__body">
        <textarea
          className="vnote-panel__input"
          value={note}
          onChange={handleChange}
          rows={4}
          aria-label={target.meta.title}
          placeholder={target.meta.placeholder}
        />
        {saveStatus === "saving" ? (
          <p className="vnote-panel__meta">儲存中…</p>
        ) : saveStatus === "saved" ? (
          <p className="vnote-panel__meta">
            已自動暫存並同步至所有{target.meta.sectionSlug === "detail" ? "大樣圖" : "同視角試卷"}
          </p>
        ) : note ? (
          <p className="vnote-panel__meta">輸入時自動儲存</p>
        ) : null}
      </div>

      <details className="vnote-panel__scope-list">
        <summary>
          查看跨{target.meta.sectionSlug === "detail" ? "題" : "卷"}同步範圍（{target.affectedCodes.length} {target.meta.sectionSlug === "detail" ? "題大樣圖" : "張試卷"}）
        </summary>
        <div className="vnote-panel__scope-codes">
          {target.affectedCodes.map((code) => (
            <span className="vnote-panel__scope-code" key={code}>
              {code}
            </span>
          ))}
        </div>
      </details>
    </section>
  );
}
