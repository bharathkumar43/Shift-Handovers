/**
 * Map CSV / Excel rows to batch tracker POST payloads using flexible header matching.
 */

import {
  compactTrackerDetails,
  getTrackerFieldsForProductType,
  type TrackerFieldDef,
} from "@/lib/batch-tracker-fieldsets";

export type BatchImportPayload = {
  batchName: string;
  batchNumber: number | null;
  totalItems: number;
  migratedItems: number;
  failedItems: number;
  skippedItems: number;
  totalSizeGb: number | null;
  migratedSizeGb: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  status: string;
  errorSummary: string | null;
  notes: string | null;
  batchPhase: string | null;
  trackerDetails: Record<string, string> | null;
};

export type ParsedImportResult = {
  rows: BatchImportPayload[];
  mode: "tabular" | "keyvalue";
  warnings: string[];
};

function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/[._:/\\-]+/g, " ")
    .replace(/\s+/g, " ");
}

/** Flatten sheet row to trimmed string values; keys preserved from headers. */
function stringifyRow(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v == null || v === "") continue;
    if (v instanceof Date) {
      out[k] = v.toISOString().split("T")[0];
      continue;
    }
    const s = String(v).trim();
    if (s !== "") out[k] = s;
  }
  return out;
}

const CORE_ALIASES: Record<keyof Omit<BatchImportPayload, "trackerDetails">, string[]> = {
  batchName: [
    "batch name",
    "batchname",
    "name",
    "migration batch",
    "batch",
    "sheet batch name",
    "batch name sheet column",
    "content sheet batch name",
  ],
  batchNumber: ["batch #", "batch number", "batch no", "batchno", "no", "#"],
  totalItems: [
    "total items",
    "total item",
    "items",
    "total pairs",
    "total mailboxes",
    "mailboxes in batch",
  ],
  migratedItems: [
    "migrated items",
    "migrated",
    "completed pairs",
    "completed items",
    "processed",
    "no of processed",
    "mailbox processed",
  ],
  failedItems: ["failed items", "failed", "failures"],
  skippedItems: ["skipped items", "skipped", "skip"],
  totalSizeGb: ["total size gb", "total size", "size gb", "total gb", "processed data size"],
  migratedSizeGb: ["migrated size gb", "migrated size", "size migrated"],
  plannedStartDate: ["planned start", "plan start", "planned start date"],
  plannedEndDate: ["planned end", "plan end", "planned end date"],
  actualStartDate: ["actual start", "start date", "actual start date"],
  actualEndDate: ["actual end", "end date", "actual end date"],
  status: ["status", "state", "batch status"],
  errorSummary: ["error summary", "errors", "error", "failure summary"],
  notes: ["notes", "comments", "remark", "remarks"],
  batchPhase: ["phase", "batch phase", "tracker row", "migration phase", "stage"],
};

function scoreKeyMatch(headerNorm: string, alias: string): number {
  const an = normalizeHeader(alias);
  if (!an || !headerNorm) return 0;
  if (headerNorm === an) return 100;
  if (headerNorm.includes(an) || an.includes(headerNorm)) return 80;
  return 0;
}

/** Best matching column value for a set of aliases (by header text). */
function pickCell(row: Record<string, string>, aliases: string[]): string {
  let best: { score: number; val: string } = { score: 0, val: "" };
  for (const [key, val] of Object.entries(row)) {
    const hn = normalizeHeader(key);
    if (!hn) continue;
    for (const al of aliases) {
      const sc = scoreKeyMatch(hn, al);
      if (sc > best.score && val) best = { score: sc, val };
    }
  }
  return best.val;
}

