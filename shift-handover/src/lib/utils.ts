import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function toDateString(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

export function getShiftLabel(shiftNumber: number): string {
  switch (shiftNumber) {
    case 1:
      return "Shift 1 (Morning)";
    case 2:
      return "Shift 2 (Afternoon)";
    case 3:
      return "Shift 3 (Night)";
    default:
      return `Shift ${shiftNumber}`;
  }
}

/** User appears on a shift only if that shift is checked for them in Manage Users (empty = not eligible). */
export function userWorksShift(assignedShifts: number[], shiftNumber: number): boolean {
  if (!assignedShifts?.length) return false;
  return assignedShifts.includes(shiftNumber);
}

/** At least one shift selected — required to appear in non–shift-scoped user dropdowns (e.g. project manager). */
export function userHasShiftAssignments(assignedShifts: number[] | null | undefined): boolean {
  return (assignedShifts?.length ?? 0) > 0;
}

/** Compact row-tint labels (first letter per color). */
export const ROW_TINT_OPTIONS = [
  { value: "", label: "—" },
  { value: "RED", label: "R" },
  { value: "AMBER", label: "A" },
  { value: "SILVER", label: "S" },
  { value: "GREEN", label: "G" },
] as const;

/** Bold closed-state styling for the compact row-tint `<select>`. */
export function getRowTintSelectClass(tint: string | null | undefined): string {
  switch (tint) {
    case "RED":
      return "bg-red-600 text-white border-red-800 font-semibold";
    case "AMBER":
      return "bg-amber-500 text-gray-900 border-amber-700 font-semibold";
    case "SILVER":
      return "bg-slate-500 text-white border-slate-700 font-semibold";
    case "GREEN":
      return "bg-green-600 text-white border-green-800 font-semibold";
    default:
      return "bg-white text-gray-500 border-gray-300";
  }
}

/** Full-row background — bold, saturated tints. */
export function getRowTintBackgroundClass(tint: string | null | undefined): string {
  switch (tint) {
    case "RED":
      return "bg-red-200";
    case "AMBER":
      return "bg-amber-200";
    case "SILVER":
      return "bg-slate-300";
    case "GREEN":
      return "bg-green-300";
    default:
      return "";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "COMPLETE":
      return "bg-green-100 text-green-800 border-green-200";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "PENDING":
      return "bg-red-100 text-red-800 border-red-200";
    case "DELTA":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "COMPLETE":
      return "Complete";
    case "IN_PROGRESS":
      return "In Progress";
    case "PENDING":
      return "Pending";
    case "DELTA":
      return "Delta";
    case "NA":
      return "N/A";
    default:
      return status;
  }
}
