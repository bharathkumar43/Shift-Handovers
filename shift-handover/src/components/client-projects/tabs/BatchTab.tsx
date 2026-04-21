"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Edit2, Trash2, X, Save, TrendingUp, CheckCircle2, XCircle, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBatchPhaseBadgeClass, resolveBatchPhaseLabel } from "@/lib/batch-tracker-options";
import {
  compactTrackerDetails,
  emptyTrackerState,
  getTrackerFieldsForProductType,
  labelForTrackerId,
  mergeTrackerDetails,
} from "@/lib/batch-tracker-fieldsets";
import { format } from "date-fns";

interface BatchRun {
  id: string;
  batchName: string;
  batchNumber: number | null;
  productType: string;
  totalItems: number;
  migratedItems: number;
  failedItems: number;
  skippedItems: number;
  totalSizeGb: number | null;
  migratedSizeGb: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  status: string;
  errorSummary: string | null;
  notes: string | null;
  batchPhase: string | null;
  trackerDetails?: Record<string, unknown> | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  RUNNING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  PARTIAL: "bg-amber-100 text-amber-700",
};

const STATUS_BAR_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-500",
  RUNNING: "bg-blue-500",
  PARTIAL: "bg-amber-500",
  FAILED: "bg-red-500",
  PENDING: "bg-gray-300",
};

function statusKey(status: string): string {
  return status.trim().toUpperCase().replace(/\s+/g, "_");
}

function statusPillClass(status: string): string {
  return STATUS_COLORS[statusKey(status)] ?? "bg-slate-100 text-slate-700";
}

function statusBarClass(status: string): string {
  return STATUS_BAR_COLORS[statusKey(status)] ?? "bg-slate-400";
}

interface Props {
  clientId: string;
  /** CONTENT | MESSAGE | EMAIL — from migration type + project, not a separate user pick. */
  effectiveProductType: string | null;
  currentUserRole: string;
  onCountChange: (count: number) => void;
}

type BatchFormState = {
  batchName: string;
  batchNumber: string;
  totalItems: string;
  migratedItems: string;
  failedItems: string;
  skippedItems: string;
  totalSizeGb: string;
  migratedSizeGb: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  status: string;
  errorSummary: string;
  notes: string;
  batchPhase: string;
  trackerDetails: Record<string, string>;
};

const emptyFormBase = {
  batchName: "",
  batchNumber: "",
  totalItems: "0",
  migratedItems: "0",
  failedItems: "0",
  skippedItems: "0",
  totalSizeGb: "",
  migratedSizeGb: "",
  plannedStartDate: "",
  plannedEndDate: "",
  actualStartDate: "",
  actualEndDate: "",
  status: "PENDING",
  errorSummary: "",
  notes: "",
  batchPhase: "",
};

function buildEmptyForm(effectiveProductType: string | null): BatchFormState {
  return {
    ...emptyFormBase,
    trackerDetails: emptyTrackerState(getTrackerFieldsForProductType(effectiveProductType)),
  };
}

function toInputDate(d: string | null) {
  if (!d) return "";
  try { return new Date(d).toISOString().split("T")[0]; } catch { return ""; }
}

