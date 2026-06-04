"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, Calendar, Filter } from "lucide-react";
import {
  cn,
  getShiftLabel,
  getStatusColor,
  getStatusLabel,
  getRowTintBackgroundClass,
} from "@/lib/utils";
import TicketLinksDisplay from "@/components/TicketLinksDisplay";

interface EntryRecord {
  id: string;
  tickets: string | null;
  status: string;
  issues: string | null;
  updates: string | null;
  handoverNotes: string | null;
  managerNotes: string | null;
  migrationReportSent: boolean;
  driveChangesAlerts: boolean;
  rowTint: string | null;
  engineerWorkedBy: { id: string; name: string } | null;
  engineer: { id: string; name: string } | null;
  filledBy: { id: string; name: string } | null;
  client: { id: string; name: string };
}

interface HandoverRecord {
  id: string;
  date: string;
  shiftNumber: number;
  status: string;
  leadNotes: string | null;
  project: { id: string; name: string };
  lead: { id: string; name: string } | null;
  submittedBy: { id: string; name: string } | null;
  entries: EntryRecord[];
}

export default function ClientHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ name?: string; projectId?: string; projectName?: string }>;
}) {
  const { clientId } = use(params);
  const { name: rawName = "Client", projectId, projectName: rawProjectName } = use(searchParams);
  const clientName = decodeURIComponent(rawName);
  const projectName = rawProjectName ? decodeURIComponent(rawProjectName) : undefined;

  const router = useRouter();
  const { data: session } = useSession();
  const [handovers, setHandovers] = useState<HandoverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  const fetchHistory = (start: string, end: string) => {
    setLoading(true);
    const url = new URL(`/api/clients/${clientId}/history`, window.location.origin);
    if (projectId) url.searchParams.set("projectId", projectId);
    if (start) url.searchParams.set("startDate", start);
    if (end) url.searchParams.set("endDate", end);
    fetch(url.toString(), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setHandovers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory(startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, projectId]);

  const grouped = handovers.reduce<Record<string, HandoverRecord[]>>((acc, h) => {
    const key = h.date.substring(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(h);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const formatDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Back + title */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{clientName} — History</h1>
        {projectName && <p className="text-sm text-gray-500 mt-1">{projectName}</p>}
      </div>

      {/* Date range filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by Date</span>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
          </div>
          <button
            onClick={() => fetchHistory(startDate, endDate)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                fetchHistory("", "");
              }}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          No handover history found for this client.
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              {/* Date group header */}
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                <h2 className="text-sm font-semibold text-indigo-700 whitespace-nowrap">
                  {formatDate(dateKey)}
                </h2>
                <div className="flex-1 h-px bg-indigo-100" />
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {grouped[dateKey].length} shift{grouped[dateKey].length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3">
                {grouped[dateKey].map((h) => {
                  const entry = h.entries[0];
                  return (
                    <div
                      key={h.id}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                    >
                      {/* Shift header */}
                      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-semibold text-gray-800">
                            {getShiftLabel(h.shiftNumber)}
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className="text-sm text-gray-600">{h.project.name}</span>
                          {h.lead && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span className="text-xs text-gray-500">Lead: {h.lead.name}</span>
                            </>
                          )}
                          {h.submittedBy && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span className="text-xs text-gray-500">
                                Submitted by {h.submittedBy.name}
                              </span>
                            </>
                          )}
                        </div>
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
                            h.status === "SUBMITTED"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          )}
                        >
                          {h.status === "SUBMITTED" ? "Submitted" : "Draft"}
                        </span>
                      </div>

                      {entry ? (
                        <div
                          className={cn(
                            "overflow-x-auto",
                            getRowTintBackgroundClass(entry.rowTint)
                          )}
                        >
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100">
                                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                  Status
                                </th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Tickets
                                </th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                  Engineer Worked
                                </th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Issues
                                </th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                  Engineer Notes
                                </th>
                                {isAdmin && (
                                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                    Manager Notes
                                  </th>
                                )}
                                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                  Migration Report
                                </th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                  Next Shift Eng.
                                </th>
                                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                  Filled By
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-4 py-3 align-top">
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded text-xs font-medium border",
                                      getStatusColor(entry.status)
                                    )}
                                  >
                                    {getStatusLabel(entry.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 align-top max-w-[200px]">
                                  <TicketLinksDisplay text={entry.tickets} />
                                </td>
                                <td className="px-4 py-3 align-top text-gray-700">
                                  {entry.engineerWorkedBy?.name ?? "—"}
                                </td>
                                <td className="px-4 py-3 align-top text-gray-700 max-w-[180px]">
                                  {entry.issues || "—"}
                                </td>
                                <td className="px-4 py-3 align-top text-gray-700 max-w-[200px]">
                                  {entry.handoverNotes || "—"}
                                </td>
                                {isAdmin && (
                                  <td className="px-4 py-3 align-top text-gray-700 max-w-[200px]">
                                    {entry.managerNotes || "—"}
                                  </td>
                                )}
                                <td className="px-4 py-3 align-top">
                                  <span
                                    className={cn(
                                      "text-xs font-medium",
                                      entry.migrationReportSent
                                        ? "text-green-600"
                                        : "text-gray-400"
                                    )}
                                  >
                                    {entry.migrationReportSent ? "Sent" : "Not Sent"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 align-top text-gray-700">
                                  {entry.engineer?.name ?? "—"}
                                </td>
                                <td className="px-4 py-3 align-top text-gray-500 text-xs">
                                  {entry.filledBy?.name ?? "—"}
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {h.leadNotes && (
                            <div className="px-4 pb-3">
                              <div className="p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                                <span className="text-xs font-medium text-gray-500">
                                  Lead Notes:{" "}
                                </span>
                                <span className="text-sm text-gray-700">{h.leadNotes}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="px-5 py-3 text-sm text-gray-400">
                          No entry for this client in this shift.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
