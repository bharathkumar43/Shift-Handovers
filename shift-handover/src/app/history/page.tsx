"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Search, Eye, Filter } from "lucide-react";
import { cn, getShiftLabel, getStatusLabel, getStatusColor } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
}

interface HandoverEntry {
  id: string;
  client: { name: string };
  tickets: string | null;
  status: string;
  issues: string | null;
  updates: string | null;
  handoverNotes: string | null;
  engineer: { name: string } | null;
  filledBy: { name: string } | null;
}

interface Handover {
  id: string;
  date: string;
  shiftNumber: number;
  status: string;
  leadNotes: string | null;
  project: { id: string; name: string };
  lead: { name: string } | null;
  submittedBy: { name: string } | null;
  submittedAt: string | null;
  entries: HandoverEntry[];
}

export default function HistoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedShift, setSelectedShift] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data));
  }, []);

  const search = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (selectedProject) params.set("projectId", selectedProject);
    if (selectedShift) params.set("shiftNumber", selectedShift);

    const res = await fetch(`/api/history?${params.toString()}`);
    const data = await res.json();
    setHandovers(data);
    setLoading(false);
  };

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    setStartDate(weekAgo);
    setEndDate(today);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      search();
    }
  }, [startDate, endDate, selectedProject, selectedShift]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-7 h-7 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Handover History</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Shift</label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
            >
              <option value="">All Shifts</option>
              <option value="1">Shift 1 (Morning)</option>
              <option value="2">Shift 2 (Afternoon)</option>
              <option value="3">Shift 3 (Night)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-500">Loading...</div>
      ) : handovers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          No handovers found for the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {handovers.map((h) => (
            <div key={h.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-semibold text-gray-900">
                      {new Date(h.date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="text-gray-700 font-medium">{h.project.name}</span>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="text-gray-600">{getShiftLabel(h.shiftNumber)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {h.submittedBy && (
                    <span className="text-xs text-gray-500">
                      by {h.submittedBy.name}
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
                  <Eye className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {expandedId === h.id && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Client</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Tickets</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Issues</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Updates</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Handover</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Next Shift Engineer</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Filled By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {h.entries
                        .filter((e) => e.status !== "NA" || e.tickets || e.issues || e.updates)
                        .map((entry) => (
                          <tr key={entry.id} className="border-b border-gray-100">
                            <td className="px-3 py-2 font-medium text-gray-900">{entry.client.name}</td>
                            <td className="px-3 py-2 text-gray-700">{entry.tickets || "-"}</td>
                            <td className="px-3 py-2">
                              <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", getStatusColor(entry.status))}>
                                {getStatusLabel(entry.status)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{entry.issues || "-"}</td>
                            <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{entry.updates || "-"}</td>
                            <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{entry.handoverNotes || "-"}</td>
                            <td className="px-3 py-2 text-gray-600">{entry.engineer?.name || "-"}</td>
                            <td className="px-3 py-2 text-gray-500 text-xs">{entry.filledBy?.name || "-"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {h.leadNotes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-xs font-medium text-gray-500">Lead Notes:</span>
                      <p className="text-sm text-gray-700 mt-1">{h.leadNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
