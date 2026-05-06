"use client";

import { useEffect, useState, useCallback, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Save, Send, CheckCircle, Loader2, ChevronDown, ChevronUp, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  cn,
  getStatusColor,
  getShiftLabel,
  userWorksShift,
  ROW_TINT_OPTIONS,
  getRowTintSelectClass,
  getRowTintBackgroundClass,
} from "@/lib/utils";
import TicketLinksDisplay from "@/components/TicketLinksDisplay";

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  assignedShifts: number[];
}

interface EntryData {
  clientId: string;
  clientName: string;
  /** Server row version for optimistic concurrency checks */
  sourceUpdatedAt: string | null;
  tickets: string;
  status: string;
  engineerWorkedUserId: string;
  /** Legacy free-text when no user id is set */
  legacyEngineerWorked: string;
  issues: string;
  updates: string;
  handoverNotes: string;
  managerNotes: string;
  /** RED | AMBER | SILVER | GREEN | "" — admin-only; tints full row */
  rowTint: string;
  engineerId: string;
}

interface PreviousEntry {
  clientName: string;
  handoverNotes: string;
  status: string;
  updates: string;
}

const STATUS_OPTIONS = [
  { value: "NA", label: "N/A" },
  { value: "COMPLETE", label: "Complete" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "PENDING", label: "Pending" },
  { value: "DELTA", label: "Delta" },
];

function isEntryFilled(entry: EntryData): boolean {
  return (
    entry.status !== "NA" ||
    !!entry.tickets ||
    !!entry.engineerWorkedUserId ||
    !!entry.legacyEngineerWorked?.trim() ||
    !!entry.updates ||
    !!entry.issues
  );
}

