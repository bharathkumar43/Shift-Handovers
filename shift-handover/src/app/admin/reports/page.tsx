"use client";

import { useEffect, useState } from "react";
import { BarChart3, Calendar, User, Building2 } from "lucide-react";
import {
  cn,
  getStatusColor,
  getStatusLabel,
  getShiftLabel,
  getRowTintBackgroundClass,
} from "@/lib/utils";

type Mode = "date" | "employee" | "client";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface ClientOption {
  id: string;
  name: string;
  project: { name: string };
}

interface HandoverEntry {
  id: string;
  tickets: string | null;
  status: string;
  engineerWorked: string | null;
  issues: string | null;
  updates: string | null;
  handoverNotes: string | null;
  managerNotes: string | null;
  rowTint: string | null;
  createdAt: string;
  updatedAt: string;
  client: { name: string };
  engineerWorkedBy: { name: string } | null;
  engineer: { name: string } | null;
  filledBy: { name: string } | null;
  shiftHandover?: {
    date: string;
    shiftNumber: number;
    project: { name: string };
  };
}

interface Handover {
  id: string;
  date: string;
  shiftNumber: number;
  status: string;
  project: { name: string };
  lead: { name: string } | null;
  submittedBy: { name: string } | null;
  submittedAt: string | null;
  entries: HandoverEntry[];
}

export default function AdminReportsPage() {
  const [mode, setMode] = useState<Mode>("date");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedClient, setSelectedClient] = useState("");

  const [users, setUsers] = useState<UserOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [entries, setEntries] = useState<HandoverEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]).then(([usersData, clientsData]) => {
      setUsers(usersData);
      setClients(clientsData);
    });
  }, []);

  const search = async () => {
    setLoading(true);
    setHandovers([]);
    setEntries([]);

    const params = new URLSearchParams();
    params.set("mode", mode);

    if (mode === "date") {
      params.set("date", date);
    } else if (mode === "employee") {
      params.set("employeeId", selectedEmployee);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
    } else if (mode === "client") {
      params.set("clientId", selectedClient);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
    }

    const res = await fetch(`/api/reports?${params.toString()}`);
    const data = await res.json();

    if (data.handovers) setHandovers(data.handovers);
    if (data.entries) setEntries(data.entries);
    setLoading(false);
  };

  const modeButtons: { key: Mode; label: string; icon: typeof Calendar }[] = [
    { key: "date", label: "By Date", icon: Calendar },
    { key: "employee", label: "By Employee", icon: User },
    { key: "client", label: "By Client", icon: Building2 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-7 h-7 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Data Review & Reports</h1>
      </div>

      {/* Mode Selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex gap-3 mb-4">
          {modeButtons.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                mode === key
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-4">
          {mode === "date" && (
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Select Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
          )}

          {mode === "employee" && (
            <>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Employee</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
                >
                  <option value="">Select employee...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
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
            </>
          )}

          {mode === "client" && (
            <>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Client</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
                >
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.project.name})
                    </option>
                  ))}
                </select>
              </div>
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
            </>
          )}

          <button
            onClick={search}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </div>
      </div>

      {/* Results - By Date Mode */}
      {mode === "date" && handovers.length > 0 && (
        <div className="space-y-6">
          {handovers.map((h) => (
            <div key={h.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-900">{h.project.name}</span>
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="text-gray-700">{getShiftLabel(h.shiftNumber)}</span>
                </div>
                <div className="flex items-center gap-3">
                  {h.submittedBy && (
                    <span className="text-xs text-gray-500">
                      Submitted by {h.submittedBy.name}
                      {h.submittedAt && ` at ${new Date(h.submittedAt).toLocaleTimeString()}`}
                    </span>
                  )}
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      h.status === "SUBMITTED"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {h.status === "SUBMITTED" ? "Submitted" : "Draft"}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Client</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Tickets</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Engineer Worked</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Issues</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Updates</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Engineer Notes</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Manager Notes</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Next Shift Engineer</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Filled By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className={cn(
                          "border-b border-gray-100",
                          getRowTintBackgroundClass(entry.rowTint) || "hover:bg-gray-50/50"
                        )}
                      >
                        <td className="px-4 py-2 font-medium text-gray-900">{entry.client.name}</td>
                        <td className="px-4 py-2 text-gray-700">{entry.tickets || "-"}</td>
                        <td className="px-4 py-2">
                          <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", getStatusColor(entry.status))}>
                            {getStatusLabel(entry.status)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {entry.engineerWorkedBy?.name || entry.engineerWorked || "-"}
                        </td>
                        <td className="px-4 py-2 text-gray-700 max-w-[200px]">
                          <span className="line-clamp-2">{entry.issues || "-"}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-700 max-w-[200px]">
                          <span className="line-clamp-2">{entry.updates || "-"}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-700 max-w-[200px]">
                          <span className="line-clamp-2">{entry.handoverNotes || "-"}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-700 max-w-[200px]">
                          <span className="line-clamp-2">{entry.managerNotes || "-"}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{entry.engineer?.name || "-"}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{entry.filledBy?.name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results - By Employee or Client Mode */}
      {(mode === "employee" || mode === "client") && entries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Project</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Shift</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Tickets</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Engineer Worked</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Issues</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Updates</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Engineer Notes</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Manager Notes</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Filled By</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Updated At</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={cn(
                      "border-b border-gray-100",
                      getRowTintBackgroundClass(entry.rowTint) || "hover:bg-gray-50/50"
                    )}
                  >
                    <td className="px-4 py-2 text-gray-900 font-medium whitespace-nowrap">
                      {entry.shiftHandover
                        ? new Date(entry.shiftHandover.date + "T00:00:00").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{entry.shiftHandover?.project.name || "-"}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {entry.shiftHandover ? getShiftLabel(entry.shiftHandover.shiftNumber) : "-"}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900">{entry.client.name}</td>
                    <td className="px-4 py-2 text-gray-700">{entry.tickets || "-"}</td>
                    <td className="px-4 py-2">
                      <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", getStatusColor(entry.status))}>
                        {getStatusLabel(entry.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {entry.engineerWorkedBy?.name || entry.engineerWorked || "-"}
                    </td>
                    <td className="px-4 py-2 text-gray-700 max-w-[150px]">
                      <span className="line-clamp-2">{entry.issues || "-"}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-700 max-w-[150px]">
                      <span className="line-clamp-2">{entry.updates || "-"}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-700 max-w-[150px]">
                      <span className="line-clamp-2">{entry.handoverNotes || "-"}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-700 max-w-[150px]">
                      <span className="line-clamp-2">{entry.managerNotes || "-"}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{entry.filledBy?.name || "-"}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(entry.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            Showing {entries.length} entries
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && mode === "date" && handovers.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          No data found. Select a date and click Search.
        </div>
      )}
      {!loading && (mode === "employee" || mode === "client") && entries.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          No entries found. Select filters and click Search.
        </div>
      )}
    </div>
  );
}
