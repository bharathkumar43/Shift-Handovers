/**
 * Excel-aligned input fields per product line for Batch Tracker (`trackerDetails` JSON on BatchRun).
 */

export type TrackerFieldKind = "text" | "date" | "number";

export type TrackerFieldDef = {
  id: string;
  label: string;
  kind?: TrackerFieldKind;
};

/** messaging_batch_tracker.xlsx — column A style rows (TraceLink … CH/DM metrics). */
const MESSAGE_FIELDS: TrackerFieldDef[] = [
  { id: "traceLink", label: "TraceLink" },
  { id: "startDate", label: "Start Date", kind: "date" },
  { id: "endDate", label: "End Date", kind: "date" },
  { id: "serverName", label: "ServerName" },
  { id: "sheetDate", label: "Date", kind: "date" },
  { id: "sheetBatchName", label: "Batch Name (sheet column)" },
  { id: "numberOfCh", label: "Number of CH", kind: "number" },
  { id: "yetToInitiateCh", label: "Yet to initiate CH", kind: "number" },
  { id: "inprogressCh", label: "Inprogress CH", kind: "number" },
  { id: "noOfInitiatedCh", label: "No. of initiated CH", kind: "number" },
  { id: "chNoOfProcessed", label: "No. of Processed (CH)", kind: "number" },
  { id: "chNoOfConflicts", label: "No. of  Conflicts (CH)", kind: "number" },
  { id: "chNoOfRemediations", label: "No. of Remediations (CH)", kind: "number" },
  { id: "chNoOfResolved", label: "No. of Resolved (CH)", kind: "number" },
  { id: "chNoOfNonRetriable", label: "No. of Non-Retriable (CH)", kind: "number" },
  { id: "numberOfDm", label: "Number of DM", kind: "number" },
  { id: "yetToInitiateDm", label: "Yet to initiate DM", kind: "number" },
  { id: "inprogressDm", label: "Inprogress DM", kind: "number" },
  { id: "noOfInitiatedDm", label: "No. of initiated DM", kind: "number" },
  { id: "dmNoOfProcessed", label: "No. of Processed (DM)", kind: "number" },
  { id: "dmNoOfRemediations", label: "No. of Remediations (DM)", kind: "number" },
  { id: "dmNoOfResolved", label: "No. of Resolved (DM)", kind: "number" },
  { id: "dmNoOfNonRetriable", label: "No. of Non-Retriable (DM)", kind: "number" },
];

/** Email_batch_tracker.xlsx — row labels column A. */
const EMAIL_FIELDS: TrackerFieldDef[] = [
  { id: "emailTotalMailboxes", label: "Total No. of Mailboxes in the batch", kind: "number" },
  { id: "emailTotalEmailsPicked", label: "Total Emails Picked", kind: "number" },
  { id: "emailNoProcessed", label: "No. of Processed", kind: "number" },
  { id: "emailNoConflicts", label: "No. of  Conflicts", kind: "number" },
  { id: "emailNoAttachments", label: "No of attachments", kind: "number" },
  { id: "emailNoRemediations", label: "No. of Remediations", kind: "number" },
  { id: "emailNoResolved", label: "No. of Resolved", kind: "number" },
  { id: "emailNoNonRetriable", label: "No. of Non-Retriable", kind: "number" },
  { id: "emailMailboxYetToInitiate", label: "No. of Mailbox Yet to Initiate", kind: "number" },
  { id: "emailMailboxProcessed", label: "No. of Mailbox Processed", kind: "number" },
  { id: "emailMailboxInprogress", label: "No. of Mailbox Inprogress", kind: "number" },
  { id: "emailMailboxConflict", label: "No. of Mailbox Conflict", kind: "number" },
  { id: "emailMailboxFolderConflict", label: "No. of Mailbox  with Folder conflict", kind: "number" },
  { id: "emailMailboxPaused", label: "No. of Mailbox  Paused", kind: "number" },
];

/**
 * Content_batch_tracker.xlsx — Migration Tracker rows (ServerName, pairs, folders/files, conflicts, etc.).
 * Data-size rows accept text (e.g. 1.8TB) like the sheet.
 */
