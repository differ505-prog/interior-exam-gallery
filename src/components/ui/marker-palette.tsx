"use client";

import { useState } from "react";
import { Palette, Plus, X, Edit3, Check, ChevronDown } from "lucide-react";

const STORAGE_KEY = "draft-gallery-marker-palette";

const BRANDS = [
  { value: "Copic", label: "Copic" },
  { value: "Touch", label: "Touch 油性" },
  { value: "雄獅", label: "雄獅" },
  { value: "其他", label: "其他" },
] as const;

const TYPES = [
  { value: "酒精", label: "酒精（暈染佳）" },
  { value: "水性", label: "水性（線條佳）" },
  { value: "代針筆", label: "代針筆（輪廓線）" },
] as const;

export type Marker = {
  id: string;
  brand: string;
  number: string;
  type: string;
  swatch: string;
  note: string;
};

function loadMarkers(): Marker[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMarkers(markers: Marker[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(markers));
  } catch {
    // ignore
  }
}

function isValidHex(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
}

type Mode = "view" | "add" | "edit";

export function MarkerPalette() {
  const [markers, setMarkers] = useState<Marker[]>(loadMarkers);
  const [mode, setMode] = useState<Mode>("view");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({ brand: "Copic", number: "", type: "酒精", swatch: "#876F49", note: "" });
  const [formError, setFormError] = useState("");
  const [typeOpen, setTypeOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);

  const resetForm = () => {
    setForm({ brand: "Copic", number: "", type: "酒精", swatch: "#876F49", note: "" });
    setFormError("");
  };

  const handleAdd = () => {
    const trimmed = form.number.trim();
    if (!trimmed) { setFormError("請填入色號"); return; }
    if (!isValidHex(form.swatch)) { setFormError("請填入正確色碼，如 #876F49"); return; }
    const exists = markers.some((m) => m.brand === form.brand && m.number === trimmed);
    if (exists) { setFormError("此色號已存在"); return; }

    const next: Marker = {
      id: crypto.randomUUID(),
      brand: form.brand,
      number: trimmed,
      type: form.type,
      swatch: form.swatch,
      note: form.note.trim(),
    };
    const updated = [...markers, next];
    setMarkers(updated);
    saveMarkers(updated);
    resetForm();
    setMode("view");
  };

  const handleDelete = (id: string) => {
    const updated = markers.filter((m) => m.id !== id);
    setMarkers(updated);
    saveMarkers(updated);
  };

  const handleEdit = (id: string) => {
    const m = markers.find((m) => m.id === id);
    if (!m) return;
    setForm({ brand: m.brand, number: m.number, type: m.type, swatch: m.swatch, note: m.note });
    setFormError("");
    setEditingId(id);
  };

  const handleUpdate = () => {
    if (!editingId) return;
    const trimmed = form.number.trim();
    if (!trimmed) { setFormError("請填入色號"); return; }
    if (!isValidHex(form.swatch)) { setFormError("請填入正確色碼，如 #876F49"); return; }
    const exists = markers.some((m) => m.id !== editingId && m.brand === form.brand && m.number === trimmed);
    if (exists) { setFormError("此色號已存在"); return; }

    const updated = markers.map((m) =>
      m.id === editingId
        ? { ...m, brand: form.brand, number: trimmed, type: form.type, swatch: form.swatch, note: form.note.trim() }
        : m
    );
    setMarkers(updated);
    saveMarkers(updated);
    setEditingId(null);
    resetForm();
  };

  const handleCancel = () => {
    setMode("view");
    setEditingId(null);
    resetForm();
  };

  const swatchStyle = (color: string) => ({
    background: color,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  });

  return (
    <div className="marker-palette">
      {/* Header */}
      <div className="marker-palette__header">
        <span className="marker-palette__icon">
          <Palette size={15} />
        </span>
        <span className="marker-palette__label">我的麥克筆資料庫</span>
        <span className="marker-palette__count">{markers.length} 支</span>
        {mode === "view" && (
          <button
            className="marker-palette__add-trigger"
            onClick={() => setMode("add")}
            aria-label="新增麥克筆"
          >
            <Plus size={14} />
            <span>新增</span>
          </button>
        )}
      </div>

      {/* Empty state */}
      {markers.length === 0 && mode === "view" && (
        <div className="marker-palette__empty">
          <p>還沒有建立任何麥克筆資料</p>
          <p>點擊右上方的「新增」建立你的第一支筆</p>
        </div>
      )}

      {/* Add / Edit Form */}
      {(mode === "add" || editingId !== null) && (
        <form
          className="marker-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (editingId) {
              handleUpdate();
            } else {
              handleAdd();
            }
          }}
        >
          <div className="marker-form__swatch-row">
            <div
              className="marker-form__swatch-preview"
              style={swatchStyle(form.swatch)}
              title="顏色預覽"
            />
            <input
              type="text"
              className="marker-form__swatch-input"
              value={form.swatch}
              onChange={(e) => { setForm((f) => ({ ...f, swatch: e.target.value })); setFormError(""); }}
              placeholder="#876F49"
              maxLength={7}
              aria-label="色碼"
            />
          </div>

          <div className="marker-form__grid">
            {/* Brand dropdown */}
            <div className="marker-form__field">
              <label className="marker-form__label">品牌</label>
              <div className="marker-dropdown">
                <button
                  type="button"
                  className="marker-dropdown__trigger"
                  onClick={() => setBrandOpen((v) => !v)}
                  aria-expanded={brandOpen}
                >
                  <span>{BRANDS.find((b) => b.value === form.brand)?.label}</span>
                  <ChevronDown size={14} className={`marker-dropdown__chevron ${brandOpen ? "marker-dropdown__chevron--open" : ""}`} />
                </button>
                {brandOpen && (
                  <ul className="marker-dropdown__menu" role="listbox">
                    {BRANDS.map((b) => (
                      <li key={b.value}>
                        <button
                          type="button"
                          className={`marker-dropdown__item ${form.brand === b.value ? "marker-dropdown__item--active" : ""}`}
                          onClick={() => { setForm((f) => ({ ...f, brand: b.value })); setBrandOpen(false); }}
                        >
                          {b.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Number */}
            <div className="marker-form__field">
              <label className="marker-form__label">色號</label>
              <input
                type="text"
                className="marker-form__input"
                value={form.number}
                onChange={(e) => { setForm((f) => ({ ...f, number: e.target.value })); setFormError(""); }}
                placeholder="76、BG5"
                aria-label="色號"
              />
            </div>

            {/* Type dropdown */}
            <div className="marker-form__field">
              <label className="marker-form__label">筆型</label>
              <div className="marker-dropdown">
                <button
                  type="button"
                  className="marker-dropdown__trigger"
                  onClick={() => setTypeOpen((v) => !v)}
                  aria-expanded={typeOpen}
                >
                  <span>{TYPES.find((t) => t.value === form.type)?.label}</span>
                  <ChevronDown size={14} className={`marker-dropdown__chevron ${typeOpen ? "marker-dropdown__chevron--open" : ""}`} />
                </button>
                {typeOpen && (
                  <ul className="marker-dropdown__menu" role="listbox">
                    {TYPES.map((t) => (
                      <li key={t.value}>
                        <button
                          type="button"
                          className={`marker-dropdown__item ${form.type === t.value ? "marker-dropdown__item--active" : ""}`}
                          onClick={() => { setForm((f) => ({ ...f, type: t.value })); setTypeOpen(false); }}
                        >
                          {t.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Note */}
            <div className="marker-form__field marker-form__field--full">
              <label className="marker-form__label">用途備註</label>
              <input
                type="text"
                className="marker-form__input"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="木皮陰影、沙發布料、吊燈金屬"
                aria-label="用途備註"
              />
            </div>
          </div>

          {formError && <p className="marker-form__error" role="alert">{formError}</p>}

          <div className="marker-form__actions">
            <button type="button" className="marker-form__cancel" onClick={handleCancel}>
              取消
            </button>
            <button type="submit" className="marker-form__submit">
              <Check size={14} />
              <span>{editingId ? "更新" : "儲存"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Marker List */}
      {markers.length > 0 && mode === "view" && (
        <ul className="marker-list">
          {markers.map((m) => (
            <li key={m.id} className="marker-card">
              <div className="marker-card__swatch" style={swatchStyle(m.swatch)} />
              <div className="marker-card__body">
                <div className="marker-card__meta">
                  <span className="marker-card__brand">{m.brand}</span>
                  <span className="marker-card__number">{m.number}</span>
                  <span className="marker-card__type">{m.type}</span>
                </div>
                {m.note && <p className="marker-card__note">{m.note}</p>}
              </div>
              <div className="marker-card__actions">
                <button
                  className="marker-card__edit"
                  onClick={() => handleEdit(m.id)}
                  aria-label={`編輯 ${m.brand} ${m.number}`}
                >
                  <Edit3 size={13} />
                </button>
                <button
                  className="marker-card__delete"
                  onClick={() => handleDelete(m.id)}
                  aria-label={`刪除 ${m.brand} ${m.number}`}
                >
                  <X size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
