"use client";

import { useState, useRef } from "react";
import { Plus, Upload, X, Check, Pencil, Trash2, Filter, ChevronLeft, ChevronRight } from "lucide-react";

interface MigrationItem {
  id: string;
  batchRunId: string | null;
  sourceEmail: string | null;
  sourcePath: string | null;
  destinationEmail: string | null;
  destinationPath: string | null;
  sourceValidation: string | null;
  destinationValidation: string | null;
  migrationStatus: string;
  combination: string;
  server: string | null;
  comments: string | null;
}

interface BatchRun {
  id: string;
  batchName: string;
}

const STATUS_COLORS: Record<string, string> = {
  INITIATED_MIGRATION: "bg-blue-100 text-blue-700",
  INITIATED_ONE_TIME: "bg-cyan-100 text-cyan-700",
  PILOT_COMPLETED: "bg-indigo-100 text-indigo-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  SKIPPED: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  INITIATED_MIGRATION: "Initiated",
  INITIATED_ONE_TIME: "One-Time",
  PILOT_COMPLETED: "Pilot Done",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  FAILED: "Failed",
  SKIPPED: "Skipped",
};

const COMBO_LABELS: Record<string, string> = {
  MYDRIVE_MYDRIVE: "MyDrive → MyDrive",
  SHAREDDRIVE_SHAREDDRIVE: "Shared → Shared",
  MYDRIVE_SHAREDDRIVE: "MyDrive → Shared",
  SHAREDDRIVE_MYDRIVE: "Shared → MyDrive",
  OTHER: "Other",
};

const PAGE_SIZE = 25;

const EMPTY_FORM = {
  batchRunId: "",
  sourceEmail: "",
  sourcePath: "",
  destinationEmail: "",
  destinationPath: "",
  sourceValidation: "",
  destinationValidation: "",
  migrationStatus: "INITIATED_MIGRATION",
  combination: "MYDRIVE_MYDRIVE",
  server: "",
  comments: "",
};

interface CsvRow {
  [key: string]: string;
}

interface Props {
  clientId: string;
  role: string;
  onCountChange: (n: number) => void;
}

