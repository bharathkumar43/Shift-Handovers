"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { cn, userHasShiftAssignments } from "@/lib/utils";

interface MigrationTypeOption {
  id: string;
  value: string;
  label: string;
  productType: string;
}

const MIGRATION_PHASES = [
  { value: "", label: "— Select —" },
  { value: "PILOT", label: "Pilot" },
  { value: "ONE_TIME", label: "One-Time Migration" },
  { value: "DELTA", label: "Delta Migration" },
  { value: "COMPLETED", label: "Completed" },
];

interface User { id: string; name: string; assignedShifts?: number[]; }
interface MigrationProject {
  id: string;
  status: string;
  projectManagerId: string | null;
  sowStartDate: string | null;
  sowEndDate: string | null;
  kickoffDate: string | null;
  migrationType: string | null;
  migrationTypes?: string[];
  productType: string | null;
  internalNotes: string | null;
  migrationPhase: string | null;
  deltaScheduledDate: string | null;
  deltaReadyConfirmedAt: string | null;
  deltaCompletedAt: string | null;
  deltaNotes: string | null;
  overagePaid?: boolean;
}

interface Props {
  clientId: string;
  migrationProject: MigrationProject;
  users: User[];
  currentUserRole: string;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSaved: (updated: any) => void;
}

function toInputDate(d: string | null) {
  if (!d) return "";
  try { return new Date(d).toISOString().split("T")[0]; } catch { return ""; }
}

function initialMigrationTypes(mp: MigrationProject): string[] {
  if (mp.migrationTypes && mp.migrationTypes.length > 0) return [...mp.migrationTypes];
  if (mp.migrationType) return [mp.migrationType];
  return [];
}

