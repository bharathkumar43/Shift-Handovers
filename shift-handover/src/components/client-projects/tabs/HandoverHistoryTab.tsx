"use client";

import { useState, useEffect } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn, getStatusColor } from "@/lib/utils";
import { format } from "date-fns";

interface ClientEntry {
  id: string;
  clientId: string;
  tickets: string | null;
  status: string;
  issues: string | null;
  updates: string | null;
  handoverNotes: string | null;
  managerNotes: string | null;
  engineerWorkedBy: { name: string } | null;
  filledBy: { name: string } | null;
  client: { name: string };
}

interface Handover {
  id: string;
  date: string;
  shiftNumber: number;
  status: string;
  project: { name: string };
  lead: { name: string } | null;
  submittedBy: { name: string } | null;
  entries: ClientEntry[];
}

interface Props {
  clientId: string;
}

export default function HandoverHistoryTab({ clientId }: Props) {
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    setLoading(true);
    const url = `/api/history?clientId=${clientId}&startDate=${startDate}&endDate=${endDate}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const filtered = data.map((h: Handover) => ({
          ...h,
          entries: h.entries.filter((e) => e.clientId === clientId),
        })).filter((h: Handover) => h.entries.length > 0);
        setHandovers(filtered);
      })
      .finally(() => setLoading(false));
  }, [clientId, startDate, endDate]);

  const shiftLabel = (n: number) => ["", "Morning (Shift 1)", "Afternoon (Shift 2)", "Night (Shift 3)"][n] ?? `Shift ${n}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">From</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">To</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500" />
        </div>
        <span className="text-xs text-gray-400 ml-auto">{handovers.length} handover{handovers.length !== 1 ? "s" : ""} found</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
      ) : handovers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm">No handover entries found for this client in the selected date range.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {handovers.map((h) => {
            const expanded = expandedId === h.id;
            const entry = h.entries[0];
            return (
              <div key={h.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors text-left"
                  onClick={() => setExpandedId(expanded ? null : h.id)}
                >
                  <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-semibold text-gray-900">{format(new Date(h.date), "EEE, MMM d, yyyy")}</span>
                    <span className="text-sm text-gray-500">{h.project.name}</span>
                    <span className="text-sm text-gray-500">{shiftLabel(h.shiftNumber)}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", h.status === "SUBMITTED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                      {h.status}
                    </span>
                    {entry && (
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getStatusColor(entry.status))}>
                        {entry.status.replace(/_/g, " ")}
                      </span>
                    )}
                    {entry?.tickets && <span className="text-xs text-gray-500">Tickets: {entry.tickets}</span>}
                  </div>
                  {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>

                {expanded && entry && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-gray-50/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      {entry.engineerWorkedBy && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 block mb-0.5">Engineer Worked</span>
                          <span className="text-gray-900">{entry.engineerWorkedBy.name}</span>
                        </div>
                      )}
                      {entry.filledBy && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 block mb-0.5">Filled By</span>
                          <span className="text-gray-900">{entry.filledBy.name}</span>
                        </div>
                      )}
                      {h.lead && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 block mb-0.5">Shift Lead</span>
                          <span className="text-gray-900">{h.lead.name}</span>
                        </div>
                      )}
                    </div>
                    {entry.issues && (
                      <div>
                        <span className="text-xs font-medium text-red-500 block mb-0.5">Issues</span>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.issues}</p>
                      </div>
                    )}
                    {entry.updates && (
                      <div>
                        <span className="text-xs font-medium text-blue-500 block mb-0.5">Updates</span>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.updates}</p>
                      </div>
                    )}
                    {entry.handoverNotes && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">Engineer Notes</span>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.handoverNotes}</p>
                      </div>
                    )}
                    {entry.managerNotes && (
                      <div>
                        <span className="text-xs font-medium text-amber-600 block mb-0.5">Manager Notes</span>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.managerNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