export default function MigrationItemsTab({ clientId, role, onCountChange }: Props) {
  const [items, setItems] = useState<MigrationItem[]>([]);
  const [batches, setBatches] = useState<BatchRun[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  // CSV import state
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canEdit = role === "ADMIN" || role === "LEAD";

  const load = async () => {
    const [itemsRes, batchesRes] = await Promise.all([
      fetch(`/api/client-projects/${clientId}/items`),
      fetch(`/api/client-projects/${clientId}/batches`),
    ]);
    const itemsData = await itemsRes.json();
    const batchesData = await batchesRes.json();
    setItems(itemsData);
    setBatches(batchesData);
    onCountChange(itemsData.length);
    setLoaded(true);
  };

  if (!loaded) {
    load();
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm animate-pulse">
        Loading migration items…
      </div>
    );
  }

  // Filtered + paginated view
  const filtered = items.filter((item) => {
    if (statusFilter && item.migrationStatus !== statusFilter) return false;
    if (batchFilter === "none" && item.batchRunId !== null) return false;
    if (batchFilter && batchFilter !== "none" && item.batchRunId !== batchFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Status summary counts
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.migrationStatus] = (acc[item.migrationStatus] ?? 0) + 1;
    return acc;
  }, {});
  const total = items.length;
  const completed = counts["COMPLETED"] ?? 0;
  const failed = counts["FAILED"] ?? 0;
  const inProgress = counts["IN_PROGRESS"] ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (item: MigrationItem) => {
    setEditingId(item.id);
    setForm({
      batchRunId: item.batchRunId ?? "",
      sourceEmail: item.sourceEmail ?? "",
      sourcePath: item.sourcePath ?? "",
      destinationEmail: item.destinationEmail ?? "",
      destinationPath: item.destinationPath ?? "",
      sourceValidation: item.sourceValidation ?? "",
      destinationValidation: item.destinationValidation ?? "",
      migrationStatus: item.migrationStatus,
      combination: item.combination,
      server: item.server ?? "",
      comments: item.comments ?? "",
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const save = async () => {
    setSaving(true);
    const body = {
      ...form,
      batchRunId: form.batchRunId || null,
      sourceEmail: form.sourceEmail || null,
      sourcePath: form.sourcePath || null,
      destinationEmail: form.destinationEmail || null,
      destinationPath: form.destinationPath || null,
      sourceValidation: form.sourceValidation || null,
      destinationValidation: form.destinationValidation || null,
      server: form.server || null,
      comments: form.comments || null,
    };
    if (editingId) {
      const res = await fetch(`/api/client-projects/${clientId}/items/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
    } else {
      const res = await fetch(`/api/client-projects/${clientId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const created = await res.json();
      setItems((prev) => [...prev, created]);
      onCountChange(items.length + 1);
    }
    setSaving(false);
    cancelForm();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this migration item?")) return;
    await fetch(`/api/client-projects/${clientId}/items/${id}`, { method: "DELETE" });
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    onCountChange(next.length);
  };

  // CSV parsing
  const parseCsv = (text: string): CsvRow[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, "").trim());
      const row: CsvRow = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
      return row;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      setCsvRows(rows);
      setShowCsvPreview(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Map CSV headers to API fields — flexible matching
  const normalizeHeader = (h: string) => h.toLowerCase().replace(/[\s_-]/g, "");

  const HEADER_MAP: Record<string, string> = {
    "sourceemail": "sourceEmail",
    "source": "sourceEmail",
    "srcmail": "sourceEmail",
    "destemail": "destinationEmail",
    "destinationemail": "destinationEmail",
    "dest": "destinationEmail",
    "sourcepath": "sourcePath",
    "destinationpath": "destinationPath",
    "sourcevalidation": "sourceValidation",
    "destvalidation": "destinationValidation",
    "destinationvalidation": "destinationValidation",
    "status": "migrationStatus",
    "migrationstatus": "migrationStatus",
    "combination": "combination",
    "server": "server",
    "comments": "comments",
    "batchrunid": "batchRunId",
    "batchid": "batchRunId",
  };

  const mapCsvRow = (row: CsvRow) => {
    const mapped: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      const norm = normalizeHeader(k);
      if (HEADER_MAP[norm]) mapped[HEADER_MAP[norm]] = v;
    }
    return mapped;
  };

  const importCsv = async () => {
    setImporting(true);
    const mappedRows = csvRows.map(mapCsvRow);
    const res = await fetch(`/api/client-projects/${clientId}/items/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: mappedRows }),
    });
    const result = await res.json();
    setShowCsvPreview(false);
    setCsvRows([]);
    setImporting(false);
    if (result.created) {
      // Reload all items
      const r = await fetch(`/api/client-projects/${clientId}/items`);
      const data = await r.json();
      setItems(data);
      onCountChange(data.length);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status summary bar */}
      {total > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 font-medium">{total} items total</span>
            <span className="text-gray-500">{completed} completed · {inProgress} in progress · {failed} failed</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{pct}% complete</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Filter className="w-3.5 h-3.5" />
        </div>
        <select
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
          value={batchFilter}
          onChange={(e) => { setBatchFilter(e.target.value); setPage(0); }}
        >
          <option value="">All batches</option>
          <option value="none">No batch</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>{b.batchName}</option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          {canEdit && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                <Upload className="w-3.5 h-3.5" /> Import CSV
              </button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </>
          )}
        </div>
      </div>

      {/* CSV Preview Modal */}
      {showCsvPreview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-800">CSV Import Preview</h3>
                <p className="text-xs text-gray-500 mt-0.5">{csvRows.length} rows detected. Review before importing.</p>
              </div>
              <button onClick={() => { setShowCsvPreview(false); setCsvRows([]); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {Object.keys(csvRows[0] ?? {}).map((h) => (
                      <th key={h} className="border border-gray-200 px-2 py-1.5 bg-gray-50 text-left text-gray-600 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="border border-gray-200 px-2 py-1.5 text-gray-700 max-w-[180px] truncate">
                          {v || <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {csvRows.length > 10 && (
                    <tr>
                      <td colSpan={Object.keys(csvRows[0] ?? {}).length} className="text-center py-2 text-gray-400 text-xs">
                        … and {csvRows.length - 10} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => { setShowCsvPreview(false); setCsvRows([]); }}
                className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={importCsv}
                disabled={importing}
                className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {importing ? "Importing…" : `Import ${csvRows.length} Rows`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline add/edit form */}
      {showForm && (
        <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-gray-700">{editingId ? "Edit Item" : "New Migration Item"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">Source Email</label>
              <input className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.sourceEmail} onChange={(e) => setForm({ ...form, sourceEmail: e.target.value })} placeholder="user@source.com" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Destination Email</label>
              <input className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.destinationEmail} onChange={(e) => setForm({ ...form, destinationEmail: e.target.value })} placeholder="user@dest.com" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Combination</label>
              <select className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.combination} onChange={(e) => setForm({ ...form, combination: e.target.value })}>
                {Object.entries(COMBO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Source Path</label>
              <input className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.sourcePath} onChange={(e) => setForm({ ...form, sourcePath: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Destination Path</label>
              <input className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.destinationPath} onChange={(e) => setForm({ ...form, destinationPath: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Status</label>
              <select className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.migrationStatus} onChange={(e) => setForm({ ...form, migrationStatus: e.target.value })}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Source Validation</label>
              <input className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.sourceValidation} onChange={(e) => setForm({ ...form, sourceValidation: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Destination Validation</label>
              <input className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.destinationValidation} onChange={(e) => setForm({ ...form, destinationValidation: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Server</label>
              <input className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.server} onChange={(e) => setForm({ ...form, server: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Batch</label>
              <select className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.batchRunId} onChange={(e) => setForm({ ...form, batchRunId: e.target.value })}>
                <option value="">No batch</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.batchName}</option>)}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="text-xs text-gray-500">Comments</label>
              <input className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={cancelForm} className="flex items-center gap-1 text-sm text-gray-600 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              <Check className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {items.length === 0
            ? canEdit ? "No items yet. Add items manually or import a CSV." : "No migration items."
            : "No items match the current filters."}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2.5 text-left">Source</th>
                  <th className="px-4 py-2.5 text-left">Destination</th>
                  <th className="px-4 py-2.5 text-left hidden md:table-cell">Combination</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left hidden lg:table-cell">Server</th>
                  {canEdit && <th className="px-4 py-2.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 max-w-[200px]">
                      <p className="text-gray-800 truncate">{item.sourceEmail || item.sourcePath || "—"}</p>
                      {item.sourceValidation && (
                        <p className="text-xs text-gray-400 truncate">{item.sourceValidation}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px]">
                      <p className="text-gray-800 truncate">{item.destinationEmail || item.destinationPath || "—"}</p>
                      {item.destinationValidation && (
                        <p className="text-xs text-gray-400 truncate">{item.destinationValidation}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-xs text-gray-500">
                      {COMBO_LABELS[item.combination] ?? item.combination}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.migrationStatus] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[item.migrationStatus] ?? item.migrationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell text-xs text-gray-500">
                      {item.server || "—"}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-indigo-600">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {role === "ADMIN" && (
                            <button onClick={() => deleteItem(item.id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <p>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
