import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const allUsers = await prisma.user.findMany({
    where: { active: true, role: { in: ["ENGINEER", "LEAD"] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  const projects = await prisma.project.findMany({
    where: { active: true },
    select: { id: true, name: true },
  });

  const handovers = await prisma.shiftHandover.findMany({
    where: { date: new Date(date) },
    include: {
      project: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      entries: {
        include: {
          client: { select: { name: true } },
          filledBy: { select: { id: true, name: true } },
          engineer: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ project: { name: "asc" } }, { shiftNumber: "asc" }],
  });

  // Build per-engineer activity: which engineers filled entries and when
  const engineerActivity: Record<
    string,
    {
      userId: string;
      userName: string;
      entriesFilledCount: number;
      lastFilledAt: string | null;
      shifts: { projectName: string; shiftNumber: number; entriesCount: number; filledAt: string | null }[];
    }
  > = {};

  for (const user of allUsers) {
    engineerActivity[user.id] = {
      userId: user.id,
      userName: user.name,
      entriesFilledCount: 0,
      lastFilledAt: null,
      shifts: [],
    };
  }

  for (const handover of handovers) {
    const fillerMap: Record<string, { count: number; lastAt: string | null }> = {};

    for (const entry of handover.entries) {
      if (entry.filledById && entry.filledById in engineerActivity) {
        if (!fillerMap[entry.filledById]) {
          fillerMap[entry.filledById] = { count: 0, lastAt: null };
        }
        fillerMap[entry.filledById].count++;
        const updatedAt = entry.updatedAt.toISOString();
        if (!fillerMap[entry.filledById].lastAt || updatedAt > fillerMap[entry.filledById].lastAt!) {
          fillerMap[entry.filledById].lastAt = updatedAt;
        }

        engineerActivity[entry.filledById].entriesFilledCount++;
        if (
          !engineerActivity[entry.filledById].lastFilledAt ||
          updatedAt > engineerActivity[entry.filledById].lastFilledAt!
        ) {
          engineerActivity[entry.filledById].lastFilledAt = updatedAt;
        }
      }
    }

    for (const [userId, data] of Object.entries(fillerMap)) {
      if (engineerActivity[userId]) {
        engineerActivity[userId].shifts.push({
          projectName: handover.project.name,
          shiftNumber: handover.shiftNumber,
          entriesCount: data.count,
          filledAt: data.lastAt,
        });
      }
    }
  }

  // Also track who submitted each handover
  const shiftSubmissions = handovers.map((h) => ({
    projectName: h.project.name,
    shiftNumber: h.shiftNumber,
    status: h.status,
    submittedBy: h.submittedBy?.name || null,
    submittedAt: h.submittedAt?.toISOString() || null,
    leadName: h.lead?.name || null,
    totalEntries: h.entries.length,
    filledEntries: h.entries.filter(
      (e) => e.status !== "NA" || e.tickets || e.issues || e.updates || e.handoverNotes
    ).length,
    entries: h.entries.map((e) => ({
      clientName: e.client.name,
      status: e.status,
      filledBy: e.filledBy?.name || null,
      filledAt: e.updatedAt.toISOString(),
      hasData: !!(e.tickets || e.issues || e.updates || e.handoverNotes || e.status !== "NA"),
    })),
  }));

  const filled = Object.values(engineerActivity).filter((e) => e.entriesFilledCount > 0);
  const notFilled = Object.values(engineerActivity).filter((e) => e.entriesFilledCount === 0);

  return NextResponse.json({
    date,
    projects,
    shiftSubmissions,
    engineerActivity: Object.values(engineerActivity),
    summary: {
      totalEngineers: allUsers.length,
      filledCount: filled.length,
      notFilledCount: notFilled.length,
      filledEngineers: filled.map((e) => e.userName),
      notFilledEngineers: notFilled.map((e) => e.userName),
    },
  });
}
