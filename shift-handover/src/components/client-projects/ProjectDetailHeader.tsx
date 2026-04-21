"use client";

import { useState, useEffect } from "react";
import { Calendar, User, Edit3, ArrowLeft, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not Started", color: "bg-gray-100 text-gray-700" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { value: "ON_HOLD", label: "On Hold", color: "bg-amber-100 text-amber-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-green-100 text-green-700" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-700" },
];

// Fallback map for legacy data stored as enum values
const LEGACY_MIGRATION_TYPE_LABELS: Record<string, string> = {
  GMAIL_TO_GOOGLE_WORKSPACE: "Gmail → Google Workspace",
  EXCHANGE_TO_MICROSOFT_365: "Exchange → Microsoft 365",
  MICROSOFT_365_TO_MICROSOFT_365: "M365 → M365",
  BOX_TO_SHAREPOINT: "Box → SharePoint",
  DROPBOX_TO_SHAREPOINT: "Dropbox → SharePoint",
  GOOGLE_DRIVE_TO_SHAREPOINT: "Google Drive → SharePoint",
  SLACK_TO_TEAMS: "Slack → Teams",
  OTHER: "Other",
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  CONTENT: "Content",
  MESSAGE: "Message",
  EMAIL: "Email",
};

const PHASE_BADGE: Record<string, { label: string; color: string }> = {
  PILOT:     { label: "Pilot",    color: "bg-purple-100 text-purple-700 border border-purple-200" },
  ONE_TIME:  { label: "One-Time", color: "bg-blue-100 text-blue-700 border border-blue-200" },
  DELTA:     { label: "Delta",    color: "bg-orange-100 text-orange-700 border border-orange-200" },
  COMPLETED: { label: "Complete", color: "bg-green-100 text-green-700 border border-green-200" },
};

interface MigrationProject {
  id: string;
  status: string;
  projectManagerId: string | null;
  projectManager: { id: string; name: string } | null;
  sowStartDate: string | null;
  sowEndDate: string | null;
  kickoffDate: string | null;
  migrationType: string | null;
  migrationTypes?: string[];
  productType: string | null;
  migrationPhase: string | null;
  deltaScheduledDate: string | null;
  deltaCompletedAt: string | null;
  overagePaid?: boolean;
}

interface Client {
  id: string;
  name: string;
  project: { id: string; name: string };
}

interface Props {
  client: Client;
  migrationProject: MigrationProject;
  currentUserRole: string;
  onUpdate?: (patch: Partial<MigrationProject>) => void;
  onEditClick: () => void;
}