/** Normalize stored tracker date strings for HTML date inputs (yyyy-mm-dd prefix). */
function trackerDateInputValue(raw: string | undefined) {
  if (!raw) return "";
  const m = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : String(raw);
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function BatchTab({ clientId, effectiveProductType, currentUserRole, onCountChange }: Props) {
  const [batches, setBatches] = useState<BatchRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BatchFormState>(() => buildEmptyForm(null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("");

  const canEdit = currentUserRole === "ADMIN" || currentUserRole === "LEAD";
  const isAdmin = currentUserRole === "ADMIN";

  useEffect(() => {
    setLoading(true);
    fetch(`/api/client-projects/${clientId}/batches`)
      .then((r) => r.json())
      .then((data) => { setBatches(data); onCountChange(data.length); })
      .finally(() => setLoading(false));
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = batches.reduce(
    (acc, b) => ({
      totalItems: acc.totalItems + b.totalItems,
      migratedItems: acc.migratedItems + b.migratedItems,
      failedItems: acc.failedItems + b.failedItems,
      skippedItems: acc.skippedItems + b.skippedItems,
      totalSizeGb: acc.totalSizeGb + (b.totalSizeGb ?? 0),
      migratedSizeGb: acc.migratedSizeGb + (b.migratedSizeGb ?? 0),
    }),
    { totalItems: 0, migratedItems: 0, failedItems: 0, skippedItems: 0, totalSizeGb: 0, migratedSizeGb: 0 }
  );
  const overallPct = totals.totalItems > 0 ? Math.round((totals.migratedItems / totals.totalItems) * 100) : 0;

  async function handleSave() {
    if (!form.batchName.trim()) { setError("Batch name is required"); return; }
    if (!effectiveProductType) {
      setError(
        "Cannot determine Content / Email / Message for this project. Set a migration type on the project (Edit project), or set product type if the migration is “Other”."
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        batchName: form.batchName,
        batchNumber: form.batchNumber ? parseInt(form.batchNumber) : null,
        totalItems: parseInt(form.totalItems) || 0,
        migratedItems: parseInt(form.migratedItems) || 0,
        failedItems: parseInt(form.failedItems) || 0,
        skippedItems: parseInt(form.skippedItems) || 0,
        totalSizeGb: form.totalSizeGb ? parseFloat(form.totalSizeGb) : null,
        migratedSizeGb: form.migratedSizeGb ? parseFloat(form.migratedSizeGb) : null,
        plannedStartDate: form.plannedStartDate || null,
        plannedEndDate: form.plannedEndDate || null,
        actualStartDate: form.actualStartDate || null,
        actualEndDate: form.actualEndDate || null,
        status: form.status,
        errorSummary: form.errorSummary || null,
        notes: form.notes || null,
        batchPhase: form.batchPhase || null,
        trackerDetails: compactTrackerDetails(form.trackerDetails) ?? null,
      };
      if (editingId) {
        const res = await fetch(`/api/client-projects/${clientId}/batches/${editingId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Could not save batch. Try again.");
          return;
        }
        setBatches((b) => b.map((x) => (x.id === editingId ? data : x)));
        setEditingId(null);
        setShowForm(false);
        setForm(buildEmptyForm(effectiveProductType));
      } else {
        const res = await fetch(`/api/client-projects/${clientId}/batches`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : `Could not create batch (HTTP ${res.status}).`);
          return;
        }
        setBatches((b) => [...b, data]);
        onCountChange(batches.length + 1);
        setShowForm(false);
        setForm(buildEmptyForm(effectiveProductType));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this batch run?")) return;
    const res = await fetch(`/api/client-projects/${clientId}/batches/${id}`, { method: "DELETE" });
    if (res.ok) { setBatches((b) => b.filter((x) => x.id !== id)); onCountChange(batches.length - 1); }
  }

  const inputClass = "w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500";
  const labelClass = "text-xs text-gray-500 mb-1 block";

  return (
    <div className="space-y-5">
      {!effectiveProductType && canEdit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Batch tracker needs a product line (Content / Email / Message)</p>
          <p className="mt-1 text-amber-800/90">
            Project status (e.g. Not Started) does <strong>not</strong> block batches. Open <strong>Edit Details</strong> and set a
            {" "}<strong>migration type</strong> (e.g. Slack → Teams for messaging) so the app can pick the right template, or ensure
            {" "}<strong>product type</strong> is stored on the project. After saving, refresh this page.
          </p>
        </div>
      )}
      {effectiveProductType && canEdit && batches.length === 0 && (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          Numbers and dates are entered manually here — they are not imported automatically from Excel. Click <strong>Add Batch Run</strong>, enter at least a <strong>Batch name</strong>, then <strong>Create Batch</strong>.
        </p>
      )}
      {batches.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Items", value: totals.totalItems.toLocaleString(), icon: <TrendingUp className="w-5 h-5 text-blue-500" />, color: "bg-blue-50" },
            { label: "Migrated", value: totals.migratedItems.toLocaleString(), icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, color: "bg-green-50" },
            { label: "Failed", value: totals.failedItems.toLocaleString(), icon: <XCircle className="w-5 h-5 text-red-400" />, color: "bg-red-50" },
            { label: "Skipped", value: totals.skippedItems.toLocaleString(), icon: <SkipForward className="w-5 h-5 text-amber-400" />, color: "bg-amber-50" },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-xl p-4 flex items-center gap-3", s.color)}>
              {s.icon}
              <div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {batches.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-900">Overall Progress</span>
            <span className="text-2xl font-bold text-indigo-600">{overallPct}%</span>
          </div>
          <ProgressBar value={overallPct} color="bg-indigo-600" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{totals.migratedItems.toLocaleString()} of {totals.totalItems.toLocaleString()} items</span>
            {totals.totalSizeGb > 0 && <span>{totals.migratedSizeGb.toFixed(1)} / {totals.totalSizeGb.toFixed(1)} GB</span>}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1 max-w-md">
          <label className="text-xs text-gray-500 shrink-0">Filter</label>
          <input
            type="text"
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            placeholder="Phase / tracker row / batch name…"
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 w-full min-w-0"
          />
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setForm(buildEmptyForm(effectiveProductType));
              setEditingId(null);
              setShowForm((v) => !v);
            }}
            disabled={!effectiveProductType}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "Add Batch Run"}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

      {(showForm || editingId) && canEdit && (
        <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-5 space-y-4">
          <h4 className="font-semibold text-gray-900">{editingId ? "Edit Batch Run" : "Add Batch Run"}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Batch Name *</label>
              <input type="text" placeholder="e.g. Batch 1 - Mailboxes A–F" value={form.batchName} onChange={(e) => setForm((f) => ({ ...f, batchName: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Batch # (optional)</label>
              <input type="number" placeholder="1" value={form.batchNumber} onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))} className={inputClass} />
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500">
                Product line for this client: <strong>{effectiveProductType ?? "— set under Edit project —"}</strong>. Status and phase are free text — type whatever matches your tracker or process.
              </p>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <input
                type="text"
                placeholder="e.g. PENDING, RUNNING, or your own label"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Phase / tracker row</label>
              <input
                type="text"
                placeholder="Any label (e.g. from your Excel tracker row)"
                value={form.batchPhase}
                onChange={(e) => setForm((f) => ({ ...f, batchPhase: e.target.value }))}
                className={inputClass}
              />
            </div>
            {getTrackerFieldsForProductType(effectiveProductType).length > 0 && (
              <div className="col-span-2 space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-700">Excel / sheet tracker fields</p>
                <p className="text-xs text-gray-500">
                  Same row labels as your product tracker — enter counts or text (e.g. Number of CH: 2000).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getTrackerFieldsForProductType(effectiveProductType).map((field) => (
                    <div key={field.id}>
                      <label className={labelClass}>{field.label}</label>
                      <input
                        type={field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text"}
                        min={field.kind === "number" ? 0 : undefined}
                        step={field.kind === "number" ? 1 : undefined}
                        value={
                          field.kind === "date"
                            ? trackerDateInputValue(form.trackerDetails[field.id])
                            : (form.trackerDetails[field.id] ?? "")
                        }
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            trackerDetails: { ...f.trackerDetails, [field.id]: e.target.value },
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className={labelClass}>Total Items</label>
              <input type="number" min="0" value={form.totalItems} onChange={(e) => setForm((f) => ({ ...f, totalItems: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Migrated Items</label>
              <input type="number" min="0" value={form.migratedItems} onChange={(e) => setForm((f) => ({ ...f, migratedItems: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Failed Items</label>
              <input type="number" min="0" value={form.failedItems} onChange={(e) => setForm((f) => ({ ...f, failedItems: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Skipped Items</label>
              <input type="number" min="0" value={form.skippedItems} onChange={(e) => setForm((f) => ({ ...f, skippedItems: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Total Size (GB)</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.totalSizeGb} onChange={(e) => setForm((f) => ({ ...f, totalSizeGb: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Migrated Size (GB)</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.migratedSizeGb} onChange={(e) => setForm((f) => ({ ...f, migratedSizeGb: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Planned Start</label>
              <input type="date" value={form.plannedStartDate} onChange={(e) => setForm((f) => ({ ...f, plannedStartDate: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Planned End</label>
              <input type="date" value={form.plannedEndDate} onChange={(e) => setForm((f) => ({ ...f, plannedEndDate: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Actual Start</label>
              <input type="date" value={form.actualStartDate} onChange={(e) => setForm((f) => ({ ...f, actualStartDate: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Actual End</label>
              <input type="date" value={form.actualEndDate} onChange={(e) => setForm((f) => ({ ...f, actualEndDate: e.target.value }))} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Error Summary</label>
              <textarea rows={2} placeholder="High-level description of errors/failures…" value={form.errorSummary} onChange={(e) => setForm((f) => ({ ...f, errorSummary: e.target.value }))} className={inputClass + " resize-y"} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Notes</label>
              <textarea rows={2} placeholder="Additional notes…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputClass + " resize-y"} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? "Save Changes" : "Create Batch"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(buildEmptyForm(effectiveProductType));
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm">No batch runs yet.{canEdit ? " Add the first batch to start tracking migration progress." : ""}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.filter((b) => {
            const q = phaseFilter.trim().toLowerCase();
            if (!q) return true;
            const td = b.trackerDetails;
            const trackerText =
              td && typeof td === "object" && !Array.isArray(td)
                ? Object.values(td as Record<string, unknown>)
                    .map((v) => (v != null ? String(v) : ""))
                    .join(" ")
                    .toLowerCase()
                : "";
            return (
              (b.batchPhase || "").toLowerCase().includes(q) ||
              (b.batchName || "").toLowerCase().includes(q) ||
              (b.status || "").toLowerCase().includes(q) ||
              trackerText.includes(q)
            );
          }).map((b) => {
            const pct = b.totalItems > 0 ? Math.round((b.migratedItems / b.totalItems) * 100) : 0;
            const barColor = statusBarClass(b.status);
            return (
              <div key={b.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900">{b.batchName}</h4>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusPillClass(b.status))}>{b.status}</span>
                      <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{b.productType}</span>
                      {b.batchPhase && (
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium max-w-[14rem] truncate", getBatchPhaseBadgeClass(b.batchPhase))} title={resolveBatchPhaseLabel(b.batchPhase, effectiveProductType)}>
                          {resolveBatchPhaseLabel(b.batchPhase, effectiveProductType)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 mt-1">
                      <span><span className="text-green-600 font-semibold">{b.migratedItems.toLocaleString()}</span> migrated</span>
                      <span><span className="text-red-500 font-semibold">{b.failedItems.toLocaleString()}</span> failed</span>
                      <span><span className="text-amber-500 font-semibold">{b.skippedItems.toLocaleString()}</span> skipped</span>
                      <span>of <span className="font-semibold text-gray-700">{b.totalItems.toLocaleString()}</span> total</span>
                      {(b.totalSizeGb ?? 0) > 0 && <span>{(b.migratedSizeGb ?? 0).toFixed(1)} / {(b.totalSizeGb ?? 0).toFixed(1)} GB</span>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            batchName: b.batchName,
                            batchNumber: b.batchNumber?.toString() ?? "",
                            totalItems: b.totalItems.toString(),
                            migratedItems: b.migratedItems.toString(),
                            failedItems: b.failedItems.toString(),
                            skippedItems: b.skippedItems.toString(),
                            totalSizeGb: b.totalSizeGb?.toString() ?? "",
                            migratedSizeGb: b.migratedSizeGb?.toString() ?? "",
                            plannedStartDate: toInputDate(b.plannedStartDate),
                            plannedEndDate: toInputDate(b.plannedEndDate),
                            actualStartDate: toInputDate(b.actualStartDate),
                            actualEndDate: toInputDate(b.actualEndDate),
                            status: b.status,
                            errorSummary: b.errorSummary ?? "",
                            notes: b.notes ?? "",
                            batchPhase: b.batchPhase ?? "",
                            trackerDetails: mergeTrackerDetails(b.trackerDetails, effectiveProductType),
                          });
                          setEditingId(b.id);
                          setShowForm(false);
                        }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span className="font-semibold text-gray-700">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} color={barColor} />
                </div>

                {(b.plannedStartDate || b.actualStartDate) && (
                  <div className="flex flex-wrap gap-x-6 gap-y-0.5 text-xs text-gray-400 mt-3">
                    {b.plannedStartDate && <span>Planned: {format(new Date(b.plannedStartDate), "MMM d")} → {b.plannedEndDate ? format(new Date(b.plannedEndDate), "MMM d, yyyy") : "—"}</span>}
                    {b.actualStartDate && <span>Actual: {format(new Date(b.actualStartDate), "MMM d")} → {b.actualEndDate ? format(new Date(b.actualEndDate), "MMM d, yyyy") : "ongoing"}</span>}
                  </div>
                )}

                {b.errorSummary && (
                  <div className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded">
                    <span className="font-medium">Errors: </span>{b.errorSummary}
                  </div>
                )}
                {b.trackerDetails &&
                  typeof b.trackerDetails === "object" &&
                  !Array.isArray(b.trackerDetails) &&
                  Object.values(b.trackerDetails as Record<string, unknown>).some(
                    (v) => v != null && String(v).trim() !== ""
                  ) && (
                    <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Sheet / tracker values</p>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        {Object.entries(b.trackerDetails as Record<string, unknown>)
                          .filter(([, v]) => v != null && String(v).trim() !== "")
                          .map(([k, v]) => (
                            <div key={k} className="sm:contents">
                              <dt className="text-gray-500 sm:pr-2">{labelForTrackerId(k, effectiveProductType)}</dt>
                              <dd className="text-gray-900 font-medium tabular-nums">{String(v)}</dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                  )}
                {b.notes && <p className="mt-2 text-xs text-gray-500 italic">{b.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
