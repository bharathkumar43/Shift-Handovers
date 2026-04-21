"use client";

import { useState } from "react";
import { CheckCircle, Calendar, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import { differenceInDays, format } from "date-fns";

interface MigrationProjectDelta {
  migrationPhase: string | null;
  deltaScheduledDate: string | null;
  deltaReadyConfirmedAt: string | null;
  deltaCompletedAt: string | null;
  deltaNotes: string | null;
}

interface Props {
  clientId: string;
  migrationProject: MigrationProjectDelta;
  currentUserRole: string;
  onUpdate: (patch: Record<string, unknown>) => void;
}

function fmtDate(d: string | null) {
  if (!d) return null;
  try { return format(new Date(d), "MMM d, yyyy"); } catch { return null; }
}

const PHASE_LABELS: Record<string, string> = {
  PILOT: "Pilot",
  ONE_TIME: "One-Time",
  DELTA: "Delta",
  COMPLETED: "Completed",
};

const PHASE_COLORS: Record<string, string> = {
  PILOT: "bg-purple-100 text-purple-700 border-purple-200",
  ONE_TIME: "bg-blue-100 text-blue-700 border-blue-200",
  DELTA: "bg-orange-100 text-orange-700 border-orange-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
};

export default function DeltaPhasePanel({ clientId, migrationProject, currentUserRole, onUpdate }: Props) {
  const [schedulingDate, setSchedulingDate] = useState(false);
  const [dateInput, setDateInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(migrationProject.deltaNotes ?? "");

  const canEdit = currentUserRole === "ADMIN" || currentUserRole === "LEAD";
  const phase = migrationProject.migrationPhase ?? "PILOT";

  const put = async (patch: Record<string, unknown>) => {
    setSaving(true);
    const res = await fetch(`/api/client-projects/${clientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const updated = await res.json();
    onUpdate(updated);
    setSaving(false);
    return updated;
  };

  // Countdown display
  const countdownDisplay = (() => {
    if (!migrationProject.deltaScheduledDate) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(migrationProject.deltaScheduledDate); end.setHours(0, 0, 0, 0);
    const days = differenceInDays(end, today);
    if (days < 0) return { text: `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}`, color: "text-red-600", icon: AlertTriangle };
    if (days === 0) return { text: "Today!", color: "text-red-600", icon: AlertTriangle };
    if (days <= 3) return { text: `${days} day${days !== 1 ? "s" : ""} remaining`, color: "text-red-600", icon: AlertTriangle };
    if (days <= 7) return { text: `${days} days remaining`, color: "text-amber-600", icon: Clock };
    return { text: `${days} days remaining`, color: "text-green-600", icon: Calendar };
  })();

  // ── COMPLETED phase ───────────────────────────────────────────────────────
  if (phase === "COMPLETED") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">Migration Complete</span>
        </div>
        {migrationProject.deltaCompletedAt && (
          <p className="text-xs text-green-600 mt-1">
            Delta completed on {fmtDate(migrationProject.deltaCompletedAt)}
          </p>
        )}
      </div>
    );
  }

  // ── PILOT or ONE_TIME ─────────────────────────────────────────────────────
  if (phase === "PILOT" || phase === "ONE_TIME") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Migration Phase</h3>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${PHASE_COLORS[phase]}`}>
            {PHASE_LABELS[phase]}
          </span>
        </div>
        {canEdit && phase === "ONE_TIME" && (
          <button
            onClick={() => put({ migrationPhase: "DELTA" })}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg hover:bg-orange-100 disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            Begin Delta Phase
          </button>
        )}
        {canEdit && phase === "PILOT" && (
          <button
            onClick={() => put({ migrationPhase: "ONE_TIME" })}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            Proceed to One-Time Migration
          </button>
        )}
      </div>
    );
  }

  // ── DELTA phase ───────────────────────────────────────────────────────────
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-orange-800">Delta Migration Phase</h3>
        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium border bg-orange-100 text-orange-700 border-orange-200">
          Delta
        </span>
      </div>

      {/* Scheduled date */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-600">Scheduled Date</p>
        {migrationProject.deltaScheduledDate ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">{fmtDate(migrationProject.deltaScheduledDate)}</p>
              {countdownDisplay && (() => {
                const Icon = countdownDisplay.icon;
                return (
                  <p className={`text-xs flex items-center gap-1 mt-0.5 ${countdownDisplay.color}`}>
                    <Icon className="w-3.5 h-3.5" /> {countdownDisplay.text}
                  </p>
                );
              })()}
            </div>
            {canEdit && (
              <button onClick={() => { setSchedulingDate(true); setDateInput(migrationProject.deltaScheduledDate?.slice(0, 10) ?? ""); }} className="text-xs text-orange-600 hover:text-orange-800 underline">
                Change
              </button>
            )}
          </div>
        ) : canEdit ? (
          !schedulingDate ? (
            <button
              onClick={() => setSchedulingDate(true)}
              className="text-sm text-orange-600 hover:text-orange-800 underline"
            >
              + Schedule delta date
            </button>
          ) : null
        ) : (
          <p className="text-sm text-gray-400">Not scheduled yet</p>
        )}

        {schedulingDate && canEdit && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-orange-400 outline-none"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
            <button
              onClick={async () => {
                if (!dateInput) return;
                await put({ deltaScheduledDate: dateInput });
                setSchedulingDate(false);
              }}
              disabled={saving || !dateInput}
              className="text-sm px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              Save
            </button>
            <button onClick={() => setSchedulingDate(false)} className="text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Customer confirmation */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-600">Customer Confirmed Readiness</p>
        {migrationProject.deltaReadyConfirmedAt ? (
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Confirmed on {fmtDate(migrationProject.deltaReadyConfirmedAt)}</span>
          </div>
        ) : canEdit ? (
          <button
            onClick={() => put({ deltaReadyConfirmedAt: new Date().toISOString().slice(0, 10) })}
            disabled={saving}
            className="text-sm text-gray-600 border border-gray-300 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Mark Confirmed (Today)
          </button>
        ) : (
          <p className="text-sm text-gray-400">Awaiting customer confirmation</p>
        )}
      </div>

      {/* Delta notes */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-600">Delta Notes</p>
        {canEdit ? (
          <textarea
            rows={3}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none resize-none bg-white"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => put({ deltaNotes: notes })}
            placeholder="Add notes about the delta migration plan…"
          />
        ) : (
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{migrationProject.deltaNotes || "—"}</p>
        )}
      </div>

      {/* Mark complete */}
      {canEdit && !migrationProject.deltaCompletedAt && (
        <button
          onClick={() => put({ deltaCompletedAt: new Date().toISOString().slice(0, 10), migrationPhase: "COMPLETED" })}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Mark Delta Complete
        </button>
      )}
    </div>
  );
}
