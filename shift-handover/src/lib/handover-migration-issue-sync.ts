import prisma from "@/lib/db";
import type { EntryStatus, IssueTicketStatus } from "@prisma/client";

function mapEntryStatusToIssueStatus(status: EntryStatus): IssueTicketStatus {
  switch (status) {
    case "COMPLETE":
      return "RESOLVED";
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "PENDING":
      return "OPEN";
    case "DELTA":
      return "IN_PROGRESS";
    default:
      return "OPEN";
  }
}

/**
 * Keeps one Issues-tab row per shift-handover client line in sync with the handover **Issues** column.
 * Description matches that cell verbatim; clearing Issues on the handover removes this row.
 */
export async function upsertMigrationIssueFromClientEntry(clientEntryId: string): Promise<void> {
  const entry = await prisma.clientEntry.findUnique({
    where: { id: clientEntryId },
    include: {
      shiftHandover: { select: { date: true } },
    },
  });
  if (!entry) return;

  let mp = await prisma.migrationProject.findUnique({ where: { clientId: entry.clientId } });
  if (!mp) {
    mp = await prisma.migrationProject.create({ data: { clientId: entry.clientId } });
  }

  const raw = entry.issues ?? "";
  if (!raw.trim()) {
    await prisma.migrationIssue.deleteMany({ where: { sourceClientEntryId: entry.id } });
    return;
  }

  const day = entry.shiftHandover.date;
  const ticketStatus = mapEntryStatusToIssueStatus(entry.status);
  const resolvedAt = entry.status === "COMPLETE" ? day : null;
  const resolution =
    entry.status === "COMPLETE" ? "Marked complete on shift handover track." : null;
  const daysToSolve =
    resolvedAt != null
      ? Math.ceil((resolvedAt.getTime() - day.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  const data = {
    migrationProjectId: mp.id,
    occurredAt: day,
    description: raw,
    ticketStatus,
    resolvedAt,
    resolution,
    daysToSolve,
  };

  const existing = await prisma.migrationIssue.findUnique({
    where: { sourceClientEntryId: entry.id },
    select: { id: true },
  });

  if (existing) {
    await prisma.migrationIssue.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.migrationIssue.create({
      data: {
        ...data,
        sourceClientEntryId: entry.id,
        l3TicketKey: null,
        cfitsTicketKey: null,
      },
    });
  }
}
