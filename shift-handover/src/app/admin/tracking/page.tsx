"use client";

import { useEffect, useState } from "react";
import {
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn, getShiftLabel, getStatusColor, getStatusLabel } from "@/lib/utils";

interface ShiftEntry {
  clientName: string;
  status: string;
  filledBy: string | null;
  filledAt: string;
  hasData: boolean;
}

interface ShiftSubmission {
  projectName: string;
  shiftNumber: number;
  status: string;
  submittedBy: string | null;
  submittedAt: string | null;
  leadName: string | null;
  totalEntries: number;
  filledEntries: number;
  entries: ShiftEntry[];
}

interface EngineerActivity {
  userId: string;
  userName: string;
  entriesFilledCount: number;
  lastFilledAt: string | null;
  shifts: {
    projectName: string;
    shiftNumber: number;
    entriesCount: number;
    filledAt: string | null;
  }[];
}

interface TrackingData {
  date: string;
  shiftSubmissions: ShiftSubmission[];
  engineerActivity: EngineerActivity[];
  summary: {
    totalEngineers: number;
    filledCount: number;
    notFilledCount: number;
    filledEngineers: string[];
    notFilledEngineers: string[];
  };
}

export default function TrackingPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedShift, setExpandedShift] = useState<string | null>(null);

  const loadData = async (d: string) => {
    setLoading(true);
    const res = await fetch(`/api/tracking?date=${d}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => {
    loadData(date);
  }, [date]);

  const changeDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split("T")[0]);
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UserCheck className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Shift Compliance Tracking</h1>
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
      ) : !data ? (
        <div className="text-gray-500 text-center py-12">No data available</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{data.summary.totalEngineers}</p>
                  <p className="text-sm text-gray-500">Total Engineers</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">{data.summary.filledCount}</p>
                  <p className="text-sm text-gray-500">Filled Data</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-700">{data.summary.notFilledCount}</p>
                  <p className="text-sm text-gray-500">Not Filled</p>
                </div>
              </div>
            </div>
          </div>

          {/* Engineers Who Have NOT Filled */}
          {data.summary.notFilledEngineers.length > 0 && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <UserX className="w-5 h-5 text-red-600" />
                <h2 className="text-sm font-semibold text-red-800">
                  Engineers Who Have NOT Filled Any Data Today
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.summary.notFilledEngineers.map((name) => (
                  <span
                    key={name}
                    className="px-3 py-1.5 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-700"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Per-Engineer Activity Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Engineer Activity Details</h2>
              <p className="text-sm text-gray-500 mt-0.5">Who filled what data and at what time</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 font-semibold text-gray-700">Engineer</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700">Entries Filled</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700">Last Activity</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700">Shifts Covered</th>
                </tr>
              </thead>
              <tbody>
                {data.engineerActivity
                  .sort((a, b) => b.entriesFilledCount - a.entriesFilledCount)
                  .map((eng) => (
                    <tr key={eng.userId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{eng.userName}</td>
                      <td className="px-6 py-3">
                        {eng.entriesFilledCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Filled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3" />
                            Not Filled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-700">{eng.entriesFilledCount}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {eng.lastFilledAt ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {formatTime(eng.lastFilledAt)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {eng.shifts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {eng.shifts.map((s, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium"
                              >
                                {s.projectName} S{s.shiftNumber} ({s.entriesCount})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Per-Shift Breakdown */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Shift-by-Shift Breakdown</h2>
            {data.shiftSubmissions.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                No handovers recorded for this date.
              </div>
            ) : (
              data.shiftSubmissions.map((shift) => {
                const shiftKey = `${shift.projectName}-${shift.shiftNumber}`;
                const isExpanded = expandedShift === shiftKey;
                return (
                  <div
                    key={shiftKey}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedShift(isExpanded ? null : shiftKey)}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="font-semibold text-gray-900">{shift.projectName}</span>
                          <span className="mx-2 text-gray-300">|</span>
                          <span className="text-gray-700">{getShiftLabel(shift.shiftNumber)}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {shift.filledEntries}/{shift.totalEntries} clients filled
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {shift.submittedBy && (
                          <span className="text-xs text-gray-500">
                            Submitted by {shift.submittedBy}
                            {shift.submittedAt && ` at ${formatTime(shift.submittedAt)}`}
                          </span>
                        )}
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium",
                            shift.status === "SUBMITTED"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          )}
                        >
                          {shift.status === "SUBMITTED" ? "Submitted" : "Draft"}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-200">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left px-6 py-2 font-medium text-gray-600">Client</th>
                              <th className="text-left px-6 py-2 font-medium text-gray-600">Status</th>
                              <th className="text-left px-6 py-2 font-medium text-gray-600">Filled By</th>
                              <th className="text-left px-6 py-2 font-medium text-gray-600">Filled At</th>
                              <th className="text-left px-6 py-2 font-medium text-gray-600">Has Data</th>
                            </tr>
                          </thead>
                          <tbody>
                            {shift.entries.map((entry, i) => (
                              <tr key={i} className="border-b border-gray-100">
                                <td className="px-6 py-2 font-medium text-gray-900">{entry.clientName}</td>
                                <td className="px-6 py-2">
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded text-xs font-medium border",
                                      getStatusColor(entry.status)
                                    )}
                                  >
                                    {getStatusLabel(entry.status)}
                                  </span>
                                </td>
                                <td className="px-6 py-2 text-gray-600">{entry.filledBy || "-"}</td>
                                <td className="px-6 py-2 text-gray-500 text-xs">
                                  {entry.filledBy ? formatTime(entry.filledAt) : "-"}
                                </td>
                                <td className="px-6 py-2">
                                  {entry.hasData ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-gray-300" />
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
