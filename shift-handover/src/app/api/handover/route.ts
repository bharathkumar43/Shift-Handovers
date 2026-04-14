import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const projectId = searchParams.get("projectId");
  const shiftNumber = searchParams.get("shiftNumber");

  if (!date || !projectId || !shiftNumber) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const handover = await prisma.shiftHandover.findUnique({
    where: {
      date_projectId_shiftNumber: {
        date: new Date(date),
        projectId,
        shiftNumber: parseInt(shiftNumber),
      },
    },
    include: {
      entries: {
        include: {
          client: true,
          engineer: { select: { id: true, name: true } },
          filledBy: { select: { id: true, name: true } },
        },
      },
      lead: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      engineerAcknowledger: { select: { id: true, name: true } },
      managerAcknowledger: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(handover);
}

function entryHasData(entry: {
  tickets?: string | null;
  status?: string | null;
  engineerWorked?: string | null;
  issues?: string | null;
  updates?: string | null;
  handoverNotes?: string | null;
}): boolean {
  return !!(
    (entry.status && entry.status !== "NA") ||
    entry.tickets ||
    entry.engineerWorked ||
    entry.issues ||
    entry.updates ||
    entry.handoverNotes
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, projectId, shiftNumber, leadNotes, entries, submit } = body;

  if (submit && session.user.role === "ENGINEER") {
    return NextResponse.json(
      { error: "Only Shift Leads and Admins can submit handovers" },
      { status: 403 }
    );
  }

  const handover = await prisma.shiftHandover.upsert({
    where: {
      date_projectId_shiftNumber: {
        date: new Date(date),
        projectId,
        shiftNumber: parseInt(shiftNumber),
      },
    },
    update: {
      leadNotes,
      status: submit ? "SUBMITTED" : "DRAFT",
      submittedById: submit ? session.user.id : undefined,
      submittedAt: submit ? new Date() : undefined,
    },
    create: {
      date: new Date(date),
      projectId,
      shiftNumber: parseInt(shiftNumber),
      leadNotes,
      leadId: session.user.id,
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
          engineerWorked: entry.engineerWorked || null,
          issues: entry.issues || null,
          updates: entry.updates || null,
          handoverNotes: entry.handoverNotes || null,
          managerNotes: entry.managerNotes || null,
          engineerId: entry.engineerId || null,
          filledById,
        },
        create: {
          shiftHandoverId: handover.id,
          clientId: entry.clientId,
          tickets: entry.tickets || null,
          status: entry.status || "NA",
          engineerWorked: entry.engineerWorked || null,
          issues: entry.issues || null,
          updates: entry.updates || null,
          handoverNotes: entry.handoverNotes || null,
          managerNotes: entry.managerNotes || null,
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
          filledBy: { select: { id: true, name: true } },
        },
      },
      engineerAcknowledger: { select: { id: true, name: true } },
      managerAcknowledger: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { handoverId, action } = body;

  if (!handoverId || !action) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const handover = await prisma.shiftHandover.findUnique({
    where: { id: handoverId },
    include: { entries: true },
  });

  if (!handover) {
    return NextResponse.json({ error: "Handover not found" }, { status: 404 });
  }

  if (action === "engineer_acknowledge") {
    if (session.user.role !== "LEAD") {
      return NextResponse.json({ error: "Only Shift Leads can acknowledge engineer notes" }, { status: 403 });
    }
    const allEngineerNotesFilled = handover.entries.length > 0 &&
      handover.entries.every((e) => !!e.handoverNotes);
    if (!allEngineerNotesFilled) {
      return NextResponse.json({ error: "All engineer notes must be filled before acknowledging" }, { status: 400 });
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
      return NextResponse.json({ error: "Only managers/admins can acknowledge manager notes" }, { status: 403 });
    }
    const allManagerNotesFilled = handover.entries.length > 0 &&
      handover.entries.every((e) => !!e.managerNotes);
    if (!allManagerNotesFilled) {
      return NextResponse.json({ error: "All manager notes must be filled before acknowledging" }, { status: 400 });
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
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const result = await prisma.shiftHandover.findUnique({
    where: { id: handoverId },
    include: {
      entries: {
        include: {
          client: true,
          engineer: { select: { id: true, name: true } },
          filledBy: { select: { id: true, name: true } },
        },
      },
      engineerAcknowledger: { select: { id: true, name: true } },
      managerAcknowledger: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(result);
}