export default function HandoverFormPage({
  params,
}: {
  params: Promise<{ projectId: string; date: string; shift: string }>;
}) {
  const { projectId, date, shift } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectTiming, setProjectTiming] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [handoverStatus, setHandoverStatus] = useState("DRAFT");
  const [handoverId, setHandoverId] = useState<string | null>(null);
  const [handoverUpdatedAt, setHandoverUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [previousShiftEntries, setPreviousShiftEntries] = useState<PreviousEntry[]>([]);
  const [showPrevious, setShowPrevious] = useState(false);
  const [engineerAck, setEngineerAck] = useState<{ acknowledged: boolean; by: string | null; at: string | null }>({ acknowledged: false, by: null, at: null });
  const [managerAck, setManagerAck] = useState<{ acknowledged: boolean; by: string | null; at: string | null }>({ acknowledged: false, by: null, at: null });
  const [acknowledging, setAcknowledging] = useState(false);
  /** Tickets: show one surface — links when not editing; textarea while empty or editing */
  const [ticketsEditClientId, setTicketsEditClientId] = useState<string | null>(null);

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";
  const isLead = userRole === "LEAD";
  const canSubmit = userRole === "ADMIN" || userRole === "LEAD";
  const canAcknowledgeEngineer = isAdmin || isLead;

  const loadHandoverPage = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const noStore = { cache: "no-store" as const };
        const cacheBust = Date.now();
        const [projectsRes, usersRes, handoverRes] = await Promise.all([
          fetch("/api/projects", noStore),
          fetch("/api/users", noStore),
          fetch(
            `/api/handover?date=${encodeURIComponent(date)}&projectId=${encodeURIComponent(projectId)}&shiftNumber=${encodeURIComponent(shift)}&_t=${cacheBust}`,
            noStore
          ),
        ]);

        const projects = await projectsRes.json();
        const usersData = await usersRes.json();

        if (!handoverRes.ok) {
          const err = await handoverRes.json().catch(() => ({}));
          if (!opts?.silent) {
            setSaveMessage(
              typeof err?.error === "string"
                ? err.error
                : "Could not load saved handover. Try refreshing or signing in again."
            );
            setTimeout(() => setSaveMessage(""), 5000);
          }
        }

        const handoverData = handoverRes.ok ? await handoverRes.json() : null;

        const activeUsers = usersData.filter((u: { active: boolean }) => u.active) as User[];
        setUsers(
          activeUsers.map((u) => ({
            ...u,
            assignedShifts: Array.isArray(u.assignedShifts) ? u.assignedShifts : [],
          }))
        );

        const project = projects.find((p: { id: string }) => p.id === projectId);
        if (project) {
          setProjectName(project.name);
          const timings = [project.shift1Timing, project.shift2Timing, project.shift3Timing];
          setProjectTiming(timings[parseInt(shift, 10) - 1] || "");

          const clientEntries: EntryData[] = project.clients.map((client: Client) => {
            const existing = handoverData?.entries?.find(
              (e: { client: { id: string } }) => e.client.id === client.id
            );
            return {
              clientId: client.id,
              clientName: client.name,
              sourceUpdatedAt: existing?.updatedAt || null,
              tickets: existing?.tickets || "",
              status: existing?.status || "NA",
              engineerWorkedUserId: existing?.engineerWorkedUserId || "",
              legacyEngineerWorked: existing?.engineerWorkedUserId
                ? ""
                : (existing?.engineerWorked?.trim() || ""),
              issues: existing?.issues || "",
              updates: existing?.updates || "",
              handoverNotes: existing?.handoverNotes || "",
              managerNotes: existing?.managerNotes || "",
              rowTint: existing?.rowTint || "",
              engineerId: existing?.engineerId || "",
            };
          });
          setEntries(clientEntries);

          if (handoverData) {
            setLeadNotes(handoverData.leadNotes || "");
            setHandoverStatus(handoverData.status || "DRAFT");
            setHandoverId(handoverData.id || null);
            setHandoverUpdatedAt(handoverData.updatedAt || null);
            setEngineerAck({
              acknowledged: handoverData.engineerAcknowledged || false,
              by: handoverData.engineerAcknowledger?.name || null,
              at: handoverData.engineerAcknowledgedAt || null,
            });
            setManagerAck({
              acknowledged: handoverData.managerAcknowledged || false,
              by: handoverData.managerAcknowledger?.name || null,
              at: handoverData.managerAcknowledgedAt || null,
            });
          } else if (handoverRes.ok) {
            setLeadNotes("");
            setHandoverStatus("DRAFT");
            setHandoverId(null);
            setHandoverUpdatedAt(null);
            setEngineerAck({ acknowledged: false, by: null, at: null });
            setManagerAck({ acknowledged: false, by: null, at: null });
          }
        }

        const prevShift = parseInt(shift, 10) - 1;
        if (prevShift >= 1) {
          const prevRes = await fetch(
            `/api/handover?date=${encodeURIComponent(date)}&projectId=${encodeURIComponent(projectId)}&shiftNumber=${encodeURIComponent(String(prevShift))}&_t=${Date.now()}`,
            { cache: "no-store" }
          );
          const prevData = prevRes.ok ? await prevRes.json() : null;
          if (prevData?.entries) {
            setPreviousShiftEntries(
              prevData.entries
                .filter((e: { handoverNotes: string }) => e.handoverNotes)
                .map(
                  (e: {
                    client: { name: string };
                    handoverNotes: string;
                    status: string;
                    updates: string;
                  }) => ({
                    clientName: e.client.name,
                    handoverNotes: e.handoverNotes,
                    status: e.status,
                    updates: e.updates,
                  })
                )
            );
          } else {
            setPreviousShiftEntries([]);
          }
        } else {
          setPreviousShiftEntries([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [projectId, date, shift]
  );

  useEffect(() => {
    loadHandoverPage();
  }, [loadHandoverPage]);

  const updateEntry = useCallback((clientId: string, field: string, value: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.clientId === clientId ? { ...e, [field]: value } : e))
    );
  }, []);

  const handleSave = async (submit = false) => {
    setSaving(true);
    setSaveMessage("");

    try {
      const res = await fetch("/api/handover", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          projectId,
          shiftNumber: shift,
          handoverExpectedUpdatedAt: handoverUpdatedAt,
          leadNotes,
          entries: entries.map((e) => ({
            clientId: e.clientId,
            expectedUpdatedAt: e.sourceUpdatedAt,
            tickets: e.tickets,
            status: e.status,
            engineerWorkedUserId: e.engineerWorkedUserId || null,
            engineerWorked: e.engineerWorkedUserId
              ? null
              : e.legacyEngineerWorked?.trim() || null,
            issues: e.issues,
            updates: e.updates,
            handoverNotes: e.handoverNotes,
            managerNotes: e.managerNotes,
            rowTint: e.rowTint || null,
            engineerId: e.engineerId || null,
          })),
          submit,
        }),
      });

      if (res.ok) {
        await loadHandoverPage({ silent: true });
        router.refresh();
        setSaveMessage(submit ? "Submitted successfully!" : "Saved as draft.");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        const errorData = await res.json().catch(() => null);
        if (res.status === 409) {
          // Refresh only timestamps so the next save can proceed — preserve the user's current edits
          try {
            const freshRes = await fetch(
              `/api/handover?date=${encodeURIComponent(date)}&projectId=${encodeURIComponent(projectId)}&shiftNumber=${encodeURIComponent(shift)}&_t=${Date.now()}`,
              { cache: "no-store" }
            );
            if (freshRes.ok) {
              const freshData = await freshRes.json();
              if (freshData?.updatedAt) setHandoverUpdatedAt(freshData.updatedAt);
              if (freshData?.id) setHandoverId(freshData.id);
              if (Array.isArray(freshData?.entries)) {
                const freshByClientId = new Map<string, string>(
                  freshData.entries.map((e: { client: { id: string }; updatedAt: string }) => [
                    e.client.id,
                    e.updatedAt,
                  ])
                );
                setEntries((prev) =>
                  prev.map((e) => {
                    const freshTs = freshByClientId.get(e.clientId);
                    return freshTs ? { ...e, sourceUpdatedAt: freshTs } : e;
                  })
                );
              }
            }
          } catch {
            // ignore — user can still retry with stale timestamps
          }
          setSaveMessage(
            typeof errorData?.error === "string"
              ? `${errorData.error} Your changes are preserved — please save again.`
              : "Someone else updated this handover while you were editing. Your changes are preserved — please save again."
          );
        } else {
          setSaveMessage(errorData?.error || "Error saving. Please try again.");
        }
      }
    } catch {
      setSaveMessage("Error saving. Please try again.");
    }

    setSaving(false);
  };

  const handleAcknowledge = async (action: "engineer_acknowledge" | "manager_acknowledge") => {
    if (!handoverId) {
      setSaveMessage("Please save the handover first before acknowledging.");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }

    setAcknowledging(true);
    try {
      const res = await fetch("/api/handover", {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handoverId, action }),
      });

      if (res.ok) {
        const result = await res.json();
        router.refresh();
        if (action === "engineer_acknowledge") {
          setEngineerAck({
            acknowledged: true,
            by: result.engineerAcknowledger?.name || session?.user?.name || null,
            at: new Date().toISOString(),
          });
        } else {
          setManagerAck({
            acknowledged: true,
            by: result.managerAcknowledger?.name || session?.user?.name || null,
            at: new Date().toISOString(),
          });
        }
        setSaveMessage("Acknowledged successfully!");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        const errorData = await res.json().catch(() => null);
        setSaveMessage(errorData?.error || "Error acknowledging.");
      }
    } catch {
      setSaveMessage("Error acknowledging. Please try again.");
    }
    setAcknowledging(false);
  };

  const shiftNum = parseInt(shift, 10) || 1;
  const nextShiftNum = shiftNum >= 3 ? 1 : shiftNum + 1;

  const engineerWorkedOptions = useMemo(() => {
    return users
      .filter((u) => userWorksShift(u.assignedShifts ?? [], shiftNum))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, shiftNum]);

  const nextEngineerOptions = useMemo(() => {
    return users
      .filter((u) => userWorksShift(u.assignedShifts ?? [], nextShiftNum))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, nextShiftNum]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isSubmitted = handoverStatus === "SUBMITTED";

  const filledCount = entries.filter(isEntryFilled).length;
  const totalCount = entries.length;
  const allEntriesFilled = totalCount > 0 && filledCount === totalCount;

  const formatAckTime = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {projectName} - {getShiftLabel(parseInt(shift))}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            | {projectTiming}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span
              className={cn(
                "text-sm px-3 py-2 rounded-lg max-w-xl whitespace-pre-wrap",
                saveMessage.includes("Error") || saveMessage.includes("Only")
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              )}
            >
              {saveMessage}
            </span>
          )}
          {isSubmitted ? (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Submitted</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              {canSubmit && (
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving || !allEntriesFilled}
                  title={
                    !allEntriesFilled
                      ? `All client entries must be filled before submitting (${filledCount}/${totalCount} filled)`
                      : "Submit handover"
                  }
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50",
                    allEntriesFilled
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  )}
                >
                  <Send className="w-4 h-4" />
                  Submit
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Submit readiness indicator for leads/admins */}
      {canSubmit && !isSubmitted && (
        <div
          className={cn(
            "mb-4 flex items-center gap-2 text-sm px-4 py-2 rounded-lg border",
            allEntriesFilled
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          )}
        >
          {allEntriesFilled ? (
            <>
              <CheckCircle className="w-4 h-4" />
              All {totalCount} client entries are filled. Ready to submit.
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4" />
              {filledCount} of {totalCount} client entries filled. All entries must be verified before submitting.
            </>
          )}
        </div>
      )}

      {/* Previous Shift Notes */}
      {previousShiftEntries.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowPrevious(!showPrevious)}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            {showPrevious ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Previous Shift Engineer Notes ({previousShiftEntries.length} items)
          </button>
          {showPrevious && (
            <div className="mt-2 bg-indigo-50 rounded-lg border border-indigo-100 p-4 space-y-2">
              {previousShiftEntries.map((pe, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="font-medium text-indigo-900 min-w-[150px]">{pe.clientName}:</span>
                  <span className="text-indigo-700">{pe.handoverNotes}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Entries Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-3 font-semibold text-gray-700 align-bottom sticky left-0 z-10 bg-gray-50 shadow-[2px_0_0_0_rgb(243_244_246)] max-w-[16rem] min-w-0">
                  Client
                </th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 align-bottom max-w-[22rem] min-w-0">
                  Tickets
                </th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 align-bottom whitespace-nowrap max-w-[11rem] min-w-0">
                  Status
                </th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 align-bottom whitespace-nowrap max-w-[14rem] min-w-0">
                  Engineer Worked
                </th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 align-bottom max-w-[22rem] min-w-0">
                  Issues
                </th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 align-bottom max-w-[22rem] min-w-0">
                  Updates
                </th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 align-bottom max-w-[22rem] min-w-0">
                  Engineer Notes
                </th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 align-bottom max-w-[22rem] min-w-0">
                  Manager Notes
                </th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 align-bottom whitespace-nowrap max-w-[14rem] min-w-0">
                  Next Shift Engineer
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                const filled = isEntryFilled(entry);
                const rowBg = getRowTintBackgroundClass(entry.rowTint);
                return (
                  <tr
                    key={entry.clientId}
                    className={cn(
                      "border-b border-gray-100 transition-colors",
                      rowBg
                        ? cn(rowBg, "hover:brightness-[0.99]")
                        : cn("hover:bg-gray-50/50", idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"),
                      canSubmit && !isSubmitted && !filled && "border-l-4 border-l-amber-400"
                    )}
                  >
                    <td
                      className={cn(
                        "px-3 py-2 align-top font-medium text-gray-900 sticky left-0 z-10 border-r border-gray-100/80 max-w-[16rem] min-w-0",
                        rowBg || (idx % 2 === 0 ? "bg-white" : "bg-gray-50/30")
                      )}
                    >
                      <div className="flex flex-nowrap items-start gap-3">
                        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                          {canSubmit && !isSubmitted && (
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full shrink-0",
                                filled ? "bg-green-500" : "bg-amber-400"
                              )}
                            />
                          )}
                          <span className="break-words min-w-0">{entry.clientName}</span>
                        </div>
                        <div className="shrink-0 pt-0.5 border-l border-gray-200 pl-3 ml-0.5">
                          <select
                            value={entry.rowTint}
                            onChange={(e) => updateEntry(entry.clientId, "rowTint", e.target.value)}
                            disabled={!isAdmin}
                            className={cn(
                              "w-[2.5rem] max-w-[2.5rem] text-center text-[11px] leading-tight py-0.5 pl-0 pr-4 rounded border shadow-sm block",
                              getRowTintSelectClass(entry.rowTint),
                              !isAdmin && "cursor-not-allowed opacity-95"
                            )}
                            title={isAdmin ? "Row highlight (admin)" : "Row highlight"}
                            aria-label="Row highlight color"
                          >
                            {ROW_TINT_OPTIONS.map((opt) => (
                              <option key={opt.value || "none"} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top max-w-[22rem] min-w-0">
                      {isSubmitted ? (
                        <TicketLinksDisplay text={entry.tickets} />
                      ) : ticketsEditClientId === entry.clientId || !entry.tickets.trim() ? (
                        <textarea
                          value={entry.tickets}
                          onChange={(e) => updateEntry(entry.clientId, "tickets", e.target.value)}
                          onBlur={() => setTicketsEditClientId(null)}
                          disabled={isSubmitted}
                          rows={2}
                          autoFocus={ticketsEditClientId === entry.clientId}
                          className="box-border w-full min-w-0 max-w-full min-h-[2.75rem] [field-sizing:content] px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 resize-y text-gray-900 break-words"
                          placeholder="Paste full links (https://…) — separate with commas or new lines"
                        />
                      ) : (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest("a")) return;
                            setTicketsEditClientId(entry.clientId);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setTicketsEditClientId(entry.clientId);
                            }
                          }}
                          className="box-border block w-full min-w-0 min-h-[2.75rem] max-w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-left bg-white hover:bg-gray-50 hover:border-indigo-200 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-text break-words"
                          title="Click outside a link to edit"
                          aria-label="Tickets — click to edit"
                        >
                          <TicketLinksDisplay text={entry.tickets} />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top max-w-[11rem] min-w-0">
                      <select
                        value={entry.status}
                        onChange={(e) => updateEntry(entry.clientId, "status", e.target.value)}
                        disabled={isSubmitted}
                        className={cn(
                          "box-border w-full min-w-0 max-w-full truncate px-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-indigo-500 disabled:opacity-60",
                          getStatusColor(entry.status)
                        )}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 align-top max-w-[14rem] min-w-0">
                      <div className="space-y-1">
                        <select
                          value={entry.engineerWorkedUserId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEntries((prev) =>
                              prev.map((row) =>
                                row.clientId === entry.clientId
                                  ? { ...row, engineerWorkedUserId: v, legacyEngineerWorked: v ? "" : row.legacyEngineerWorked }
                                  : row
                              )
                            );
                          }}
                          disabled={isSubmitted}
                          className="box-border w-full min-w-0 max-w-full truncate px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 text-gray-900"
                        >
                          <option value="">Select...</option>
                          {engineerWorkedOptions.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                        {entry.legacyEngineerWorked ? (
                          <p className="text-[10px] text-amber-700" title="Saved before user picker">
                            Legacy: {entry.legacyEngineerWorked}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top max-w-[22rem] min-w-0">
                      <textarea
                        value={entry.issues}
                        onChange={(e) => updateEntry(entry.clientId, "issues", e.target.value)}
                        disabled={isSubmitted}
                        rows={1}
                        className="box-border w-full min-w-0 max-w-full min-h-[2.5rem] [field-sizing:content] px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 resize-y text-gray-900 break-words"
                        placeholder="Any issues..."
                      />
                    </td>
                    <td className="px-3 py-2 align-top max-w-[22rem] min-w-0">
                      <textarea
                        value={entry.updates}
                        onChange={(e) => updateEntry(entry.clientId, "updates", e.target.value)}
                        disabled={isSubmitted}
                        rows={1}
                        className="box-border w-full min-w-0 max-w-full min-h-[2.5rem] [field-sizing:content] px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 resize-y text-gray-900 break-words"
                        placeholder="Updates..."
                      />
                    </td>
                    <td className="px-3 py-2 align-top max-w-[22rem] min-w-0">
                      <textarea
                        value={entry.handoverNotes}
                        onChange={(e) => updateEntry(entry.clientId, "handoverNotes", e.target.value)}
                        disabled={isSubmitted}
                        rows={1}
                        className="box-border w-full min-w-0 max-w-full min-h-[2.5rem] [field-sizing:content] px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 resize-y text-gray-900 break-words"
                        placeholder="Engineer notes..."
                      />
                    </td>
                    <td className="px-3 py-2 align-top max-w-[22rem] min-w-0">
                      <textarea
                        value={entry.managerNotes}
                        onChange={(e) => updateEntry(entry.clientId, "managerNotes", e.target.value)}
                        disabled={!isAdmin}
                        rows={1}
                        className={cn(
                          "box-border w-full min-w-0 max-w-full min-h-[2.5rem] [field-sizing:content] px-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-indigo-500 resize-y text-gray-900 break-words",
                          isAdmin
                            ? "border-purple-200 bg-purple-50/30 focus:border-purple-500 focus:ring-purple-500"
                            : "border-gray-200 bg-gray-100 cursor-not-allowed"
                        )}
                        placeholder={isAdmin ? "Manager notes..." : "Manager only"}
                      />
                    </td>
                    <td className="px-3 py-2 align-top max-w-[14rem] min-w-0">
                      <select
                        value={entry.engineerId}
                        onChange={(e) => updateEntry(entry.clientId, "engineerId", e.target.value)}
                        disabled={isSubmitted}
                        className="box-border w-full min-w-0 max-w-full truncate px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 text-gray-900"
                      >
                        <option value="">Select...</option>
                        {nextEngineerOptions.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Notes */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Shift Lead Notes
        </label>
        <textarea
          value={leadNotes}
          onChange={(e) => setLeadNotes(e.target.value)}
          disabled={isSubmitted}
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 resize-y text-gray-900"
          placeholder="Notes from the shift lead..."
        />
      </div>

      {/* Acknowledgement Section */}
      {(() => {
        const engineerNotesFilled = totalCount > 0 && entries.every((e) => !!e.handoverNotes);
        const managerNotesFilled = totalCount > 0 && entries.every((e) => !!e.managerNotes);
        const engineerNotesFilledCount = entries.filter((e) => !!e.handoverNotes).length;
        const managerNotesFilledCount = entries.filter((e) => !!e.managerNotes).length;

        return (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Engineer Acknowledgement - only Leads can acknowledge */}
            <div className={cn(
              "rounded-xl shadow-sm border p-5",
              engineerAck.acknowledged
                ? "bg-green-50 border-green-200"
                : "bg-white border-gray-200"
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Engineer Acknowledgement
                  </h3>
                  {engineerAck.acknowledged ? (
                    <p className="text-xs text-green-700 mt-1">
                      Acknowledged by <span className="font-medium">{engineerAck.by}</span> on {formatAckTime(engineerAck.at)}
                    </p>
                  ) : canAcknowledgeEngineer ? (
                    <p className="text-xs text-gray-500 mt-1">
                      {engineerNotesFilled
                        ? "All engineer notes filled. Ready to acknowledge."
                        : `${engineerNotesFilledCount}/${totalCount} engineer notes filled. All must be filled to acknowledge.`}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Only Shift Leads and Admins can acknowledge</p>
                  )}
                </div>
                {engineerAck.acknowledged ? (
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                ) : canAcknowledgeEngineer && handoverId ? (
                  <button
                    onClick={() => handleAcknowledge("engineer_acknowledge")}
                    disabled={acknowledging || !engineerNotesFilled}
                    title={!engineerNotesFilled ? "All engineer notes must be filled first" : "Acknowledge engineer notes"}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50",
                      engineerNotesFilled
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    )}
                  >
                    {acknowledging ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Acknowledge
                  </button>
                ) : null}
              </div>
            </div>

            {/* Manager Acknowledgement - only Admins can acknowledge */}
            <div className={cn(
              "rounded-xl shadow-sm border p-5",
              managerAck.acknowledged
                ? "bg-green-50 border-green-200"
                : "bg-white border-gray-200"
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    Manager Acknowledgement
                  </h3>
                  {managerAck.acknowledged ? (
                    <p className="text-xs text-green-700 mt-1">
                      Acknowledged by <span className="font-medium">{managerAck.by}</span> on {formatAckTime(managerAck.at)}
                    </p>
                  ) : isAdmin ? (
                    <p className="text-xs text-gray-500 mt-1">
                      {managerNotesFilled
                        ? "All manager notes filled. Ready to acknowledge."
                        : `${managerNotesFilledCount}/${totalCount} manager notes filled. All must be filled to acknowledge.`}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Only Managers can acknowledge</p>
                  )}
                </div>
                {managerAck.acknowledged ? (
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                ) : isAdmin && handoverId ? (
                  <button
                    onClick={() => handleAcknowledge("manager_acknowledge")}
                    disabled={acknowledging || !managerNotesFilled}
                    title={!managerNotesFilled ? "All manager notes must be filled first" : "Acknowledge manager notes"}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50",
                      managerNotesFilled
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    )}
                  >
                    {acknowledging ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Acknowledge
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bottom Save/Submit */}
      {!isSubmitted && (
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          {canSubmit && (
            <button
              onClick={() => handleSave(true)}
              disabled={saving || !allEntriesFilled}
              title={
                !allEntriesFilled
                  ? `All client entries must be filled before submitting (${filledCount}/${totalCount} filled)`
                  : "Submit handover"
              }
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50",
                allEntriesFilled
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              )}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Handover
            </button>
          )}
        </div>
      )}
    </div>
  );
}
