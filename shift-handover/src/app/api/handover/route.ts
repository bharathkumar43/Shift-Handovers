import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { dateParamToDbDate } from "@/lib/db-date";

/** Prevent CDN/proxy/browser from serving stale handover JSON to different users */
export const dynamic = "force-dynamic";

const HANDOVER_NO_CACHE = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const satisfies Record<string, string>;

function json(data: unknown, init?: ResponseInit) {
  const merged = {
    ...HANDOVER_NO_CACHE,
    ...(init?.headers as Record<string, string> | undefined),
  };
  return NextResponse.json(data, {
    ...init,
    headers: merged,
  });
}

function parseRowTint(v: unknown): "RED" | "AMBER" | "SILVER" | "GREEN" | null {
  if (v === null || v === undefined || v === "") return null;
  if (v === "RED" || v === "AMBER" || v === "SILVER" || v === "GREEN") return v;
  return null;
}

function parseExpectedDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const projectId = searchParams.get("projectId");
  const shiftNumber = searchParams.get("shiftNumber");

  if (!date || !projectId || !shiftNumber) {
    return json({ error: "Missing parameters" }, { status: 400 });
  }

  const shiftNum = parseInt(String(shiftNumber), 10);
  if (Number.isNaN(shiftNum)) {
    return json({ error: "Invalid shift number" }, { status: 400 });
  }

  const handover = await prisma.shiftHandover.findUnique({
    where: {
      date_projectId_shiftNumber: {
        date: dateParamToDbDate(date),
        projectId,
        shiftNumber: shiftNum,
      },
    },
    include: {
      entries: {
        include: {
          client: true,
          engineer: { select: { id: true, name: true } },
          engineerWorkedBy: { select: { id: true, name: true } },
          filledBy: { select: { id: true, name: true } },
        },
      },
      lead: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      engineerAcknowledger: { select: { id: true, name: true } },
      managerAcknowledger: { select: { id: true, name: true } },
    },
  });

  return json(handover);
}

