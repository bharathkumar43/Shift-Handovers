"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Loader2, Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ARROW_SEP = " → ";

function splitMigrationLabel(label: string): { source: string; dest: string } | null {
  const i = label.indexOf(ARROW_SEP);
  if (i <= 0) return null;
  const source = label.slice(0, i).trim();
  const dest = label.slice(i + ARROW_SEP.length).trim();
  if (!source || !dest) return null;
  return { source, dest };
}

interface MigrationTypeOption {
  id: string;
  value: string;
  label: string;
  productType: string;
  isBuiltIn: boolean;
}

const PRODUCT_TYPES = [
  { value: "EMAIL",   label: "Email" },
  { value: "CONTENT", label: "Content" },
  { value: "MESSAGE", label: "Message" },
  { value: "ALL",     label: "All Product Types" },
];

const PT_COLORS: Record<string, string> = {
  EMAIL:   "bg-blue-100 text-blue-700",
  CONTENT: "bg-indigo-100 text-indigo-700",
  MESSAGE: "bg-violet-100 text-violet-700",
  ALL:     "bg-gray-100 text-gray-600",
};

const inputClass = "mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none";

export default function MigrationTypesPanel() {
  const [types, setTypes] = useState<MigrationTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ source: "", destination: "", productType: "EMAIL" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/migration-types")
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) setTypes(Array.isArray(data) ? data : []);
        else setError(data.error ?? "Failed to load migration types");
      })
      .catch(() => setError("Failed to load migration types"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    const source = form.source.trim();
    const destination = form.destination.trim();
    if (!source) { setError("Source is required"); return; }
    if (!destination) { setError("Destination is required"); return; }
    const label = `${source}${ARROW_SEP}${destination}`;
    setSaving(true);
    setError("");
    const res = await fetch("/api/migration-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, productType: form.productType }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to add"); setSaving(false); return; }
    setTypes((prev) => [...prev, data]);
    setForm((f) => ({ ...f, source: "", destination: "" }));
    setSaving(false);
  }

  const showFormArrow = form.source.trim().length > 0 && form.destination.trim().length > 0;

  async function handleDelete(id: string) {
    if (!confirm("Delete this migration type?")) return;
    const res = await fetch(`/api/migration-types/${id}`, { method: "DELETE" });
    if (res.ok) setTypes((prev) => prev.filter((t) => t.id !== id));
  }

  const grouped = PRODUCT_TYPES.map((pt) => ({
    ...pt,
    items: types.filter((t) => t.productType === pt.value),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Migration Types</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage the migration type options shown in project forms, filtered by product type.
        </p>
      </div>

      {/* Add form */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Add New Type</p>
        <div className="flex flex-col gap-3">
          <div
            className={cn(
              "flex gap-2 min-w-0",
              showFormArrow ? "flex-col sm:flex-row sm:items-end" : "flex-col"
            )}
          >
            <div className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</label>
              <input
                type="text"
                className={cn(inputClass, "mt-1")}
                placeholder="e.g. OneDrive"
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              />
            </div>
            {showFormArrow && (
              <div className="flex justify-center sm:justify-center sm:pb-2 shrink-0" aria-hidden>
                <div className="rounded-full bg-indigo-100 p-2 text-indigo-600 shadow-sm">
                  <ArrowRight className="w-5 h-5" strokeWidth={2.25} />
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Destination</label>
              <input
                type="text"
                className={cn(inputClass, "mt-1")}
                placeholder="e.g. SharePoint"
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              />
            </div>
          </div>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700">Product Type</label>
            <select
              className={inputClass}
              value={form.productType}
              onChange={(e) => setForm((f) => ({ ...f, productType: e.target.value }))}
            >
              {PRODUCT_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleAdd}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Type
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.value}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", PT_COLORS[group.value])}>
                  {group.label}
                </span>
              </div>
              <div className="space-y-1.5">
                {group.items.map((t) => {
                  const parts = splitMigrationLabel(t.label);
                  return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {parts ? (
                        <div className="flex flex-wrap items-center gap-2 min-w-0 text-sm text-gray-800">
                          <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-medium truncate max-w-[min(100%,12rem)]">
                            {parts.source}
                          </span>
                          <ArrowRight className="w-4 h-4 shrink-0 text-indigo-500" aria-hidden />
                          <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-medium truncate max-w-[min(100%,12rem)]">
                            {parts.dest}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-800">{t.label}</span>
                      )}
                      {t.isBuiltIn && (
                        <span className="flex items-center gap-0.5 text-xs text-gray-400 shrink-0">
                          <Lock className="w-3 h-3" /> built-in
                        </span>
                      )}
                    </div>
                    {!t.isBuiltIn && (
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
          {types.length === 0 && (
            <p className="text-sm text-gray-400">No migration types found.</p>
          )}
        </div>
      )}
    </div>
  );
}
