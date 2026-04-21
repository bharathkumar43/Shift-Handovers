import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const mp = await prisma.migrationProject.findUnique({ where: { clientId } });
  if (!mp) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const issues = await prisma.migrationIssue.findMany({
    where: {
      migrationProjectId: mp.id,
      ...(statusFilter ? { ticketStatus: statusFilter as never } : {}),
    },
    orderBy: { occurredAt: "desc" },
  });

  return NextResponse.json(issues);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "LEAD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clientId } = await params;
  let mp = await prisma.migrationProject.findUnique({ where: { clientId } });
  if (!mp) mp = await prisma.migrationProject.create({ data: { clientId } });

  const body = await req.json();
  const {
    occurredAt, description, l3TicketKey, cfitsTicketKey,
    ticketStatus, resolvedAt, resolution,
  } = body;

  if (!occurredAt || !description) {
    return NextResponse.json({ error: "occurredAt and description are required" }, { status: 400 });
  }

  const resolvedDate = resolvedAt ? new Date(resolvedAt) : null;
  const occurredDate = new Date(occurredAt);
  const daysToSolve = resolvedDate
    ? Math.ceil((resolvedDate.getTime() - occurredDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const issue = await prisma.migrationIssue.create({
    data: {
      migrationProjectId: mp.id,
      occurredAt: occurredDate,
      description,
      l3TicketKey: l3TicketKey || null,
      cfitsTicketKey: cfitsTicketKey || null,
      ticketStatus: ticketStatus || "OPEN",
      resolvedAt: resolvedDate,
      resolution: resolution || null,
      daysToSolve,
    },
  });

  return NextResponse.json(issue, { status: 201 });
}