function entryHasData(entry: {
  tickets?: string | null;
  status?: string | null;
  engineerWorked?: string | null;
  engineerWorkedUserId?: string | null;
  issues?: string | null;
  updates?: string | null;
  handoverNotes?: string | null;
  managerNotes?: string | null;
}): boolean {
  return !!(
    (entry.status && entry.status !== "NA") ||
    entry.tickets ||
    entry.engineerWorked ||
    entry.engineerWorkedUserId ||
    entry.issues ||
    entry.updates ||
    entry.handoverNotes ||
    entry.managerNotes
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, projectId, shiftNumber, leadNotes, entries, submit, handoverExpectedUpdatedAt } = body;

  if (!date || !projectId || shiftNumber === undefined || shiftNumber === null) {
    return json({ error: "Missing date, projectId, or shiftNumber" }, { status: 400 });
  }

  const shiftNum = parseInt(String(shiftNumber), 10);
  if (Number.isNaN(shiftNum)) {
    return json({ error: "Invalid shift number" }, { status: 400 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isLeadOrAdmin = session.user.role === "ADMIN" || session.user.role === "LEAD";

  if (submit && session.user.role === "ENGINEER") {
    return json(
      { error: "Only Shift Leads and Admins can submit handovers" },
      { status: 403 }
    );
  }

  const existingHandover = await prisma.shiftHandover.findUnique({
    where: {
      date_projectId_shiftNumber: {
        date: dateParamToDbDate(date),
        projectId,
        shiftNumber: shiftNum,
      },
    },
    include: {
      entries: { select: { clientId: true, updatedAt: true } },
    },
  });

  const expectedHandoverUpdatedAt = parseExpectedDate(handoverExpectedUpdatedAt);
  if (
    existingHandover &&
    expectedHandoverUpdatedAt &&
    existingHandover.updatedAt.getTime() !== expectedHandoverUpdatedAt.getTime()
  ) {
    return json(
      {
        error:
          "This handover was updated by someone else while you were editing. Please review the latest data and save again.",
      },
      { status: 409 }
    );
  }

  if (entries && Array.isArray(entries) && existingHandover) {
    const existingEntriesByClient = new Map(
      existingHandover.entries.map((e) => [e.clientId, e.updatedAt.getTime()])
    );
    const conflicts: string[] = [];

    for (const entry of entries) {
      if (!entry?.clientId) continue;
      const expected = parseExpectedDate(entry.expectedUpdatedAt);
      if (!expected) continue;
      const currentTs = existingEntriesByClient.get(entry.clientId);
      if (currentTs === undefined || currentTs !== expected.getTime()) {
        conflicts.push(entry.clientId);
      }
    }

    if (conflicts.length > 0) {
      return json(
        {
          error:
            "Some rows changed while you were editing. Please review the latest data and save again.",
          conflicts,
        },
        { status: 409 }
      );
    }
  }

  const handover = await prisma.shiftHandover.upsert({
    where: {
      date_projectId_shiftNumber: {
        date: dateParamToDbDate(date),
        projectId,
        shiftNumber: shiftNum,
      },
    },
    update: {
      leadNotes,
      status: submit ? "SUBMITTED" : "DRAFT",
      submittedById: submit ? session.user.id : undefined,
      submittedAt: submit ? new Date() : undefined,
    },
    create: {
      date: dateParamToDbDate(date),
      projectId,
      shiftNumber: shiftNum,
      leadNotes,
      leadId: isLeadOrAdmin ? session.user.id : null,
      status: submit ? "SUBMITTED" : "DRAFT",
      submittedById: submit ? session.user.id : undefined,
      submittedAt: submit ? new Date() : undefined,
    },
  });

  if (entries && Array.isArray(entries)) {
    const existingEntries = await prisma.clientEntry.findMany({
      where: { shiftHandoverId: handover.id },
      select: { clientId: true, filledById: true, handoverNotes: true, managerNotes: true },
    });
    const existingByClient = new Map(
      existingEntries.map((e) => [e.clientId, e])
    );

    let engineerNotesChanged = false;
    let managerNotesChanged = false;

    for (const entry of entries) {
      if (!entry.clientId) continue;

      const existing = existingByClient.get(entry.clientId);
      const existingFiller = existing?.filledById || null;
      const incomingHasData = entryHasData(entry);

      if (existing) {
        if ((entry.handoverNotes || null) !== (existing.handoverNotes || null)) {
          engineerNotesChanged = true;
        }
        if ((entry.managerNotes || null) !== (existing.managerNotes || null)) {
          managerNotesChanged = true;
        }
      }

      let filledById: string | null;
      if (existingFiller) {
        filledById = existingFiller;
      } else if (incomingHasData) {
        filledById = session.user.id;
      } else {
        filledById = null;
      }

      const rowTintPayload = isAdmin ? parseRowTint(entry.rowTint) : undefined;

      await prisma.clientEntry.upsert({
        where: {
          shiftHandoverId_clientId: {
            shiftHandoverId: handover.id,
            clientId: entry.clientId,
          },
        },
        update: {
          tickets: entry.tickets || null,
          status: entry.status || "NA",
          engineerWorkedUserId: entry.engineerWorkedUserId || null,
          engineerWorked:
            entry.engineerWorkedUserId ? null : entry.engineerWorked?.trim() || null,
          issues: entry.issues || null,
          updates: entry.updates || null,
          handoverNotes: entry.handoverNotes || null,
          managerNotes: entry.managerNotes || null,
          ...(isAdmin ? { rowTint: rowTintPayload } : {}),
          engineerId: entry.engineerId || null,
          filledById,
        },
        create: {
          shiftHandoverId: handover.id,
          clientId: entry.clientId,
          tickets: entry.tickets || null,
          status: entry.status || "NA",
          engineerWorkedUserId: entry.engineerWorkedUserId || null,
          engineerWorked:
            entry.engineerWorkedUserId ? null : entry.engineerWorked?.trim() || null,
          issues: entry.issues || null,
          updates: entry.updates || null,
          handoverNotes: entry.handoverNotes || null,
          managerNotes: entry.managerNotes || null,
          rowTint: isAdmin ? rowTintPayload : null,
          engineerId: entry.engineerId || null,
          filledById,
        },
      });
    }

    // Reset acknowledgements when their respective notes change
    const ackReset: Record<string, unknown> = {};
    if (engineerNotesChanged && handover.engineerAcknowledged) {
      ackReset.engineerAcknowledged = false;
      ackReset.engineerAcknowledgedById = null;
      ackReset.engineerAcknowledgedAt = null;
    }
    if (managerNotesChanged && handover.managerAcknowledged) {
      ackReset.managerAcknowledged = false;
      ackReset.managerAcknowledgedById = null;
      ackReset.managerAcknowledgedAt = null;
    }
    if (Object.keys(ackReset).length > 0) {
      await prisma.shiftHandover.update({
        where: { id: handover.id },
        data: ackReset,
      });
    }
  }

  const result = await prisma.shiftHandover.findUnique({
    where: { id: handover.id },
    include: {
      entries: {
        include: {
          client: true,
          engineer: { select: { id: true, name: true } },
          engineerWorkedBy: { select: { id: true, name: true } },
          filledBy: { select: { id: true, name: true } },
        },
      },
      engineerAcknowledger: { select: { id: true, name: true } },
      managerAcknowledger: { select: { id: true, name: true } },
    },
  });

  if (!result) {
    return json({ error: "Handover not found after save" }, { status: 500 });
  }
  return json(result);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { handoverId, action } = body;

  if (!handoverId || !action) {
    return json({ error: "Missing parameters" }, { status: 400 });
  }

  const handover = await prisma.shiftHandover.findUnique({
    where: { id: handoverId },
    include: { entries: true },
  });

  if (!handover) {
    return json({ error: "Handover not found" }, { status: 404 });
  }

  if (action === "engineer_acknowledge") {
    if (session.user.role !== "LEAD" && session.user.role !== "ADMIN") {
      return json(
        { error: "Only Shift Leads and Admins can acknowledge engineer notes" },
        { status: 403 }
      );
    }
    const allEngineerNotesFilled = handover.entries.length > 0 &&
      handover.entries.every((e) => !!e.handoverNotes);
    if (!allEngineerNotesFilled) {
      return json({ error: "All engineer notes must be filled before acknowledging" }, { status: 400 });
    }
    await prisma.shiftHandover.update({
      where: { id: handoverId },
      data: {
        engineerAcknowledged: true,
        engineerAcknowledgedById: session.user.id,
        engineerAcknowledgedAt: new Date(),
      },
    });
  } else if (action === "manager_acknowledge") {
    if (session.user.role !== "ADMIN") {
      return json({ error: "Only managers/admins can acknowledge manager notes" }, { status: 403 });
    }
    const allManagerNotesFilled = handover.entries.length > 0 &&
      handover.entries.every((e) => !!e.managerNotes);
    if (!allManagerNotesFilled) {
      return json({ error: "All manager notes must be filled before acknowledging" }, { status: 400 });
    }
    await prisma.shiftHandover.update({
      where: { id: handoverId },
      data: {
        managerAcknowledged: true,
        managerAcknowledgedById: session.user.id,
        managerAcknowledgedAt: new Date(),
      },
    });
  } else {
    return json({ error: "Invalid action" }, { status: 400 });
  }

  const result = await prisma.shiftHandover.findUnique({
    where: { id: handoverId },
    include: {
      entries: {
        include: {
          client: true,
          engineer: { select: { id: true, name: true } },
          engineerWorkedBy: { select: { id: true, name: true } },
          filledBy: { select: { id: true, name: true } },
        },
      },
      engineerAcknowledger: { select: { id: true, name: true } },
      managerAcknowledger: { select: { id: true, name: true } },
    },
  });

  return json(result);
}
