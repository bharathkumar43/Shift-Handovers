"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  AlertCircle,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HandoverEntry {
  id: string;
  client: { id: string; name: string };
  tickets: string | null;
  status: string;
  issues: string | null;
  updates: string | null;
  handoverNotes: string | null;
  engineer: { id: string; name: string } | null;
  filledBy: { id: string; name: string } | null;
}

interface Handover {
  id: string;
  date: string;
  projectId: string;
  shiftNumber: number;
  status: string;
  leadNotes: string | null;
  project: { id: string; name: string };
  lead: { id: string; name: string } | null;
  submittedBy: { id: string; name: string } | null;
  entries: HandoverEntry[];
}

interface DashboardData {
  handovers: Handover[];
  dailyDashboard: {
    dutyManager: string | null;
    week: string | null;
    keyIssues: string | null;
    actionsForTomorrow: string | null;
  } | null;
  metrics: {
    totalTickets: number;
    openIssues: number;
    resolved: number;
  };
}

export default function DashboardPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [managerNotes, setManagerNotes] = useState({
    dutyManager: "",
    week: "",
    keyIssues: "",
    actionsForTomorrow: "",
  });
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.dailyDashboard) {
          setManagerNotes({
            dutyManager: d.dailyDashboard.dutyManager || "",
            week: d.dailyDashboard.week || "",
            keyIssues: d.dailyDashboard.keyIssues || "",
            actionsForTomorrow: d.dailyDashboard.actionsForTomorrow || "",
          });
        } else {
          setManagerNotes({ dutyManager: "", week: "", keyIssues: "", actionsForTomorrow: "" });
        }
        setLoading(false);
      });
  }, [date]);

  const changeDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split("T")[0]);
  };

  const saveManagerNotes = async () => {
    setSavingNotes(true);
    await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ...managerNotes }),
    });
    setSavingNotes(false);
  };

  const getShiftStatus = (projectName: string, shiftNum: number): { status: string; lead: string } => {
    if (!data) return { status: "-", lead: "-" };
    const handover = data.handovers.find(
      (h) => h.project.name === projectName && h.shiftNumber === shiftNum
    );
    if (!handover) return { status: "Not Started", lead: "-" };
    return {
      status: handover.status === "SUBMITTED" ? "Submitted" : "Draft",
      lead: handover.lead?.name || "-",
    };
  };

  const projects = ["Content", "Email", "Messaging"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Shift Handover Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
          />
          <button
            onClick={() => changeDate(1)}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Ticket className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{data?.metrics.totalTickets}</p>
                  <p className="text-sm text-gray-500">Total Tickets Today</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{data?.metrics.openIssues}</p>
                  <p className="text-sm text-gray-500">Open Issues</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{data?.metrics.resolved}</p>
                  <p className="text-sm text-gray-500">Resolved</p>
                </div>
              </div>
            </div>
          </div>

          {/* Shift Status Overview */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Shift Status Overview</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Project</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700" colSpan={2}>
                      Shift 1 (Morning)
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700" colSpan={2}>
                      Shift 2 (Afternoon)
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700" colSpan={2}>
                      Shift 3 (Night)
                    </th>
                  </tr>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th></th>
                    <th className="px-4 py-2 text-xs text-gray-500 font-medium">Status</th>
                    <th className="px-4 py-2 text-xs text-gray-500 font-medium">Lead</th>
                    <th className="px-4 py-2 text-xs text-gray-500 font-medium">Status</th>
                    <th className="px-4 py-2 text-xs text-gray-500 font-medium">Lead</th>
                    <th className="px-4 py-2 text-xs text-gray-500 font-medium">Status</th>
                    <th className="px-4 py-2 text-xs text-gray-500 font-medium">Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((proj) => (
                    <tr key={proj} className="border-b border-gray-100">
                      <td className="px-6 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          {proj}
                        </div>
                      </td>
                      {[1, 2, 3].flatMap((s) => {
                        const info = getShiftStatus(proj, s);
                        return [
                          <td key={`${proj}-${s}-status`} className="px-4 py-3 text-center">
                            <span
                              className={cn(
                                "inline-block px-2.5 py-1 rounded-full text-xs font-medium",
                                info.status === "Submitted"
                                  ? "bg-green-100 text-green-700"
                                  : info.status === "Draft"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-gray-100 text-gray-500"
                              )}
                            >
                              {info.status}
                            </span>
                          </td>,
                          <td key={`${proj}-${s}-lead`} className="px-4 py-3 text-center text-sm text-gray-600">
                            {info.lead}
                          </td>,
                        ];
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Duty Manager Notes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Duty Manager Notes</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Duty Manager</label>
                <input
                  type="text"
                  value={managerNotes.dutyManager}
                  onChange={(e) => setManagerNotes({ ...managerNotes, dutyManager: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  placeholder="Manager name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Week</label>
                <input
                  type="text"
                  value={managerNotes.week}
                  onChange={(e) => setManagerNotes({ ...managerNotes, week: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  placeholder="Week number"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Key Issues / Escalations</label>
              <textarea
                value={managerNotes.keyIssues}
                onChange={(e) => setManagerNotes({ ...managerNotes, keyIssues: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-y text-gray-900"
                placeholder="Key issues and escalations..."
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Actions for Tomorrow</label>
              <textarea
                value={managerNotes.actionsForTomorrow}
                onChange={(e) => setManagerNotes({ ...managerNotes, actionsForTomorrow: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-y text-gray-900"
                placeholder="Actions for tomorrow..."
              />
            </div>
            <button
              onClick={saveManagerNotes}
              disabled={savingNotes}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingNotes ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
