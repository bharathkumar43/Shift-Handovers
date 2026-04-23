"use client";

import { Fragment, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp } from "lucide-react";

interface MigrationIssue {
  id: string;
  occurredAt: string;
  description: string;
  l3TicketKey: string | null;
  cfitsTicketKey: string | null;
  ticketStatus: string;
  resolvedAt: string | null;
  resolution: string | null;
  daysToSolve: number | null;
  /** Set when this row mirrors the shift handover "Issues" cell for the client */
  sourceClientEntryId?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const EMPTY_FORM = {
  occurredAt: "",
  description: "",
  l3TicketKey: "",
  cfitsTicketKey: "",
  ticketStatus: "OPEN",
  resolvedAt: "",
  resolution: "",
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  clientId: string;
  role: string;
  onCountChange: (n: number) => void;
}

export default function IssuesTab({ clientId, role, onCountChange }: Props) {
  const [issues, setIssues] = useState<MigrationIssue[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const canEdit = role === "ADMIN" || role === "LEAD";

  const load = async () => {
    const res = await fetch(`/api/client-projects/${clientId}/issues`);
    const data = await res.json();
    setIssues(data);
    onCountChange(data.length);
    setLoaded(true);
  };

  if (!loaded) {
    load();
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm animate-pulse">
        Loading issues…
      </div>
    );
  }

  const filtered = statusFilter ? issues.filter((i) => i.ticketStatus === statusFilter) : issues;

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (issue: MigrationIssue) => {
    setEditingId(issue.id);
    setForm({
      occurredAt: issue.occurredAt ? issue.occurredAt.slice(0, 10) : "",
      description: issue.description,
      l3TicketKey: issue.l3TicketKey ?? "",
      cfitsTicketKey: issue.cfitsTicketKey ?? "",
      ticketStatus: issue.ticketStatus,
      resolvedAt: issue.resolvedAt ? issue.resolvedAt.slice(0, 10) : "",
      resolution: issue.resolution ?? "",
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const save = async () => {
    if (!form.occurredAt || !form.description.trim()) return;
    setSaving(true);
    const body = {
      ...form,
      l3TicketKey: form.l3TicketKey || null,
      cfitsTicketKey: form.cfitsTicketKey || null,
      resolvedAt: form.resolvedAt || null,
      resolution: form.resolution || null,
    };
    if (editingId) {
      const res = await fetch(`/api/client-projects/${clientId}/issues/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const updated = await res.json();
      setIssues((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
    } else {
      const res = await fetch(`/api/client-projects/${clientId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const created = await res.json();
      setIssues((prev) => [created, ...prev]);
      onCountChange(issues.length + 1);
    }
    setSaving(false);
    cancelForm();
  };

  const deleteIssue = async (id: string) => {
    if (!confirm("Delete this issue?")) return;
    await fetch(`/api/client-projects/${clientId}/issues/${id}`, { method: "DELETE" });
    const next = issues.filter((i) => i.id !== id);
    setIssues(next);
    onCountChange(next.length);
  };

  const openCount = issues.filter((i) => i.ticketStatus === "OPEN").length;
  const inProgressCount = issues.filter((i) => i.ticketStatus === "IN_PROGRESS").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      {issues.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {[
            { label: "Open", count: openCount, color: "bg-red-50 text-red-700 border border-red-200" },
            { label: "In Progress", count: inProgressCount, color: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
            { label: "Resolved", count: issues.filter((i) => i.ticketStatus === "RESOLVED").length, color: "bg-green-50 text-green-700 border border-green-200" },
            { label: "Total", count: issues.length, color: "bg-gray-50 text-gray-700 border border-gray-200" },
          ].map(({ label, count, color }) => (
            <div key={label} className={`rounded-xl px-4 py-2 text-sm font-medium ${color}`}>
              {count} {label}
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        {canEdit && (
          <button
            onClick={openAdd}
            className="ml-auto flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Log Issue
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-gray-700">{editingId ? "Edit Issue" : "Log New Issue"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Date Occurred *</label>
              <input
                type="date"
                className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.occurredAt}
                onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Status</label>
              <select
                className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.ticketStatus}
                onChange={(e) => setForm({ ...form, ticketStatus: e.target.value })}
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500">Description *</label>
              <textarea
                rows={3}
                className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the issue…"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">L3 Ticket Key</label>
              <input
                className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.l3TicketKey}
                onChange={(e) => setForm({ ...form, l3TicketKey: e.target.value })}
                placeholder="e.g. L3-1234"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">CFITS Ticket Key</label>
              <input
                className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.cfitsTicketKey}
                onChange={(e) => setForm({ ...form, cfitsTicketKey: e.target.value })}
                placeholder="e.g. CFITS-567"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Resolved Date</label>
              <input
                type="date"
                className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.resolvedAt}
                onChange={(e) => setForm({ ...form, resolvedAt: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Resolution</label>
              <input
                className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.resolution}
                onChange={(e) => setForm({ ...form, resolution: e.target.value })}
                placeholder="How was it resolved?"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={cancelForm} className="flex items-center gap-1 text-sm text-gray-600 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !form.occurredAt || !form.description.trim()}
              className="flex items-center gap-1 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {issues.length === 0
            ? canEdit ? "No issues logged. Click \"Log Issue\" to track a problem." : "No issues recorded."
            : "No issues match the selected filter."}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5 text-left">Date</th>
                <th className="px-4 py-2.5 text-left">Description</th>
                <th className="px-4 py-2.5 text-left hidden md:table-cell">Tickets</th>
                <th className="px-4 py-2.5 text-left hidden lg:table-cell">Days to Solve</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                {canEdit && <th className="px-4 py-2.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((issue) => (
                <Fragment key={issue.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{fmt(issue.occurredAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
                          className="text-gray-400 hover:text-gray-600 shrink-0"
                        >
                          {expandedId === issue.id
                            ? <ChevronUp className="w-3.5 h-3.5" />
                            : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-gray-800 line-clamp-1">{issue.description}</span>
                        {issue.sourceClientEntryId && (
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            Handover
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-col gap-0.5 text-xs">
                        {issue.l3TicketKey && (
                          <span className="font-medium text-gray-700">L3: {issue.l3TicketKey}</span>
                        )}
                        {issue.cfitsTicketKey && (
                          <span className="font-medium text-gray-700">CFITS: {issue.cfitsTicketKey}</span>
                        )}
                        {!issue.l3TicketKey && !issue.cfitsTicketKey && (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-600">
                      {issue.daysToSolve != null ? (
                        <span className={`font-medium ${issue.daysToSolve > 7 ? "text-red-600" : issue.daysToSolve > 3 ? "text-amber-600" : "text-green-600"}`}>
                          {issue.daysToSolve}d
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[issue.ticketStatus] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[issue.ticketStatus] ?? issue.ticketStatus}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(issue)} className="text-gray-400 hover:text-indigo-600">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {role === "ADMIN" && (
                            <button onClick={() => deleteIssue(issue.id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  {expandedId === issue.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={canEdit ? 6 : 5} className="px-8 py-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
                          <div>
                            <p className="font-medium text-gray-500 mb-0.5">Full Description</p>
                            <p className="whitespace-pre-wrap">{issue.description}</p>
                          </div>
                          {issue.resolution && (
                            <div>
                              <p className="font-medium text-gray-500 mb-0.5">Resolution</p>
                              <p>{issue.resolution}</p>
                            </div>
                          )}
                          {issue.resolvedAt && (
                            <div>
                              <p className="font-medium text-gray-500 mb-0.5">Resolved On</p>
                              <p>{fmt(issue.resolvedAt)}</p>
                            </div>
                          )}
                          <div className="md:hidden">
                            <p className="font-medium text-gray-500 mb-0.5">Tickets</p>
                            <p>{issue.l3TicketKey ? `L3: ${issue.l3TicketKey}` : ""} {issue.cfitsTicketKey ? `CFITS: ${issue.cfitsTicketKey}` : ""}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
