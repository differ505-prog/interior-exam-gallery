"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getQuestionNote, saveQuestionNote } from "@/lib/user-data";

type QuestionNotePanelProps = {
  /** 題號，例如 "206" */
  question: string;
  /** 受影響的試卷 code 清單（42 筆），用於展開同步範圍 */
  affectedCodes: string[];
};

/**
 * QuestionNotePanel
 * 題型筆記面板：以題號（201–206）為單位的共用筆記。
 * 同一題號的所有試卷（平面圖 6 張 + 天花板與立面 36 張）共用同一份內容。
 */
export function QuestionNotePanel({ question, affectedCodes }: QuestionNotePanelProps) {
  const [note, setNote] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionRef = useRef(question);
  questionRef.current = question;

  // 載入題型筆記
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const text = await getQuestionNote(question);
      if (cancelled) return;
      setNote(text);
    })();
    return () => {
      cancelled = true;
    };
  }, [question]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    setSaveStatus("saving");

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await saveQuestionNote(questionRef.current, val);
      setSaveStatus("saved");
      window.dispatchEvent(
        new CustomEvent("question-note-changed", { detail: questionRef.current })
      );
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <section className="modal-section modal-section--notes">
      <div className="qnote-panel__head">
        <h3 className="section-title qnote-panel__title">題型筆記（{question}）</h3>
        <span className="qnote-panel__scope">跨版本共用 · {affectedCodes.length} 張試卷同步</span>
      </div>

      <div className="qnote-panel__body">
        <textarea
          className="qnote-panel__input"
          value={note}
          onChange={handleChange}
          rows={4}
          aria-label={`${question} 題型筆記`}
          placeholder={`${question} 題型的共通提醒：空間條件、尺寸基準、尺寸鏈、易錯處。寫一次，${question}A~${question}F 與天花立面 ${question} 系列全部同步。`}
        />
        {saveStatus === "saving" ? (
          <p className="qnote-panel__meta">儲存中…</p>
        ) : saveStatus === "saved" ? (
          <p className="qnote-panel__meta">已自動暫存並同步至同題型試卷</p>
        ) : note ? (
          <p className="qnote-panel__meta">輸入時自動儲存</p>
        ) : null}
      </div>

      <details className="qnote-panel__scope-list">
        <summary>查看同步範圍（{affectedCodes.length} 張）</summary>
        <div className="qnote-panel__scope-codes">
          {affectedCodes.map((code) => (
            <span className="qnote-panel__scope-code" key={code}>
              {code}
            </span>
          ))}
        </div>
      </details>
    </section>
  );
}
