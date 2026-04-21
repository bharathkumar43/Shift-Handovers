"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Search, FolderOpen, ExternalLink, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MigrationProject {
  id: string;
  status: string;
  projectManagerId: string | null;
  projectManager: { name: string } | null;
  sowStartDate: string | null;
  sowEndDate: string | null;
  productType: string | null;
  _count: { batchRuns: number };
}

interface Client {
  id: string;
  name: string;
  active: boolean;
  project: { name: string };
  migrationProject: MigrationProject | null;
}

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Single product-line label (avoid duplicate project pillar + MESSAGE/CONTENT/EMAIL raw enum). */
const PRODUCT_LINE_LABEL: Record<string, string> = {
  CONTENT: "Content",
  MESSAGE: "Message",
  EMAIL: "Email",
};

export default function ClientProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProject, setFilterProject] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/clients?includeProjects=true")
      .then((r) => r.json())
      .then(setClients)
      .finally(() => setLoading(false));
  }, [status]);

  const projects = [...new Set(clients.map((c) => c.project.name))].sort();

  const filtered = clients.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterProject && c.project.name !== filterProject) return false;
    if (filterStatus) {
      const mpStatus = c.migrationProject?.status ?? "NOT_STARTED";
      if (mpStatus !== filterStatus) return false;
    }
    return true;
  });

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  void session;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Migration Projects</h1>
            <span className="text-sm text-gray-400 ml-2">{filtered.length} of {clients.length} clients</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">All migration clients with project details and batch tracking</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No clients match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => {
              const mp = c.migrationProject;
              const mpStatus = mp?.status ?? "NOT_STARTED";
              return (
                <Link key={c.id} href={`/client-projects/${c.id}`} className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all p-5 block">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate flex-1">{c.name}</h3>
                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 shrink-0 mt-0.5 transition-colors" />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {mp?.productType ? (
                      <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-medium">
                        {PRODUCT_LINE_LABEL[mp.productType] ?? mp.productType}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{c.project.name}</span>
                    )}
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[mpStatus])}>
                      {STATUS_LABELS[mpStatus]}
                    </span>
                  </div>

                  {mp?.projectManager && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>{mp.projectManager.name}</span>
                    </div>
                  )}
                  {mp?.sowStartDate && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>SOW: {format(new Date(mp.sowStartDate), "MMM d, yyyy")}{mp.sowEndDate ? ` → ${format(new Date(mp.sowEndDate), "MMM d, yyyy")}` : ""}</span>
                    </div>
                  )}

                  <div className="flex gap-4 pt-2 border-t border-gray-100 text-xs text-gray-400">
                    <span>{mp?._count?.batchRuns ?? 0} batches</span>
                    {!c.active && <span className="text-red-400 ml-auto">Inactive</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
