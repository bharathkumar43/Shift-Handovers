import prisma from "@/lib/db";

/**
 * Upsert or remove the Tickets-tab row for this handover client line (same text as the handover Tickets column).
 */
export async function upsertMigrationTicketFromClientEntry(clientEntryId: string): Promise<void> {
  const entry = await prisma.clientEntry.findUnique({
    where: { id: clientEntryId },
    select: { id: true, clientId: true, tickets: true },
  });
  if (!entry) return;

  let mp = await prisma.migrationProject.findUnique({ where: { clientId: entry.clientId } });
  if (!mp) {
    mp = await prisma.migrationProject.create({ data: { clientId: entry.clientId } });
  }

  const raw = entry.tickets ?? "";
  if (!raw.trim()) {
    await prisma.migrationProjectTicket.deleteMany({ where: { sourceClientEntryId: entry.id } });
    return;
  }

  await prisma.migrationProjectTicket.upsert({
    where: { sourceClientEntryId: entry.id },
    create: {
      migrationProjectId: mp.id,
      sourceClientEntryId: entry.id,
      content: raw,
    },
    update: {
      migrationProjectId: mp.id,
      content: raw,
    },
  });
}
