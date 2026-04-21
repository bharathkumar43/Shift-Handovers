/**
 * Batch Tracker dropdown options aligned with product-type Excel templates
 * (Content_batch_tracker, Email_batch_tracker, messaging_batch_tracker).
 */

export type BatchPhaseChoice = { value: string; label: string };

/** Content tracker — Migration Tracker row labels (Content_batch_tracker.xlsx). */
const CONTENT_PHASES: BatchPhaseChoice[] = [
  { value: "ServerName", label: "ServerName" },
  { value: "Batch Name", label: "Batch Name" },
  { value: "Start Date", label: "Start Date" },
  { value: "End Date", label: "End Date" },
  { value: "Migration Type", label: "Migration Type" },
  { value: "Customer Name", label: "Customer Name" },
  { value: "Date", label: "Date" },
  { value: "Total Pairs", label: "Total Pairs" },
  { value: "Initiated Pairs", label: "Initiated Pairs" },
  { value: "Completed Pairs", label: "Completed Pairs" },
  { value: "Inprogress Pairs", label: "Inprogress Pairs" },
  { value: "Yet to Initiate", label: "Yet to Initiate" },
  { value: "Processed Folders Count", label: "Processed Folders Count" },
  { value: "Inprogress Folders Count", label: "Inprogress Folders Count" },
  { value: "Processed Files Count", label: "Processed Files Count" },
  { value: "Inprogress Files Count", label: "Inprogress Files Count" },
  { value: "Processed Data Size", label: "Processed Data Size" },
  { value: "Inprogress Data Size", label: "Inprogress Data Size" },
  { value: "Processed Versions Count", label: "Processed Versions Count" },
  { value: "Inprogress Versions Count", label: "Inprogress Versions Count" },
  { value: "Processed Permissions Count", label: "Processed Permissions Count" },
  { value: "Inprogress Permissions Count", label: "Inprogress Permissions Count" },
  { value: "Processed Hyperlinks Count", label: "Processed Hyperlinks Count" },
  { value: "Inprogress Hyperlinks Count", label: "Inprogress Hyperlinks Count" },
  { value: "No. of Conflicts", label: "No. of Conflicts" },
  { value: "No. of Remediations", label: "No. of Remediations" },
  { value: "No. of Resolved", label: "No. of Resolved" },
  { value: "No. of Non-Retriable", label: "No. of Non-Retriable" },
];

/** Email tracker — row labels (Email_batch_tracker.xlsx, column A). */
const EMAIL_PHASES: BatchPhaseChoice[] = [
  { value: "Total No. of Mailboxes in the batch", label: "Total No. of Mailboxes in the batch" },
  { value: "Total Emails Picked", label: "Total Emails Picked" },
  { value: "No. of Processed", label: "No. of Processed" },
  { value: "No. of  Conflicts", label: "No. of  Conflicts" },
  { value: "No of attachments", label: "No of attachments" },
  { value: "No. of Remediations", label: "No. of Remediations" },
  { value: "No. of Resolved", label: "No. of Resolved" },
  { value: "No. of Non-Retriable", label: "No. of Non-Retriable" },
  { value: "No. of Mailbox Yet to Initiate", label: "No. of Mailbox Yet to Initiate" },
  { value: "No. of Mailbox Processed", label: "No. of Mailbox Processed" },
  { value: "No. of Mailbox Inprogress", label: "No. of Mailbox Inprogress" },
  { value: "No. of Mailbox Conflict", label: "No. of Mailbox Conflict" },
  { value: "No. of Mailbox  with Folder conflict", label: "No. of Mailbox  with Folder conflict" },
  { value: "No. of Mailbox  Paused", label: "No. of Mailbox  Paused" },
];

/** Legacy migration-stage values (before tracker-specific options). Kept for existing rows. */
const LEGACY_PHASES: BatchPhaseChoice[] = [
  { value: "PILOT", label: "Pilot (legacy)" },
  { value: "ONE_TIME", label: "One-Time (legacy)" },
  { value: "DELTA", label: "Delta (legacy)" },
  { value: "COMPLETED", label: "Completed (legacy)" },
];

/** Messaging tracker — row labels (messaging_batch_tracker.xlsx, column A). CH/DM sections repeat some labels; values stay unique. */
const MESSAGE_PHASES: BatchPhaseChoice[] = [
  { value: "Number of CH", label: "Number of CH" },
  { value: "Yet to initiate CH", label: "Yet to initiate CH" },
  { value: "Inprogress CH", label: "Inprogress CH" },
  { value: "No. of initiated CH", label: "No. of initiated CH" },
  { value: "CH · No. of Processed", label: "No. of Processed (CH)" },
  { value: "CH · No. of  Conflicts", label: "No. of  Conflicts (CH)" },
  { value: "CH · No. of Remediations", label: "No. of Remediations (CH)" },
  { value: "CH · No. of Resolved", label: "No. of Resolved (CH)" },
  { value: "CH · No. of Non-Retriable", label: "No. of Non-Retriable (CH)" },
  { value: "Number of DM", label: "Number of DM" },
  { value: "Yet to initiate DM", label: "Yet to initiate DM" },
  { value: "Inprogress DM", label: "Inprogress DM" },
  { value: "No. of initiated DM", label: "No. of initiated DM" },
  { value: "DM · No. of Processed", label: "No. of Processed (DM)" },
  { value: "DM · No. of Remediations", label: "No. of Remediations (DM)" },
  { value: "DM · No. of Resolved", label: "No. of Resolved (DM)" },
  { value: "DM · No. of Non-Retriable", label: "No. of Non-Retriable (DM)" },
];

const LEGACY_LABELS: Record<string, string> = {
  PILOT: "Pilot",
  ONE_TIME: "One-Time",
  DELTA: "Delta",
  COMPLETED: "Completed",
};

export function getBatchPhaseChoices(productType: string | null | undefined): BatchPhaseChoice[] {
  switch (productType) {
    case "CONTENT":
      return [...CONTENT_PHASES];
    case "EMAIL":
      return [...LEGACY_PHASES, ...EMAIL_PHASES];
    case "MESSAGE":
      return [...LEGACY_PHASES, ...MESSAGE_PHASES];
    default:
      return [...LEGACY_PHASES];
  }
}

/** Display label for a stored phase value (legacy enums or full tracker strings). */
export function getBatchPhaseLabel(phase: string | null | undefined): string {
  if (!phase) return "";
  return LEGACY_LABELS[phase] ?? phase;
}

/** Label for UI: prefers tracker option label, then legacy short name, then raw value. */
export function resolveBatchPhaseLabel(
  phase: string | null | undefined,
  productType: string | null | undefined
): string {
  if (!phase) return "";
  const hit = getBatchPhaseChoices(productType).find((c) => c.value === phase);
  if (hit) return hit.label;
  return getBatchPhaseLabel(phase);
}

const TINTS = [
  "bg-purple-100 text-purple-800",
  "bg-blue-100 text-blue-800",
  "bg-cyan-100 text-cyan-800",
  "bg-teal-100 text-teal-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-orange-100 text-orange-800",
  "bg-rose-100 text-rose-800",
  "bg-indigo-100 text-indigo-800",
  "bg-fuchsia-100 text-fuchsia-800",
];

export function getBatchPhaseBadgeClass(phase: string | null | undefined): string {
  if (!phase) return "bg-gray-100 text-gray-600";
  let h = 0;
  for (let i = 0; i < phase.length; i++) h = (h * 31 + phase.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}
