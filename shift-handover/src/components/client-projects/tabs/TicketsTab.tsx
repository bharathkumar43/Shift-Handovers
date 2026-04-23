"use client";

import { useState } from "react";
import TicketLinksDisplay from "@/components/TicketLinksDisplay";

interface TicketRow {
  id: string;
  content: string;
  updatedAt: string;
  handoverDate: string;
  shiftNumber: number;
  handoverStatus: string;
  projectName: string;
}

interface Props {
  clientId: string;
  onCountChange: (n: number) => void;
}

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtUpdated(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TicketsTab({ clientId, onCountChange }: Props) {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/client-projects/${clientId}/tickets`);
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    onCountChange(Array.isArray(data) ? data.length : 0);
    setLoaded(true);
  };

  if (!loaded) {
    load();
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm animate-pulse">
        Loading tickets…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Rows here mirror the <strong className="font-medium text-gray-800">Tickets</strong> column on the shift
        handover grid for this client. They update when anyone saves the handover form.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No ticket text yet. Add tickets on a shift handover for this client, then save the handover.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Handover date</th>
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Tickets</th>
                <th className="px-4 py-3">Handover</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-gray-50/80">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-800">{fmtDate(r.handoverDate)}</td>
                  <td className="px-4 py-3 text-gray-700">{r.shiftNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{r.projectName}</td>
                  <td className="px-4 py-3 max-w-xl">
                    <TicketLinksDisplay text={r.content} variant="stacked" />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.handoverStatus}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">{fmtUpdated(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
