"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import ProjectDetailHeader from "@/components/client-projects/ProjectDetailHeader";
import ProjectDetailTabs from "@/components/client-projects/ProjectDetailTabs";
import ProjectEditForm from "@/components/client-projects/ProjectEditForm";
import OverviewTab from "@/components/client-projects/tabs/OverviewTab";
import MigrationItemsTab from "@/components/client-projects/tabs/MigrationItemsTab";
import IssuesTab from "@/components/client-projects/tabs/IssuesTab";
import BatchTab from "@/components/client-projects/tabs/BatchTab";
import HandoverHistoryTab from "@/components/client-projects/tabs/HandoverHistoryTab";

interface User { id: string; name: string; assignedShifts: number[]; }

interface MigrationProject {
  id: string;
  clientId: string;
  status: string;
  projectManagerId: string | null;
  projectManager: { id: string; name: string } | null;
  sowStartDate: string | null;
  sowEndDate: string | null;
  kickoffDate: string | null;
  migrationType: string | null;
  migrationTypes?: string[];
  productType: string | null;
  /** Derived from migration type (MigrationTypeOption) with fallback to stored productType. */
  effectiveProductType?: string | null;
  overagePaid?: boolean;
  description: string | null;
  internalNotes: string | null;
  migrationPhase: string | null;
  deltaScheduledDate: string | null;
  deltaReadyConfirmedAt: string | null;
  deltaCompletedAt: string | null;
  deltaNotes: string | null;
  _count: {
    batchRuns: number;
    comments: number;
    migrationItems: number;
    migrationIssues: number;
  };
}

interface Client {
  id: string;
  name: string;
  project: { id: string; name: string };
}

export default function ClientProjectPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { data: session, status } = useSession();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [migrationProject, setMigrationProject] = useState<MigrationProject | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showEditForm, setShowEditForm] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Tab counts — initialized from _count, updated live by each tab
  const [batchCount, setBatchCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [issueCount, setIssueCount] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const projectRes = await fetch(`/api/client-projects/${clientId}`);
        const text = await projectRes.text();
        const projectData = text ? JSON.parse(text) : {};
        if (!projectRes.ok) {
          throw new Error(
            typeof projectData.error === "string"
              ? projectData.error
              : typeof projectData.detail === "string"
                ? projectData.detail
                : `Failed to load project (HTTP ${projectRes.status})`
          );
        }
        if (!projectData.client || !projectData.migrationProject) {
          throw new Error(
            typeof projectData.error === "string" ? projectData.error : "Migration project could not be loaded."
          );
        }

        const usersRes = await fetch("/api/users");
        const usersText = await usersRes.text();
        if (!usersRes.ok) {
          throw new Error("Failed to load users.");
        }
        const usersData = usersText ? JSON.parse(usersText) : [];

        const mp = projectData.migrationProject;
        const cnt = mp._count ?? {};
        if (cancelled) return;

        setClient(projectData.client);
        setMigrationProject(mp);
        setBatchCount(cnt.batchRuns ?? 0);
        setItemCount(cnt.migrationItems ?? 0);
        setIssueCount(cnt.migrationIssues ?? 0);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (err: unknown) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load project");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clientId, status]);

  const handleProjectUpdate = useCallback((patch: Partial<MigrationProject>) => {
    setMigrationProject((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (!patch._count && prev._count) next._count = prev._count;
      return next;
    });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaved = useCallback((updated: any) => {
    setMigrationProject((prev) => {
      if (!updated) return prev;
      if (!prev) return updated;
      const merged = { ...prev, ...updated };
      if (!updated._count && prev._count) merged._count = prev._count;
      return merged;
    });
  }, []);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-semibold mb-2">Failed to load project</p>
          <p className="text-sm text-red-600 mb-4">{loadError}</p>
          <p className="text-xs text-gray-500">
            If this just started after a schema update, stop the dev server, run{" "}
            <code className="bg-gray-100 px-1 rounded">npx prisma generate</code>, then restart with{" "}
            <code className="bg-gray-100 px-1 rounded">npm run dev</code>.
          </p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!client || !migrationProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Client project not found.</p>
      </div>
    );
  }

  const currentUserRole = (session?.user as { role?: string })?.role ?? "ENGINEER";
  const currentUserId = (session?.user as { id?: string })?.id ?? "";

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "items", label: "Migration Items", count: itemCount },
    { id: "issues", label: "Issues", count: issueCount },
    { id: "batches", label: "Batch Tracker", count: batchCount },
    { id: "history", label: "Handover History" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <ProjectDetailHeader
        client={client}
        migrationProject={migrationProject}
        currentUserRole={currentUserRole}
        onEditClick={() => setShowEditForm(true)}
      />

      <ProjectDetailTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "overview" && (
          <OverviewTab
            clientId={clientId}
            migrationProject={migrationProject}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onProjectUpdate={handleProjectUpdate}
          />
        )}
        {activeTab === "items" && (
          <MigrationItemsTab
            clientId={clientId}
            role={currentUserRole}
            onCountChange={setItemCount}
          />
        )}
        {activeTab === "issues" && (
          <IssuesTab
            clientId={clientId}
            role={currentUserRole}
            onCountChange={setIssueCount}
          />
        )}
        {activeTab === "batches" && (
          <BatchTab
            clientId={clientId}
            effectiveProductType={
              migrationProject.effectiveProductType ?? migrationProject.productType
            }
            currentUserRole={currentUserRole}
            onCountChange={setBatchCount}
          />
        )}
        {activeTab === "history" && (
          <HandoverHistoryTab clientId={clientId} />
        )}
      </div>

      {showEditForm && (
        <ProjectEditForm
          clientId={clientId}
          migrationProject={migrationProject}
          users={users}
          currentUserRole={currentUserRole}
          onClose={() => setShowEditForm(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
