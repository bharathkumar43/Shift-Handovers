"use client";

import { useState, useRef } from "react";
import {
  GripVertical, Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp,
} from "lucide-react";

interface MigrationTask {
  id: string;
  sortOrder: number;
  taskName: string;
  description: string | null;
  assignedTo: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  status: string;
  comments: string | null;
  additionalNotes: string | null;
}

const ASSIGNED_LABELS: Record<string, string> = {
  CLOUDFUZE: "CloudFuze",
  CUSTOMER: "Customer",
  CUSTOMER_CLOUDFUZE: "Both",
};

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
};

const ASSIGNED_COLORS: Record<string, string> = {
  CLOUDFUZE: "bg-indigo-100 text-indigo-700",
  CUSTOMER: "bg-amber-100 text-amber-700",
  CUSTOMER_CLOUDFUZE: "bg-purple-100 text-purple-700",
};

const EMPTY_FORM = {
  taskName: "",
  description: "",
  assignedTo: "CLOUDFUZE",
  plannedStartDate: "",
  plannedEndDate: "",
  actualStartDate: "",
  actualEndDate: "",
  status: "NOT_STARTED",
  comments: "",
  additionalNotes: "",
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

export default function TasksTab({ clientId, role, onCountChange }: Props) {
  const [tasks, setTasks] = useState<MigrationTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  const canEdit = role === "ADMIN" || role === "LEAD";

  const load = async () => {
    const res = await fetch(`/api/client-projects/${clientId}/tasks`);
    const data = await res.json();
    setTasks(data);
    onCountChange(data.length);
    setLoaded(true);
  };

  if (!loaded) {
    load();
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm animate-pulse">
        Loading tasks…
      </div>
    );
  }

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (t: MigrationTask) => {
    setEditingId(t.id);
    setForm({
      taskName: t.taskName,
      description: t.description ?? "",
      assignedTo: t.assignedTo,
      plannedStartDate: t.plannedStartDate ? t.plannedStartDate.slice(0, 10) : "",
      plannedEndDate: t.plannedEndDate ? t.plannedEndDate.slice(0, 10) : "",
      actualStartDate: t.actualStartDate ? t.actualStartDate.slice(0, 10) : "",
      actualEndDate: t.actualEndDate ? t.actualEndDate.slice(0, 10) : "",
      status: t.status,
      comments: t.comments ?? "",
      additionalNotes: t.additionalNotes ?? "",
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const save = async () => {
    if (!form.taskName.trim()) return;
    setSaving(true);
    const body = {
      ...form,
      plannedStartDate: form.plannedStartDate || null,
      plannedEndDate: form.plannedEndDate || null,
      actualStartDate: form.actualStartDate || null,
      actualEndDate: form.actualEndDate || null,
    };
    if (editingId) {
      const res = await fetch(`/api/client-projects/${clientId}/tasks/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
    } else {
      const res = await fetch(`/api/client-projects/${clientId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const created = await res.json();
      setTasks((prev) => [...prev, created]);
      onCountChange(tasks.length + 1);
    }
    setSaving(false);
    cancelForm();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/client-projects/${clientId}/tasks/${id}`, { method: "DELETE" });
    const next = tasks.filter((t) => t.id !== id);
    setTasks(next);
    onCountChange(next.length);
  };

  const onDragStart = (id: string) => setDraggingId(id);
  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    dragOverId.current = id;
  };

  const onDrop = async () => {
    if (!draggingId || dragOverId.current === draggingId) {
      setDraggingId(null);
      return;
    }
    const fromIdx = tasks.findIndex((t) => t.id === draggingId);
    const toIdx = tasks.findIndex((t) => t.id === dragOverId.current);
    const next = [...tasks];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setTasks(next);
    setDraggingId(null);
    await fetch(`/api/client-projects/${clientId}/tasks/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((t) => t.id) }),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
        {canEdit && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-gray-700">{editingId ? "Edit Task" : "New Task"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500">Task Name *</label>
              <input
                className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.taskName}
                onChange={(e) => setForm({ ...form, taskName: e.target.value })}
                placeholder="e.g. Run pilot migration"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Assigned To</label>
              <select
                className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              >
                <option value="CLOUDFUZE">CloudFuze</option>
                <option value="CUSTOMER">Customer</option>
                <option value="CUSTOMER_CLOUDFUZE">Both</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Status</label>
              <select
                className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Planned Start</label>
              <input type="date" className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.plannedStartDate} onChange={(e) => setForm({ ...form, plannedStartDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Planned End</label>
              <input type="date" className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.plannedEndDate} onChange={(e) => setForm({ ...form, plannedEndDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Actual Start</label>
              <input type="date" className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.actualStartDate} onChange={(e) => setForm({ ...form, actualStartDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Actual End</label>
              <input type="date" className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={form.actualEndDate} onChange={(e) => setForm({ ...form, actualEndDate: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500">Description</label>
              <textarea
                rows={2}
                className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500">Comments</label>
              <textarea
                rows={2}
                className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                value={form.comments}
                onChange={(e) => setForm({ ...form, comments: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500">Additional Notes</label>
              <textarea
                rows={2}
                className="mt-0.5 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                value={form.additionalNotes}
                onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={cancelForm} className="flex items-center gap-1 text-sm text-gray-600 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button onClick={save} disabled={saving || !form.taskName.trim()} className="flex items-center gap-1 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              <Check className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No tasks yet.{canEdit && " Click \"Add Task\" to create the migration plan."}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                {canEdit && <th className="w-8 px-2 py-2.5" />}
                <th className="px-4 py-2.5 text-left">Task</th>
                <th className="px-4 py-2.5 text-left hidden md:table-cell">Assigned</th>
                <th className="px-4 py-2.5 text-left hidden lg:table-cell">Planned</th>
                <th className="px-4 py-2.5 text-left hidden lg:table-cell">Actual</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                {canEdit && <th className="px-4 py-2.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((t) => (
                <>
                  <tr
                    key={t.id}
                    draggable={canEdit}
                    onDragStart={() => onDragStart(t.id)}
                    onDragOver={(e) => onDragOver(e, t.id)}
                    onDrop={onDrop}
                    className={`hover:bg-gray-50 transition-colors ${draggingId === t.id ? "opacity-40" : ""}`}
                  >
                    {canEdit && (
                      <td className="px-2 py-3 cursor-grab active:cursor-grabbing text-gray-300">
                        <GripVertical className="w-4 h-4" />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {expandedId === t.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <span className="font-medium text-gray-800">{t.taskName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ASSIGNED_COLORS[t.assignedTo] ?? "bg-gray-100 text-gray-600"}`}>
                        {ASSIGNED_LABELS[t.assignedTo] ?? t.assignedTo}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600 text-xs">
                      {fmt(t.plannedStartDate)} – {fmt(t.plannedEndDate)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600 text-xs">
                      {fmt(t.actualStartDate)} – {fmt(t.actualEndDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(t)} className="text-gray-400 hover:text-indigo-600">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {role === "ADMIN" && (
                            <button onClick={() => deleteTask(t.id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  {expandedId === t.id && (
                    <tr key={`${t.id}-expand`} className="bg-gray-50">
                      <td colSpan={canEdit ? 7 : 5} className="px-8 py-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
                          {t.description && (
                            <div className="md:col-span-3">
                              <p className="font-medium text-gray-500 mb-0.5">Description</p>
                              <p>{t.description}</p>
                            </div>
                          )}
                          {t.comments && (
                            <div>
                              <p className="font-medium text-gray-500 mb-0.5">Comments</p>
                              <p>{t.comments}</p>
                            </div>
                          )}
                          {t.additionalNotes && (
                            <div>
                              <p className="font-medium text-gray-500 mb-0.5">Additional Notes</p>
                              <p>{t.additionalNotes}</p>
                            </div>
                          )}
                          <div className="md:hidden">
                            <p className="font-medium text-gray-500 mb-0.5">Planned</p>
                            <p>{fmt(t.plannedStartDate)} – {fmt(t.plannedEndDate)}</p>
                          </div>
                          <div className="md:hidden">
                            <p className="font-medium text-gray-500 mb-0.5">Actual</p>
                            <p>{fmt(t.actualStartDate)} – {fmt(t.actualEndDate)}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
