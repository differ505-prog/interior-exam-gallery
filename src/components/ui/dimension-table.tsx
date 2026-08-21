"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Ruler, Plus, Trash2, ChevronDown, GripVertical } from "lucide-react";
import {
  type DimensionEntry,
  getDimensionEntries,
  addDimensionEntry,
  updateDimensionEntry,
  deleteDimensionEntry,
  reorderDimensionEntries,
} from "@/lib/dimension-table";

// ─── Sortable Row ─────────────────────────────────────────

type SortableRowProps = {
  entry: DimensionEntry;
  isEditing: boolean;
  editReal: string;
  editTool: string;
  editRealRef: React.RefObject<HTMLInputElement | null>;
  editToolRef: React.RefObject<HTMLInputElement | null>;
  onStartEdit: (e: DimensionEntry) => void;
  onRealChange: (v: string) => void;
  onToolChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onDelete: (id: string) => void;
};

function SortableRow({
  entry,
  isEditing,
  editReal,
  editTool,
  editRealRef,
  editToolRef,
  onStartEdit,
  onRealChange,
  onToolChange,
  onSave,
  onCancel,
  onKeyDown,
  onDelete,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="dimension-row dimension-row--editing"
        role="listitem"
      >
        <div className="dimension-row__drag-handle dimension-row__drag-handle--disabled" aria-hidden="true">
          <GripVertical size={14} />
        </div>
        <input
          ref={editRealRef}
          type="text"
          className="dimension-row__input"
          value={editReal}
          onChange={(e) => onRealChange(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="編輯實際尺寸"
        />
        <span className="dimension-row__arrow" aria-hidden="true">→</span>
        <input
          ref={editToolRef}
          type="text"
          className="dimension-row__input"
          value={editTool}
          onChange={(e) => onToolChange(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="編輯工具尺寸"
        />
        <button
          className="dimension-row__action dimension-row__action--save"
          onClick={onSave}
          aria-label="儲存"
          type="button"
        >
          儲存
        </button>
        <button
          className="dimension-row__action dimension-row__action--cancel"
          onClick={onCancel}
          aria-label="取消"
          type="button"
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="dimension-row"
      role="listitem"
    >
      <button
        className="dimension-row__drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`拖曳排序 ${entry.realSize} → ${entry.toolSize}`}
        type="button"
        title="拖曳排序"
      >
        <GripVertical size={14} />
      </button>

      <span
        className="dimension-row__real"
        title="點擊編輯"
        onClick={() => onStartEdit(entry)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onStartEdit(entry); }}
        aria-label={`編輯 ${entry.realSize} → ${entry.toolSize}`}
      >
        {entry.realSize || <em className="dimension-row__empty">—</em>}
      </span>
      <span className="dimension-row__arrow" aria-hidden="true">→</span>
      <span
        className="dimension-row__tool"
        title="點擊編輯"
        onClick={() => onStartEdit(entry)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onStartEdit(entry); }}
        aria-label={`編輯 ${entry.realSize} → ${entry.toolSize}`}
      >
        {entry.toolSize || <em className="dimension-row__empty">—</em>}
      </span>
      <button
        className="dimension-row__action dimension-row__action--delete"
        onClick={() => onDelete(entry.id)}
        aria-label={`刪除 ${entry.realSize} → ${entry.toolSize}`}
        type="button"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── DimensionTable ───────────────────────────────────────

export function DimensionTable() {
  const [entries, setEntries] = useState<DimensionEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // 新增列 input state
  const [draftReal, setDraftReal] = useState("");
  const [draftTool, setDraftTool] = useState("");
  const draftRealRef = useRef<HTMLInputElement>(null);
  const draftToolRef = useRef<HTMLInputElement>(null);

  // 編輯中的 row id
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReal, setEditReal] = useState("");
  const [editTool, setEditTool] = useState("");
  const editRealRef = useRef<HTMLInputElement | null>(null);
  const editToolRef = useRef<HTMLInputElement | null>(null);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ─── 讀取資料 ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getDimensionEntries();
      if (!cancelled) {
        setEntries(data);
        setIsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── 展開時自動 focus 新增列第一格 ───────────────────
  useEffect(() => {
    if (isExpanded && isLoaded && entries.length === 0) {
      setTimeout(() => draftRealRef.current?.focus(), 150);
    }
  }, [isExpanded, isLoaded, entries.length]);

  // ─── 拖曳結束 ──────────────────────────────────────────
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = entries.findIndex((e) => e.id === active.id);
    const newIndex = entries.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = [...entries];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);

    setEntries(next);
    setSaveStatus("saving");

    const orderedIds = next.map((e) => e.id);
    await reorderDimensionEntries(orderedIds);

    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [entries]);

  // ─── 新增列 ──────────────────────────────────────────
  const handleAdd = useCallback(async () => {
    const real = draftReal.trim();
    const tool = draftTool.trim();
    if (!real && !tool) return;

    const next = await addDimensionEntry(real, tool);
    if (next) {
      setEntries((prev) => [...prev, next]);
      setDraftReal("");
      setDraftTool("");
      draftRealRef.current?.focus();
    }
  }, [draftReal, draftTool]);

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  // ─── 刪除列 ──────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    const ok = await deleteDimensionEntry(id);
    if (ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  }, []);

  // ─── 開始編輯 ──────────────────────────────────────────
  const handleStartEdit = useCallback((entry: DimensionEntry) => {
    setEditingId(entry.id);
    setEditReal(entry.realSize);
    setEditTool(entry.toolSize);
    setSaveStatus("idle");
    setTimeout(() => {
      editRealRef.current?.focus();
      editRealRef.current?.select();
    }, 50);
  }, []);

  // ─── 儲存編輯 ──────────────────────────────────────────
  const handleSaveEdit = useCallback(async () => {
    if (!editingId) return;
    setSaveStatus("saving");

    const ok = await updateDimensionEntry(editingId, editReal, editTool);
    if (ok) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editingId
            ? { ...e, realSize: editReal.trim(), toolSize: editTool.trim() }
            : e
        )
      );
      setEditingId(null);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("idle");
    }
  }, [editingId, editReal, editTool]);

  // ─── 取消編輯 ──────────────────────────────────────────
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditReal("");
    setEditTool("");
    setSaveStatus("idle");
  }, []);

  // ─── 編輯鍵盤快捷 ────────────────────────────────────
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const count = entries.length;

  return (
    <section className="modal-section modal-section--notes">
      {/* 折疊觸發條 */}
      <button
        className="dimension-strip"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        aria-controls="dimension-table-body"
        type="button"
      >
        <span className="dimension-strip__icon">
          <Ruler size={15} />
        </span>
        <span className="dimension-strip__label">尺寸對照表</span>
        <span className="dimension-strip__count">
          {count > 0 ? `${count} 組` : "尚無資料"}
        </span>
        <ChevronDown
          size={15}
          className={`dimension-strip__chevron${isExpanded ? " dimension-strip__chevron--up" : ""}`}
          aria-hidden="true"
        />
      </button>

      {/* 展開內容 */}
      {isExpanded && (
        <div
          id="dimension-table-body"
          className="dimension-table-body"
        >
          {count === 0 ? (
            <p className="dimension-table-empty">
              尚無對照項目。直接輸入實際尺寸與工具尺寸，按 Enter 新增。
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={entries.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="dimension-table-rows" role="list">
                  {entries.map((entry) => (
                    <SortableRow
                      key={entry.id}
                      entry={entry}
                      isEditing={editingId === entry.id}
                      editReal={editReal}
                      editTool={editTool}
                      editRealRef={editRealRef}
                      editToolRef={editToolRef}
                      onStartEdit={handleStartEdit}
                      onRealChange={setEditReal}
                      onToolChange={setEditTool}
                      onSave={handleSaveEdit}
                      onCancel={handleCancelEdit}
                      onKeyDown={handleEditKeyDown}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* 新增列 */}
          <div className="dimension-add-row">
            <input
              ref={draftRealRef}
              type="text"
              className="dimension-add-row__input"
              value={draftReal}
              onChange={(e) => setDraftReal(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder="實際尺寸（如 90）"
              aria-label="實際尺寸"
              enterKeyHint="next"
            />
            <span className="dimension-add-row__arrow" aria-hidden="true">→</span>
            <input
              ref={draftToolRef}
              type="text"
              className="dimension-add-row__input"
              value={draftTool}
              onChange={(e) => setDraftTool(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder="工具尺寸（如 圈圈板18）"
              aria-label="工具尺寸"
              enterKeyHint="done"
            />
            <button
              className="dimension-add-row__btn"
              onClick={handleAdd}
              disabled={!draftReal.trim() && !draftTool.trim()}
              aria-label="新增尺寸對照"
              type="button"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* 儲存狀態提示 */}
          {saveStatus === "saving" && (
            <p className="dimension-status dimension-status--saving">儲存中…</p>
          )}
          {saveStatus === "saved" && (
            <p className="dimension-status dimension-status--saved">已同步</p>
          )}
        </div>
      )}
    </section>
  );
}
