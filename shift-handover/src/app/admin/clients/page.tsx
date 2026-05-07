"use client";

import { useEffect, useState } from "react";
import { Settings, Plus, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
  projectId: string;
  sortOrder: number;
  active: boolean;
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  if (!text.trim()) return fallback;
  try {
    const j = JSON.parse(text) as { error?: string };
    return j.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function ManageClientsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(true);
  const [newClientName, setNewClientName] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0].id);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    fetch(`/api/clients?projectId=${selectedProject}`)
      .then((r) => r.json())
      .then((data) => setClients(data));
  }, [selectedProject]);

  const addClient = async () => {
    if (!newClientName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newClientName.trim(), projectId: selectedProject }),
    });

    if (res.ok) {
      const client = await res.json();
      setClients([...clients, client]);
      setNewClientName("");
      setMessage("Client added successfully");
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage(await readErrorMessage(res, "Error adding client"));
    }
    setAdding(false);
  };

  const toggleClient = async (client: Client) => {
    const res = await fetch("/api/clients", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: client.id, active: !client.active }),
    });
    if (res.ok) {
      setClients(clients.map((c) => (c.id === client.id ? { ...c, active: !c.active } : c)));
    }
  };

  const deleteClient = async (client: Client) => {
    const res = await fetch(`/api/clients?id=${client.id}`, { method: "DELETE" });
    if (res.ok) {
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      setMessage(`Client "${client.name}" has been deleted`);
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage(await readErrorMessage(res, "Error deleting client"));
    }
    setDeleteConfirm(null);
  };

  const filteredClients = clients.filter((c) => c.projectId === selectedProject);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-7 h-7 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Manage Clients</h1>
      </div>

      {/* Project Selector */}
      <div className="flex gap-3 mb-6">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProject(p.id)}
            className={cn(
              "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
              selectedProject === p.id
                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {message && (
        <div
          className={cn(
            "mb-4 px-4 py-2 rounded-lg text-sm border",
            /error|forbidden/i.test(message)
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-green-50 text-green-700 border-green-200"
          )}
        >
          {message}
        </div>
      )}

      {/* Add Client */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            placeholder="New client name"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
            onKeyDown={(e) => e.key === "Enter" && addClient()}
          />
          <button
            onClick={addClient}
            disabled={adding || !newClientName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      </div>

      {/* Clients List */}
      <p className="text-xs text-gray-500 mb-2">
        Deactivate hides the client from new handovers. Delete permanently removes the client and its entries from all handovers.
      </p>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 font-semibold text-gray-700">#</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-700">Client Name</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-700">Status</th>
              <th className="text-right px-6 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client, idx) => (
              <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-500">{idx + 1}</td>
                <td className="px-6 py-3 font-medium text-gray-900">{client.name}</td>
                <td className="px-6 py-3">
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      client.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {client.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => toggleClient(client)}
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                        client.active ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"
                      )}
                    >
                      {client.active ? (
                        <><ToggleRight className="w-4 h-4" /> Deactivate</>
                      ) : (
                        <><ToggleLeft className="w-4 h-4" /> Activate</>
                      )}
                    </button>
                    {deleteConfirm === client.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => deleteClient(client)}
                          className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(null)}
                          className="inline-flex items-center text-xs font-medium px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(client.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredClients.length === 0 && (
          <div className="p-8 text-center text-gray-500">No clients for this project.</div>
        )}
      </div>
    </div>
  );
}
