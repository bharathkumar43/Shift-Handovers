"use client";

import { useEffect, useState } from "react";
import { Users, Plus, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { cn, getShiftLabel } from "@/lib/utils";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  assignedShifts: number[];
  createdAt: string;
}

const ROLES = ["ENGINEER", "LEAD", "ADMIN"];
const SHIFT_NUMS = [1, 2, 3] as const;

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "ENGINEER",
    assignedShifts: [] as number[],
  });
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const addUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      setMessage("All fields are required");
      return;
    }
    setAdding(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      await loadUsers();
      setFormData({ name: "", email: "", password: "", role: "ENGINEER", assignedShifts: [] });
      setShowForm(false);
      setMessage("User added successfully");
      setTimeout(() => setMessage(""), 3000);
    } else {
      const err = await res.json();
      setMessage(err.error || "Error adding user");
    }
    setAdding(false);
  };

  const toggleUser = async (user: UserData) => {
    await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, active: !user.active }),
    });
    await loadUsers();
  };

  const changeRole = async (user: UserData, newRole: string) => {
    await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, role: newRole }),
    });
    await loadUsers();
  };

  const toggleUserShift = async (user: UserData, shiftNum: number) => {
    const current = user.assignedShifts ?? [];
    const has = current.includes(shiftNum);
    const next = has
      ? current.filter((s) => s !== shiftNum)
      : [...current, shiftNum].sort((a, b) => a - b);
    await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, assignedShifts: next }),
    });
    await loadUsers();
  };

  const toggleFormShift = (shiftNum: number) => {
    setFormData((prev) => {
      const has = prev.assignedShifts.includes(shiftNum);
      const next = has
        ? prev.assignedShifts.filter((s) => s !== shiftNum)
        : [...prev.assignedShifts, shiftNum].sort((a, b) => a - b);
      return { ...prev, assignedShifts: next };
    });
  };

  const deleteUser = async (user: UserData) => {
    const res = await fetch(`/api/users?id=${user.id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage(`User "${user.name}" has been deleted`);
      setTimeout(() => setMessage(""), 3000);
      await loadUsers();
    } else {
      const err = await res.json();
      setMessage(err.error || "Error deleting user");
    }
    setDeleteConfirm(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {message && (
        <div
          className={cn(
            "mb-4 px-4 py-2 rounded-lg text-sm border",
            /error|forbidden|required|cannot|not found/i.test(message)
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-green-50 text-green-700 border-green-200"
          )}
        >
          {message}
        </div>
      )}

      {/* Add User Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">New User</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
                placeholder="john@cloudfuze.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
                placeholder="Password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Shifts covered</label>
              <p className="text-xs text-gray-500 mb-2">
                Select each shift this person may work. They only appear in handover and other user dropdowns for shifts
                you check here. None selected means they are hidden from those lists.
              </p>
              <div className="flex flex-wrap gap-3">
                {SHIFT_NUMS.map((sn) => (
                  <label key={sn} className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.assignedShifts.includes(sn)}
                      onChange={() => toggleFormShift(sn)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {getShiftLabel(sn)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addUser}
              disabled={adding}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {adding ? "Adding..." : "Create User"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <p className="text-xs text-gray-500 mb-2">
        <strong className="text-gray-600">Deactivate</strong> blocks sign-in but keeps the account.{" "}
        <strong className="text-gray-600">Delete</strong> permanently removes the user (you cannot delete your own account).
      </p>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 font-semibold text-gray-700">Name</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-700">Email</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-700">Role</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-700">Shifts</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-700">Status</th>
              <th className="text-right px-6 py-3 font-semibold text-gray-700 whitespace-nowrap">
                Actions <span className="font-normal text-gray-400">(deactivate / delete)</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-3 text-gray-600">{user.email}</td>
                <td className="px-6 py-3">
                  <select
                    value={user.role}
                    onChange={(e) => changeRole(user, e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-3">
                  <div className="flex flex-wrap gap-2">
                    {SHIFT_NUMS.map((sn) => (
                      <label
                        key={sn}
                        className="inline-flex items-center gap-1 text-xs text-gray-600 cursor-pointer whitespace-nowrap"
                      >
                        <input
                          type="checkbox"
                          checked={user.assignedShifts?.includes(sn) ?? false}
                          onChange={() => toggleUserShift(user, sn)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                        />
                        <span className="hidden sm:inline">{getShiftLabel(sn)}</span>
                        <span className="sm:hidden">S{sn}</span>
                      </label>
                    ))}
                  </div>
                  {(!user.assignedShifts || user.assignedShifts.length === 0) && (
                    <p className="text-[10px] text-amber-700 mt-1">
                      No shifts — hidden from handover and user dropdowns until at least one is selected.
                    </p>
                  )}
                </td>
                <td className="px-6 py-3">
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      user.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleUser(user)}
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shrink-0",
                        user.active ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"
                      )}
                    >
                      {user.active ? (
                        <>
                          <ToggleRight className="w-4 h-4" /> Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4" /> Activate
                        </>
                      )}
                    </button>
                    {deleteConfirm === user.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-gray-500 mr-1 hidden sm:inline">Delete user?</span>
                        <button
                          type="button"
                          onClick={() => deleteUser(user)}
                          className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          Confirm delete
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
                        onClick={() => setDeleteConfirm(user.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors shrink-0"
                        title="Permanently delete this user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
