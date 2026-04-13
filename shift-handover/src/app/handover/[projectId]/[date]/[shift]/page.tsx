"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useSession } from "next-auth/react";
import { Save, Send, CheckCircle, Loader2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { cn, getStatusColor, getShiftLabel } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface EntryData {
  clientId: string;
  clientName: string;
  tickets: string;
  status: string;
  engineerWorked: string;
  issues: string;
  updates: string;
  handoverNotes: string;
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
  return entry.status !== "NA" || !!entry.tickets || !!entry.engineerWorked || !!entry.updates || !!entry.issues;
}

export default function HandoverFormPage({
  params,
}: {
  params: Promise<{ projectId: string; date: string; shift: string }>;
}) {
  const { projectId, date, shift } = use(params);
  const { data: session } = useSession();
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectTiming, setProjectTiming] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [handoverStatus, setHandoverStatus] = useState("DRAFT");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [previousShiftEntries, setPreviousShiftEntries] = useState<PreviousEntry[]>([]);
  const [showPrevious, setShowPrevious] = useState(false);

  const userRole = (session?.user as { role?: string })?.role;
  const canSubmit = userRole === "ADMIN" || userRole === "LEAD";

  useEffect(() => {
    const loadData = async () => {
      const [projectsRes, usersRes, handoverRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/users"),
        fetch(`/api/handover?date=${date}&projectId=${projectId}&shiftNumber=${shift}`),
      ]);

      const projects = await projectsRes.json();
      const usersData = await usersRes.json();
      const handoverData = await handoverRes.json();

      setUsers(usersData.filter((u: { active: boolean }) => u.active));

      const project = projects.find((p: { id: string }) => p.id === projectId);
      if (project) {
        setProjectName(project.name);
        const timings = [project.shift1Timing, project.shift2Timing, project.shift3Timing];
        setProjectTiming(timings[parseInt(shift) - 1] || "");

        const clientEntries: EntryData[] = project.clients.map((client: Client) => {
          const existing = handoverData?.entries?.find(
            (e: { client: { id: string } }) => e.client.id === client.id
          );
          return {
            clientId: client.id,
            clientName: client.name,
            tickets: existing?.tickets || "",
            status: existing?.status || "NA",
            engineerWorked: existing?.engineerWorked || "",
            issues: existing?.issues || "",
            updates: existing?.updates || "",
            handoverNotes: existing?.handoverNotes || "",
            engineerId: existing?.engineerId || "",
          };
        });
        setEntries(clientEntries);

        if (handoverData) {
          setLeadNotes(handoverData.leadNotes || "");
          setHandoverStatus(handoverData.status || "DRAFT");
        }
      }

      // Load previous shift data
      const prevShift = parseInt(shift) - 1;
      if (prevShift >= 1) {
        const prevRes = await fetch(
          `/api/handover?date=${date}&projectId=${projectId}&shiftNumber=${prevShift}`
        );
        const prevData = await prevRes.json();
        if (prevData?.entries) {
          setPreviousShiftEntries(
            prevData.entries
              .filter((e: { handoverNotes: string }) => e.handoverNotes)
              .map((e: { client: { name: string }; handoverNotes: string; status: string; updates: string }) => ({
                clientName: e.client.name,
                handoverNotes: e.handoverNotes,
                status: e.status,
                updates: e.updates,
              }))
          );
        }
      }

      setLoading(false);
    };

    loadData();
  }, [projectId, date, shift]);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          projectId,
          shiftNumber: shift,
          leadNotes,
          entries,
          submit,
        }),
      });

      if (res.ok) {
        if (submit) {
          setHandoverStatus("SUBMITTED");
        }
        setSaveMessage(submit ? "Submitted successfully!" : "Saved as draft");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        const errorData = await res.json().catch(() => null);
        setSaveMessage(errorData?.error || "Error saving. Please try again.");
      }
    } catch {
      setSaveMessage("Error saving. Please try again.");
    }

    setSaving(false);
  };

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

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
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
                "text-sm px-3 py-1 rounded-full",
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

      {/* Previous Shift Handover Notes */}
      {previousShiftEntries.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowPrevious(!showPrevious)}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            {showPrevious ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Previous Shift Handover Notes ({previousShiftEntries.length} items)
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
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-3 font-semibold text-gray-700 w-[140px] sticky left-0 bg-gray-50 z-10">
                  Client
                </th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 w-[140px]">Tickets</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 w-[120px]">Status</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 w-[130px]">Engineer Worked</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 min-w-[180px]">Issues</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 min-w-[180px]">Updates</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 min-w-[180px]">Handover</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 w-[150px]">Next Shift Engineer</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                const filled = isEntryFilled(entry);
                return (
                  <tr
                    key={entry.clientId}
                    className={cn(
                      "border-b border-gray-100 hover:bg-gray-50/50 transition-colors",
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50/30",
                      canSubmit && !isSubmitted && !filled && "border-l-4 border-l-amber-400"
                    )}
                  >
                    <td className="px-3 py-2 font-medium text-gray-900 sticky left-0 bg-inherit z-10 border-r border-gray-100">
                      <div className="flex items-center gap-1.5">
                        {canSubmit && !isSubmitted && (
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              filled ? "bg-green-500" : "bg-amber-400"
                            )}
                          />
                        )}
                        {entry.clientName}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={entry.tickets}
                        onChange={(e) => updateEntry(entry.clientId, "tickets", e.target.value)}
                        disabled={isSubmitted}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 text-gray-900"
                        placeholder="Ticket IDs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={entry.status}
                        onChange={(e) => updateEntry(entry.clientId, "status", e.target.value)}
                        disabled={isSubmitted}
                        className={cn(
                          "w-full px-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-indigo-500 disabled:opacity-60",
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
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={entry.engineerWorked}
                        onChange={(e) => updateEntry(entry.clientId, "engineerWorked", e.target.value)}
                        disabled={isSubmitted}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 text-gray-900"
                        placeholder="Name"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <textarea
                        value={entry.issues}
                        onChange={(e) => updateEntry(entry.clientId, "issues", e.target.value)}
                        disabled={isSubmitted}
                        rows={1}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 resize-y text-gray-900"
                        placeholder="Any issues..."
                      />
                    </td>
                    <td className="px-3 py-2">
                      <textarea
                        value={entry.updates}
                        onChange={(e) => updateEntry(entry.clientId, "updates", e.target.value)}
                        disabled={isSubmitted}
                        rows={1}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 resize-y text-gray-900"
                        placeholder="Updates..."
                      />
                    </td>
                    <td className="px-3 py-2">
                      <textarea
                        value={entry.handoverNotes}
                        onChange={(e) => updateEntry(entry.clientId, "handoverNotes", e.target.value)}
                        disabled={isSubmitted}
                        rows={1}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 resize-y text-gray-900"
                        placeholder="Handover notes..."
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={entry.engineerId}
                        onChange={(e) => updateEntry(entry.clientId, "engineerId", e.target.value)}
                        disabled={isSubmitted}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 text-gray-900"
                      >
                        <option value="">Select...</option>
                        {users.map((u) => (
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
