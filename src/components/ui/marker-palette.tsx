"use client";

import { useState, useMemo } from "react";
import { Palette, Plus, X, Edit3, Check, ChevronDown } from "lucide-react";

const STORAGE_KEY = "draft-gallery-marker-palette";

const BRANDS = [
  { value: "Copic", label: "Copic" },
  { value: "Touch", label: "Touch 油性" },
  { value: "雄獅", label: "雄獅" },
  { value: "其他", label: "其他" },
] as const;

export type Marker = {
  id: string;
  brand: string;
  number: string;
  swatch: string;
  purposes: string[];
};

function loadMarkers(): Marker[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown[] = JSON.parse(raw);
    return parsed.map((m: unknown) => {
      const marker = m as Record<string, unknown>;
      const rawPurposes = marker.purposes ?? marker.purpose;
      const purposes: string[] = Array.isArray(rawPurposes)
        ? rawPurposes
        : typeof rawPurposes === "string"
        ? (rawPurposes as string)
            .split(/[,，]/)
            .map((p: string) => p.trim())
            .filter(Boolean)
        : [];
      return {
        id: String(marker.id ?? crypto.randomUUID()),
        brand: String(marker.brand ?? "其他"),
        number: String(marker.number ?? ""),
        swatch: String(marker.swatch ?? "#000000"),
        purposes,
      } satisfies Marker;
    });
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

type Mode = "view" | "add" | "edit";

export function MarkerPalette() {
  const [markers, setMarkers] = useState<Marker[]>(loadMarkers);
  const [mode, setMode] = useState<Mode>("view");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({ brand: "Copic", number: "", swatch: "#876F49", purposesText: "" });
  const [formError, setFormError] = useState("");
  const [brandOpen, setBrandOpen] = useState(false);

  // --- Filter state ---
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  // --- Auto-generate filter chips from all marker purposes ---
  const allPurposes = useMemo(() => {
    const set = new Set<string>();
    markers.forEach((m) => m.purposes.forEach((p) => set.add(p)));
    return Array.from(set).sort();
  }, [markers]);

  const filteredMarkers = useMemo(() => {
    if (activeFilters.size === 0) return markers;
    return markers.filter((m) =>
      m.purposes.some((p) => activeFilters.has(p))
    );
  }, [markers, activeFilters]);

  const toggleFilter = (purpose: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(purpose)) next.delete(purpose);
      else next.add(purpose);
      return next;
    });
  };

  const clearFilters = () => setActiveFilters(new Set());

  // --- Form helpers ---
  const resetForm = () => {
    setForm({ brand: "Copic", number: "", swatch: "#876F49", purposesText: "" });
    setFormError("");
  };

  const parsePurposes = (text: string): string[] =>
    text.split(/[,，]/).map((p) => p.trim()).filter(Boolean);

  const handleAdd = () => {
    const trimmed = form.number.trim();
    if (!trimmed) { setFormError("請填入色號"); return; }
    const exists = markers.some((m) => m.brand === form.brand && m.number === trimmed);
    if (exists) { setFormError("此色號已存在"); return; }
    const next: Marker = {
      id: crypto.randomUUID(),
      brand: form.brand,
      number: trimmed,
      swatch: form.swatch,
      purposes: parsePurposes(form.purposesText),
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
    setForm({
      brand: m.brand,
      number: m.number,
      swatch: m.swatch,
      purposesText: m.purposes.join(", "),
    });
    setFormError("");
    setEditingId(id);
    setMode("add");
  };

  const handleUpdate = () => {
    if (!editingId) return;
    const trimmed = form.number.trim();
    if (!trimmed) { setFormError("請填入色號"); return; }
    const exists = markers.some((m) => m.id !== editingId && m.brand === form.brand && m.number === trimmed);
    if (exists) { setFormError("此色號已存在"); return; }
    const updated = markers.map((m) =>
      m.id === editingId
        ? { ...m, brand: form.brand, number: trimmed, swatch: form.swatch, purposes: parsePurposes(form.purposesText) }
        : m
    );
    setMarkers(updated);
    saveMarkers(updated);
    setEditingId(null);
    setMode("view");
    resetForm();
  };

  const handleCancel = () => {
    setMode("view");
    setEditingId(null);
    resetForm();
  };

  // Count how many markers per purpose (for chip badge)
  const purposeCount = useMemo(() => {
    const map = new Map<string, number>();
    markers.forEach((m) => m.purposes.forEach((p) => map.set(p, (map.get(p) ?? 0) + 1)));
    return map;
  }, [markers]);

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
            if (editingId) handleUpdate();
            else handleAdd();
          }}
        >
          {/* Color row */}
          <div className="marker-form__swatch-row">
            <div
              className="marker-form__swatch-preview"
              style={{ background: form.swatch }}
              title="顏色預覽"
            />
            <input
              type="color"
              className="marker-form__color-picker"
              value={form.swatch}
              onChange={(e) => setForm((f) => ({ ...f, swatch: e.target.value }))}
              aria-label="選擇顏色"
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

            {/* Purposes */}
            <div className="marker-form__field marker-form__field--full">
              <label className="marker-form__label">用途</label>
              <input
                type="text"
                className="marker-form__input"
                value={form.purposesText}
                onChange={(e) => setForm((f) => ({ ...f, purposesText: e.target.value }))}
                placeholder="木皮, 陰影, 布料"
                aria-label="用途（多個用逗號分隔）"
              />
              <span className="marker-form__hint">多個用途請用逗號分隔</span>
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

      {/* Filter bar */}
      {markers.length > 0 && mode === "view" && (
        <div className="marker-filter">
          <div className="marker-filter__chips" role="group" aria-label="用途篩選">
            <button
              className={`marker-filter__chip ${activeFilters.size === 0 ? "marker-filter__chip--active" : ""}`}
              onClick={clearFilters}
            >
              全部
              <span className="marker-filter__chip-count">{markers.length}</span>
            </button>
            {allPurposes.map((p) => (
              <button
                key={p}
                className={`marker-filter__chip ${activeFilters.has(p) ? "marker-filter__chip--active" : ""}`}
                onClick={() => toggleFilter(p)}
                aria-pressed={activeFilters.has(p)}
              >
                {p}
                <span className="marker-filter__chip-count">{purposeCount.get(p) ?? 0}</span>
              </button>
            ))}
          </div>
          {activeFilters.size > 0 && (
            <button className="marker-filter__clear" onClick={clearFilters} aria-label="清除所有篩選">
              <X size={12} />
              <span>清除</span>
            </button>
          )}
        </div>
      )}

      {/* Result count */}
      {mode === "view" && activeFilters.size > 0 && filteredMarkers.length > 0 && (
        <p className="marker-filter__result">
          顯示 {filteredMarkers.length} 支符合「
          {Array.from(activeFilters).join("、")}」
        </p>
      )}

      {/* Marker List */}
      {filteredMarkers.length > 0 && mode === "view" && (
        <ul className="marker-list">
          {filteredMarkers.map((m) => (
            <li key={m.id} className="marker-card">
              <div className="marker-card__swatch" style={{ background: m.swatch }} />
              <div className="marker-card__body">
                <div className="marker-card__meta">
                  <span className="marker-card__brand">{m.brand}</span>
                  <span className="marker-card__number">{m.number}</span>
                </div>
                {m.purposes.length > 0 && (
                  <div className="marker-card__purposes">
                    {m.purposes.map((p) => (
                      <button
                        key={p}
                        className={`marker-card__purpose-tag ${activeFilters.has(p) ? "marker-card__purpose-tag--active" : ""}`}
                        onClick={() => toggleFilter(p)}
                        aria-pressed={activeFilters.has(p)}
                        title={`篩選「${p}」`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
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

      {/* No results */}
      {mode === "view" && markers.length > 0 && filteredMarkers.length === 0 && (
        <div className="marker-palette__empty">
          <p>目前沒有符合篩選條件的麥克筆</p>
          <button className="marker-filter__clear-inline" onClick={clearFilters}>清除篩選</button>
        </div>
      )}
    </div>
  );
}