const CONTENT_FIELDS: TrackerFieldDef[] = [
  { id: "contentServerName", label: "ServerName" },
  { id: "contentSheetBatchName", label: "Batch Name" },
  { id: "contentStartDate", label: "Start Date", kind: "date" },
  { id: "contentEndDate", label: "End Date", kind: "date" },
  { id: "contentMigrationType", label: "Migration Type" },
  { id: "contentCustomerName", label: "Customer Name" },
  { id: "contentSheetDate", label: "Date", kind: "date" },
  { id: "contentTotalPairs", label: "Total Pairs", kind: "number" },
  { id: "contentInitiatedPairs", label: "Initiated Pairs", kind: "number" },
  { id: "contentCompletedPairs", label: "Completed Pairs", kind: "number" },
  { id: "contentInprogressPairs", label: "Inprogress Pairs", kind: "number" },
  { id: "contentYetToInitiate", label: "Yet to Initiate", kind: "number" },
  { id: "contentProcessedFoldersCount", label: "Processed Folders Count", kind: "number" },
  { id: "contentInprogressFoldersCount", label: "Inprogress Folders Count", kind: "number" },
  { id: "contentProcessedFilesCount", label: "Processed Files Count", kind: "number" },
  { id: "contentInprogressFilesCount", label: "Inprogress Files Count", kind: "number" },
  { id: "contentProcessedDataSize", label: "Processed Data Size" },
  { id: "contentInprogressDataSize", label: "Inprogress Data Size" },
  { id: "contentProcessedVersionsCount", label: "Processed Versions Count", kind: "number" },
  { id: "contentInprogressVersionsCount", label: "Inprogress Versions Count", kind: "number" },
  { id: "contentProcessedPermissionsCount", label: "Processed Permissions Count", kind: "number" },
  { id: "contentInprogressPermissionsCount", label: "Inprogress Permissions Count", kind: "number" },
  { id: "contentProcessedHyperlinksCount", label: "Processed Hyperlinks Count", kind: "number" },
  { id: "contentInprogressHyperlinksCount", label: "Inprogress Hyperlinks Count", kind: "number" },
  { id: "contentNoOfConflicts", label: "No. of Conflicts", kind: "number" },
  { id: "contentNoOfRemediations", label: "No. of Remediations", kind: "number" },
  { id: "contentNoOfResolved", label: "No. of Resolved", kind: "number" },
  { id: "contentNoOfNonRetriable", label: "No. of Non-Retriable", kind: "number" },
];

export function getTrackerFieldsForProductType(productType: string | null | undefined): TrackerFieldDef[] {
  switch (productType) {
    case "MESSAGE":
      return MESSAGE_FIELDS;
    case "EMAIL":
      return EMAIL_FIELDS;
    case "CONTENT":
      return CONTENT_FIELDS;
    default:
      return [];
  }
}

export function emptyTrackerState(fields: TrackerFieldDef[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const f of fields) o[f.id] = "";
  return o;
}

/** Merge DB JSON with current field ids (new fields get empty string). */
export function mergeTrackerDetails(
  stored: unknown,
  productType: string | null | undefined
): Record<string, string> {
  const fields = getTrackerFieldsForProductType(productType);
  const base = emptyTrackerState(fields);
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return base;
  const raw = stored as Record<string, unknown>;
  for (const f of fields) {
    const v = raw[f.id];
    if (v != null && v !== "") base[f.id] = String(v);
  }
  return base;
}

/** Persist only non-empty trimmed values, or null if none. */
export function compactTrackerDetails(d: Record<string, string>): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(d)) {
    const t = v != null ? String(v).trim() : "";
    if (t !== "") out[k] = t;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** API: accept JSON body `trackerDetails` — only stringifiable keys with non-empty trimmed values. */
export function sanitizeTrackerDetailsFromBody(raw: unknown): Record<string, string> | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s !== "") out[k] = s;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function labelForTrackerId(
  id: string,
  productType: string | null | undefined
): string {
  const hit = getTrackerFieldsForProductType(productType).find((f) => f.id === id);
  return hit?.label ?? id;
}