export default function ProjectDetailHeader({ client, migrationProject, currentUserRole, onEditClick }: Props) {
  const [status, setStatus] = useState(migrationProject.status);
  const [saving, setSaving] = useState(false);
  const [migrationTypeLabels, setMigrationTypeLabels] = useState<Record<string, string>>(LEGACY_MIGRATION_TYPE_LABELS);

  useEffect(() => {
    fetch("/api/migration-types")
      .then(async (r) => {
        if (!r.ok) return;
        const types: { value: string; label: string }[] = await r.json();
        const map: Record<string, string> = { ...LEGACY_MIGRATION_TYPE_LABELS };
        if (Array.isArray(types)) types.forEach((t) => { map[t.value] = t.label; });
        setMigrationTypeLabels(map);
      })
      .catch(() => {});
  }, []);

  const canEdit = currentUserRole === "ADMIN" || currentUserRole === "LEAD";
  const statusOption = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];

  async function handleStatusChange(newStatus: string) {
    if (!canEdit) return;
    setStatus(newStatus);
    setSaving(true);
    try {
      await fetch(`/api/client-projects/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } finally {
      setSaving(false);
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return null;
    try { return format(new Date(d), "MMM d, yyyy"); } catch { return null; }
  };

  // SLA indicator
  const slaIndicator = (() => {
    if (!migrationProject.sowEndDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(migrationProject.sowEndDate);
    end.setHours(0, 0, 0, 0);
    const days = differenceInDays(end, today);
    if (days < 0) {
      return { label: `SOW overdue by ${Math.abs(days)}d`, color: "bg-red-100 text-red-700 border border-red-200", icon: AlertTriangle };
    }
    if (days <= 30) {
      return { label: `SOW ends in ${days}d`, color: "bg-amber-100 text-amber-700 border border-amber-200", icon: Clock };
    }
    return null;
  })();

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-5">
      <div className="max-w-7xl mx-auto">
        <Link href="/client-projects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          All Migration Projects
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{client.name}</h1>
              {canEdit ? (
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={saving}
                  className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer",
                    statusOption.color
                  )}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              ) : (
                <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", statusOption.color)}>
                  {statusOption.label}
                </span>
              )}
              {slaIndicator && (() => {
                const Icon = slaIndicator.icon;
                return (
                  <span className={cn("flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full", slaIndicator.color)}>
                    <Icon className="w-3.5 h-3.5" />
                    {slaIndicator.label}
                  </span>
                );
              })()}
              {migrationProject.migrationPhase && PHASE_BADGE[migrationProject.migrationPhase] && (() => {
                const badge = PHASE_BADGE[migrationProject.migrationPhase!];
                const isDeltaSoon = migrationProject.migrationPhase === "DELTA"
                  && migrationProject.deltaScheduledDate
                  && !migrationProject.deltaCompletedAt
                  && differenceInDays(new Date(migrationProject.deltaScheduledDate), new Date()) <= 7
                  && differenceInDays(new Date(migrationProject.deltaScheduledDate), new Date()) >= 0;
                return (
                  <span className={cn(
                    "flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
                    badge.color,
                    isDeltaSoon && "ring-2 ring-orange-400 ring-offset-1 animate-pulse"
                  )}>
                    Phase: {badge.label}
                  </span>
                );
              })()}
            </div>

            <p className="text-sm text-gray-500 mt-1">
              {client.project.name} project
              {(() => {
                const vals =
                  migrationProject.migrationTypes && migrationProject.migrationTypes.length > 0
                    ? migrationProject.migrationTypes
                    : migrationProject.migrationType
                      ? [migrationProject.migrationType]
                      : [];
                if (vals.length > 0) {
                  return (
                    <span className="ml-2 text-gray-600">
                      ·{" "}
                      {vals
                        .map((v) => migrationTypeLabels[v] ?? v)
                        .join(" · ")}
                    </span>
                  );
                }
                if (migrationProject.productType) {
                  return (
                    <span className="ml-2 text-indigo-600">
                      · {PRODUCT_TYPE_LABELS[migrationProject.productType]}
                    </span>
                  );
                }
                return null;
              })()}
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-gray-600">
              {migrationProject.projectManager && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">PM:</span> {migrationProject.projectManager.name}
                </span>
              )}
              {(migrationProject.sowStartDate || migrationProject.sowEndDate) && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">SOW:</span>
                  {formatDate(migrationProject.sowStartDate) ?? "—"}
                  {" → "}
                  {formatDate(migrationProject.sowEndDate) ?? "—"}
                </span>
              )}
              {migrationProject.sowEndDate &&
                migrationProject.status !== "COMPLETED" &&
                (() => {
                  const end = new Date(migrationProject.sowEndDate!);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  end.setHours(0, 0, 0, 0);
                  if (end >= today) return null;
                  return (
                    <span className="flex items-center gap-1.5 text-amber-900">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-100 border border-amber-200">
                        Overage paid: {migrationProject.overagePaid ? "Yes" : "No"}
                      </span>
                    </span>
                  );
                })()}
              {migrationProject.kickoffDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">Kickoff:</span> {formatDate(migrationProject.kickoffDate)}
                </span>
              )}
              {migrationProject.deltaScheduledDate && migrationProject.migrationPhase === "DELTA" && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-orange-400" />
                  <span className="font-medium text-orange-700">Delta:</span>
                  {formatDate(migrationProject.deltaScheduledDate)}
                  {!migrationProject.deltaCompletedAt && (
                    <span className="text-gray-400 text-xs">
                      ({differenceInDays(new Date(migrationProject.deltaScheduledDate), new Date())}d)
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {canEdit && (
            <button
              onClick={onEditClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
            >
              <Edit3 className="w-4 h-4" />
              Edit Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
