import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const handovers = await prisma.shiftHandover.findMany({
    where: { date: new Date(date) },
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
    where: { date: new Date(date) },
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

  return NextResponse.json({
    handovers,
    dailyDashboard,
    metrics: { totalTickets, openIssues, resolved },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, dutyManager, week, keyIssues, actionsForTomorrow } = body;

  const dashboard = await prisma.dailyDashboard.upsert({
    where: { date: new Date(date) },
    update: { dutyManager, week, keyIssues, actionsForTomorrow },
    create: { date: new Date(date), dutyManager, week, keyIssues, actionsForTomorrow },
  });

  return NextResponse.json(dashboard);
}
