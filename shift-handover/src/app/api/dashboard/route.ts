import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { dateParamToDbDate } from "@/lib/db-date";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, must-revalidate" } as const;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...NO_STORE, ...(init?.headers as Record<string, string> | undefined) },
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const day = dateParamToDbDate(date);

  const handovers = await prisma.shiftHandover.findMany({
    where: { date: day },
    include: {
      project: true,
      lead: { select: { id: true, name: true } },
      entries: {
        include: {
          client: true,
          engineer: { select: { id: true, name: true } },
          filledBy: { select: { id: true, name: true } },
        },
      },
      submittedBy: { select: { id: true, name: true } },
    },
  });

  const dailyDashboard = await prisma.dailyDashboard.findUnique({
    where: { date: day },
  });

  let totalTickets = 0;
  let openIssues = 0;
  let resolved = 0;

  for (const handover of handovers) {
    for (const entry of handover.entries) {
      if (entry.tickets && entry.tickets.trim() && entry.tickets.toLowerCase() !== "nil" && entry.tickets.toLowerCase() !== "nill") {
        totalTickets++;
      }
      if (entry.status === "IN_PROGRESS" || entry.status === "PENDING") {
        openIssues++;
      }
      if (entry.status === "COMPLETE") {
        resolved++;
      }
    }
  }

  return json({
    handovers,
    dailyDashboard,
    metrics: { totalTickets, openIssues, resolved },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, dutyManager, week, keyIssues, actionsForTomorrow } = body;

  const day = dateParamToDbDate(date);
  const dashboard = await prisma.dailyDashboard.upsert({
    where: { date: day },
    update: { dutyManager, week, keyIssues, actionsForTomorrow },
    create: { date: day, dutyManager, week, keyIssues, actionsForTomorrow },
  });

  return json(dashboard);
}