/** SOW end date is strictly before today (local). */
function isSowPeriodEnded(sowEndInput: string, sowEndStored: string | null): boolean {
  const raw = sowEndInput || (sowEndStored ? toInputDate(sowEndStored) : "");
  if (!raw) return false;
  const end = new Date(raw + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return end < today;
}

export default function ProjectEditForm({ clientId, migrationProject, users, currentUserRole, onClose, onSaved }: Props) {
  const isAdmin = currentUserRole === "ADMIN";
  const [form, setForm] = useState({
    projectManagerId: migrationProject.projectManagerId ?? "",
    sowStartDate: toInputDate(migrationProject.sowStartDate),
    sowEndDate: toInputDate(migrationProject.sowEndDate),
    kickoffDate: toInputDate(migrationProject.kickoffDate),
    internalNotes: migrationProject.internalNotes ?? "",
    migrationPhase: migrationProject.migrationPhase ?? "PILOT",
    deltaScheduledDate: toInputDate(migrationProject.deltaScheduledDate),
    deltaReadyConfirmedAt: toInputDate(migrationProject.deltaReadyConfirmedAt),
    deltaCompletedAt: toInputDate(migrationProject.deltaCompletedAt),
    deltaNotes: migrationProject.deltaNotes ?? "",
    overagePaid: migrationProject.overagePaid ?? false,
  });
  const [selectedMigrationTypes, setSelectedMigrationTypes] = useState<string[]>(() =>
    initialMigrationTypes(migrationProject)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [allMigrationTypes, setAllMigrationTypes] = useState<MigrationTypeOption[]>([]);

  useEffect(() => {
    fetch("/api/migration-types")
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) setAllMigrationTypes(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  const PT_LABELS: Record<string, string> = { EMAIL: "Email", CONTENT: "Content", MESSAGE: "Message", ALL: "All Types" };
  const projectProductType = migrationProject.productType;
  const migrationTypeGroups = [
    { key: "EMAIL",   label: "Email Migrations" },
    { key: "CONTENT", label: "Content Migrations" },
    { key: "MESSAGE", label: "Message Migrations" },
    { key: "ALL",     label: "General" },
  ]
    .map((g) => ({ ...g, items: allMigrationTypes.filter((t) => t.productType === g.key) }))
    .filter((g) => g.items.length > 0)
    .filter((g) => !projectProductType || g.key === projectProductType || g.key === "ALL");

  const showDeltaFields = form.migrationPhase === "DELTA" || form.migrationPhase === "COMPLETED"
    || !!(migrationProject.deltaScheduledDate);

  const showOverageToggle =
    migrationProject.status !== "COMPLETED" &&
    isSowPeriodEnded(form.sowEndDate, migrationProject.sowEndDate);

  function toggleMigrationType(value: string) {
    setSelectedMigrationTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/client-projects/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectManagerId: form.projectManagerId || null,
          sowStartDate: form.sowStartDate || null,
          sowEndDate: form.sowEndDate || null,
          kickoffDate: form.kickoffDate || null,
          migrationTypes: selectedMigrationTypes,
          productType: migrationProject.productType ?? null,
          sourceSystem: null,
          destinationSystem: null,
          migrationPhase: form.migrationPhase || null,
          deltaScheduledDate: form.deltaScheduledDate || null,
          deltaReadyConfirmedAt: form.deltaReadyConfirmedAt || null,
          deltaCompletedAt: form.deltaCompletedAt || null,
          deltaNotes: form.deltaNotes || null,
          overagePaid: form.overagePaid,
          ...(isAdmin ? { internalNotes: form.internalNotes || null } : {}),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json();
      onSaved(updated);
      onClose();
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";

  const projectManagerCandidates = users.filter((u) => userHasShiftAssignments(u.assignedShifts));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-white h-full w-full max-w-lg shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Edit Project Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className={labelClass}>Project Manager</label>
            <select value={form.projectManagerId} onChange={(e) => setForm((f) => ({ ...f, projectManagerId: e.target.value }))} className={inputClass}>
              <option value="">— Not assigned —</option>
              {projectManagerCandidates.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>SOW Start Date</label>
              <input type="date" value={form.sowStartDate} onChange={(e) => setForm((f) => ({ ...f, sowStartDate: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>SOW End Date</label>
              <input type="date" value={form.sowEndDate} onChange={(e) => setForm((f) => ({ ...f, sowEndDate: e.target.value }))} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Kickoff Date</label>
            <input type="date" value={form.kickoffDate} onChange={(e) => setForm((f) => ({ ...f, kickoffDate: e.target.value }))} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Migration paths</label>
            <p className="text-xs text-gray-500 mb-2">
              Optional — pick the specific scenario(s) for reporting and batch defaults. Your product line (Content / Message / Email) is derived from this; you do not set it separately.
              {projectProductType
                ? ` Showing ${PT_LABELS[projectProductType] ?? projectProductType}–related options.`
                : " All groups are listed."}
            </p>
            <div className="border border-gray-200 rounded-lg bg-gray-50/80 p-3 max-h-52 overflow-y-auto space-y-3">
              {migrationTypeGroups.length > 0 ? (
                migrationTypeGroups.map((g) => (
                  <div key={g.key}>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">{g.label}</p>
                    <div className="space-y-1.5">
                      {g.items.map((t) => (
                        <label
                          key={t.value}
                          className="flex items-start gap-2 cursor-pointer text-sm text-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMigrationTypes.includes(t.value)}
                            onChange={() => toggleMigrationType(t.value)}
                            className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{t.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No migration types loaded.</p>
              )}
            </div>
          </div>

          {showOverageToggle && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-3">
              <p className="text-xs text-amber-900 font-medium mb-2">
                SOW period has ended and this project is not marked completed — record whether overage work is paid.
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-800">Overage paid</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, overagePaid: true }))}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                      form.overagePaid
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, overagePaid: false }))}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                      !form.overagePaid
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Migration Phase & Delta */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Migration Phase & Delta</p>
            <div>
              <label className={labelClass}>Current Phase</label>
              <select value={form.migrationPhase} onChange={(e) => setForm((f) => ({ ...f, migrationPhase: e.target.value }))} className={inputClass}>
                {MIGRATION_PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            {showDeltaFields && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Delta Scheduled Date</label>
                    <input type="date" value={form.deltaScheduledDate} onChange={(e) => setForm((f) => ({ ...f, deltaScheduledDate: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Customer Confirmed</label>
                    <input type="date" value={form.deltaReadyConfirmedAt} onChange={(e) => setForm((f) => ({ ...f, deltaReadyConfirmedAt: e.target.value }))} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Delta Completed Date</label>
                  <input type="date" value={form.deltaCompletedAt} onChange={(e) => setForm((f) => ({ ...f, deltaCompletedAt: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Delta Notes</label>
                  <textarea value={form.deltaNotes} onChange={(e) => setForm((f) => ({ ...f, deltaNotes: e.target.value }))} rows={3} className={inputClass} placeholder="Notes about the delta migration plan…" />
                </div>
              </>
            )}
          </div>

          {isAdmin && (
            <div>
              <label className={labelClass}>Internal Notes (Admin only)</label>
              <textarea value={form.internalNotes} onChange={(e) => setForm((f) => ({ ...f, internalNotes: e.target.value }))} rows={3} className={inputClass} placeholder="Internal admin notes..." />
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