function parseIntSafe(s: string): number | null {
  if (!s) return null;
  const n = parseInt(String(s).replace(/[, ]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloatSafe(s: string): number | null {
  if (!s) return null;
  const n = parseFloat(String(s).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** yyyy-mm-dd or Excel-style date string */
function toIsoDatePrefix(s: string): string | null {
  if (!s) return null;
  const t = s.trim();
  const m = t.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return null;
}

function mapTrackerFields(
  row: Record<string, string>,
  productType: string
): Record<string, string> {
  const fields = getTrackerFieldsForProductType(productType);
  const out: Record<string, string> = {};
  for (const f of fields) {
    const aliases = trackerAliasesForField(f);
    const v = pickCell(row, aliases);
    if (v) out[f.id] = v;
  }
  return out;
}

function trackerAliasesForField(f: TrackerFieldDef): string[] {
  const base = [f.label, f.id];
  if (f.id === "sheetBatchName" || f.id === "contentSheetBatchName") base.push("batch name");
  return base;
}

function rowToPayload(
  row: Record<string, string>,
  productType: string,
  rowIndex: number
): BatchImportPayload {
  const batchNameRaw = pickCell(row, CORE_ALIASES.batchName);
  const batchName =
    batchNameRaw.trim() ||
    pickCell(row, ["servername", "server name", "customer name"]) ||
    `Imported batch ${rowIndex + 1}`;

  const bn = pickCell(row, CORE_ALIASES.batchNumber);
  const trackerDetailsRaw = mapTrackerFields(row, productType);
  const trackerDetails = compactTrackerDetails(trackerDetailsRaw);

  let totalItems = parseIntSafe(pickCell(row, CORE_ALIASES.totalItems)) ?? 0;
  let migratedItems = parseIntSafe(pickCell(row, CORE_ALIASES.migratedItems)) ?? 0;
  const failedItems = parseIntSafe(pickCell(row, CORE_ALIASES.failedItems)) ?? 0;
  const skippedItems = parseIntSafe(pickCell(row, CORE_ALIASES.skippedItems)) ?? 0;

  if (totalItems === 0 && productType === "CONTENT") {
    const tp = parseIntSafe(pickCell(row, ["total pairs"]));
    if (tp != null) totalItems = tp;
  }
  if (migratedItems === 0 && productType === "CONTENT") {
    const cp = parseIntSafe(pickCell(row, ["completed pairs"]));
    if (cp != null) migratedItems = cp;
  }

  const totalSizeGb = parseFloatSafe(pickCell(row, CORE_ALIASES.totalSizeGb));
  const migratedSizeGb = parseFloatSafe(pickCell(row, CORE_ALIASES.migratedSizeGb));

  const plannedStartDate = toIsoDatePrefix(pickCell(row, CORE_ALIASES.plannedStartDate));
  const plannedEndDate = toIsoDatePrefix(pickCell(row, CORE_ALIASES.plannedEndDate));
  const actualStartDate =
    toIsoDatePrefix(pickCell(row, CORE_ALIASES.actualStartDate)) ||
    toIsoDatePrefix(pickCell(row, ["start date"])) ||
    null;
  const actualEndDate =
    toIsoDatePrefix(pickCell(row, CORE_ALIASES.actualEndDate)) ||
    toIsoDatePrefix(pickCell(row, ["end date"])) ||
    null;

  const statusRaw = pickCell(row, CORE_ALIASES.status);
  const status = statusRaw ? statusRaw : "PENDING";

  return {
    batchName,
    batchNumber: bn ? parseIntSafe(bn) : null,
    totalItems,
    migratedItems,
    failedItems,
    skippedItems,
    totalSizeGb,
    migratedSizeGb,
    plannedStartDate,
    plannedEndDate,
    actualStartDate,
    actualEndDate,
    status,
    errorSummary: pickCell(row, CORE_ALIASES.errorSummary) || null,
    notes: pickCell(row, CORE_ALIASES.notes) || null,
    batchPhase: pickCell(row, CORE_ALIASES.batchPhase) || null,
    trackerDetails,
  };
}

/** Two-column A/B label → value sheet (common tracker layout). */
function parseKeyValueSheet(
  XLSX: typeof import("xlsx"),
  ws: import("xlsx").WorkSheet
): Record<string, string> | null {
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
  if (!aoa.length) return null;
  let start = 0;
  const h0 = String(aoa[0]?.[0] ?? "").toLowerCase();
  const h1 = String(aoa[0]?.[1] ?? "").toLowerCase();
  if (h0 === "label" && (h1 === "value" || h1 === "values")) start = 1;

  const merged: Record<string, string> = {};
  for (let i = start; i < aoa.length; i++) {
    const row = aoa[i];
    if (!Array.isArray(row)) continue;
    const k = String(row[0] ?? "").trim();
    const v = row[1];
    if (!k) continue;
    if (v == null || v === "") continue;
    merged[k] = v instanceof Date ? v.toISOString().split("T")[0] : String(v).trim();
  }
  return Object.keys(merged).length ? merged : null;
}

/**
 * Read first worksheet from CSV or Excel; returns one payload per data row, or one payload for a 2-column label sheet.
 */
export async function parseBatchImportFile(
  file: File,
  productType: string
): Promise<ParsedImportResult> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { rows: [], mode: "tabular", warnings: ["File has no worksheets."] };
  }
  const ws = wb.Sheets[sheetName];

  const warnings: string[] = [];
  const asObjects = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false,
  });
  const stringRows = asObjects.map((r) => stringifyRow(r)).filter((r) => Object.keys(r).length > 0);

  let mode: "tabular" | "keyvalue" = "tabular";
  let rowsToMap: Record<string, string>[] = stringRows;

  const tabularHasNames = stringRows.some((r) => pickCell(r, CORE_ALIASES.batchName).trim() !== "");
  const tabularHasTracker = stringRows.some(
    (r) => Object.keys(mapTrackerFields(r, productType)).length > 0
  );

  if (!tabularHasNames && !tabularHasTracker && stringRows.length > 0) {
    const kv = parseKeyValueSheet(XLSX, ws);
    if (kv && Object.keys(kv).length > 0) {
      rowsToMap = [kv];
      mode = "keyvalue";
      if (!warnings.includes("Used label/value columns (two-column layout)."))
        warnings.push("Used label/value columns (two-column layout).");
    }
  }

  if (rowsToMap.length === 0) {
    warnings.push("No data rows found. Use a header row + one row per batch, or two columns: label | value.");
  }

  const rows = rowsToMap.map((r, i) => rowToPayload(r, productType, i));
  return { rows, mode, warnings };
}
