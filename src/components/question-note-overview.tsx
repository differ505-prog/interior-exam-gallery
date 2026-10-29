"use client";

import { useCallback, useEffect, useState } from "react";
import { getQuestionNote } from "@/lib/user-data";
import { QUESTION_NOTE_QUESTIONS } from "@/lib/question-note";

type QuestionNoteOverviewProps = {
  /** 目前選取的題號，用於標示 highlight（aria-current） */
  activeQuestion?: string;
  /** 點擊某一格時切換題號篩選 */
  onSelectQuestion?: (question: string) => void;
};

/**
 * QuestionNoteOverview
 * 201–206 六格總覽：讓使用者不必開任何 Modal 就知道哪一題型已經寫過筆記。
 * 資料來源為題型筆記儲存層（qtype- 命名空間），與 Modal 面板同一份內容。
 */
export function QuestionNoteOverview({ activeQuestion, onSelectQuestion }: QuestionNoteOverviewProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const entries = await Promise.all(
      QUESTION_NOTE_QUESTIONS.map(async (q) => [q, await getQuestionNote(q)] as const)
    );
    setNotes(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    void load();
    const handler = () => {
      void load();
    };
    window.addEventListener("question-note-changed", handler);
    return () => window.removeEventListener("question-note-changed", handler);
  }, [load]);

  return (
    <div className="qnote-overview">
      <div className="qnote-overview__head">
        <p className="qnote-overview__title">題型筆記（201–206 題號共用）</p>
        <p className="qnote-overview__title">點選題號可切換上方篩選</p>
      </div>

      <div className="qnote-overview__grid">
        {QUESTION_NOTE_QUESTIONS.map((question) => {
          const text = (notes[question] ?? "").trim();
          const hasNote = text.length > 0;
          const isActive = activeQuestion === question;
          return (
            <button
              key={question}
              type="button"
              className={`qnote-overview__cell${isActive ? " qnote-overview__cell--active" : ""}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => onSelectQuestion?.(question)}
            >
              <span className="qnote-overview__num">{question}</span>
              <span className="qnote-overview__status">
                <span
                  className={`qnote-overview__dot${hasNote ? " qnote-overview__dot--filled" : ""}`}
                  aria-hidden="true"
                />
                {hasNote ? `已記錄 ${text.length} 字` : "尚未記錄"}
              </span>
              {hasNote ? (
                <p className="qnote-overview__preview">{text}</p>
              ) : (
                <p className="qnote-overview__empty">點試卷卡的詳情開始記錄</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
