"use client";

import { useState, useCallback } from "react";
import { FileText, Lock } from "lucide-react";
import ProjectCommentFeed from "../ProjectCommentFeed";
import DeltaPhasePanel from "../DeltaPhasePanel";

interface MigrationProject {
  id: string;
  description: string | null;
  internalNotes: string | null;
  migrationPhase: string | null;
  deltaScheduledDate: string | null;
  deltaReadyConfirmedAt: string | null;
  deltaCompletedAt: string | null;
  deltaNotes: string | null;
}

interface Props {
  clientId: string;
  migrationProject: MigrationProject;
  currentUserId: string;
  currentUserRole: string;
  onProjectUpdate: (patch: Partial<MigrationProject>) => void;
}

export default function OverviewTab({
  clientId, migrationProject, currentUserId, currentUserRole, onProjectUpdate,
}: Props) {
  const canEdit = currentUserRole === "ADMIN" || currentUserRole === "LEAD";
  const isAdmin = currentUserRole === "ADMIN";

  const [description, setDescription] = useState(migrationProject.description ?? "");
  const [internalNotes, setInternalNotes] = useState(migrationProject.internalNotes ?? "");
  const [savingDesc, setSavingDesc] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const saveField = useCallback(async (field: string, value: string) => {
    const setSaving = field === "description" ? setSavingDesc : setSavingNotes;
    setSaving(true);
    try {
      await fetch(`/api/client-projects/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value || null }),
      });
      onProjectUpdate({ [field]: value || null });
    } finally {
      setSaving(false);
    }
  }, [clientId, onProjectUpdate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Description</h3>
            {savingDesc && <span className="ml-auto text-xs text-gray-400 animate-pulse">Saving…</span>}
          </div>
          <div className="p-5">
            {canEdit ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => saveField("description", description)}
                rows={8}
                placeholder="Add a description for this migration project — scope, key contacts, special requirements, known risks…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y text-gray-900"
              />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {description || <span className="text-gray-400 italic">No description provided.</span>}
              </p>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm">
            <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-gray-900">Internal Notes</h3>
              <span className="ml-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Admin only</span>
              {savingNotes && <span className="ml-auto text-xs text-gray-400 animate-pulse">Saving…</span>}
            </div>
            <div className="p-5">
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                onBlur={() => saveField("internalNotes", internalNotes)}
                rows={4}
                placeholder="Internal notes visible only to admins…"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 resize-y text-gray-900"
              />
            </div>
          </div>
        )}

        <ProjectCommentFeed
          clientId={clientId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      </div>

      <div className="space-y-6 min-w-0">
        <DeltaPhasePanel
          clientId={clientId}
          migrationProject={migrationProject}
          currentUserRole={currentUserRole}
          onUpdate={(patch) => onProjectUpdate(patch as Partial<MigrationProject>)}
        />
      </div>
    </div>
  );
}
