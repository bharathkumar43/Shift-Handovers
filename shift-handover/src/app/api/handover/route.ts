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
    // Fetch all existing entries for this handover to preserve original filledById
    const existingEntries = await prisma.clientEntry.findMany({
      where: { shiftHandoverId: handover.id },
      select: { clientId: true, filledById: true },
    });
    const existingByClient = new Map(
      existingEntries.map((e) => [e.clientId, e.filledById])
    );

    for (const entry of entries) {
      if (!entry.clientId) continue;

      const existingFiller = existingByClient.get(entry.clientId);
      const incomingHasData = entryHasData(entry);

      // Determine who should be recorded as the filler:
      // - If an existing entry already has a filledById, keep it (don't overwrite)
      // - If no existing filler and the incoming entry has data, set current user
      // - If no data at all, leave null
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
          engineerId: entry.engineerId || null,
          filledById,
        },
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
    },
  });

  return NextResponse.json(result);
}
