import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

const ALLOWED = [
  "occurredAt", "description", "l3TicketKey", "cfitsTicketKey",
  "ticketStatus", "resolvedAt", "resolution",
];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "LEAD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { issueId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  for (const k of ALLOWED) {
    if (k in body) {
      if ((k === "occurredAt" || k === "resolvedAt") && body[k]) {
        data[k] = new Date(body[k]);
      } else {
        data[k] = body[k] ?? null;
      }
    }
  }

  // Recompute daysToSolve if dates changed
  const existing = await prisma.migrationIssue.findUnique({ where: { id: issueId } });
  if (existing) {
    const occurred = (data.occurredAt as Date | undefined) ?? existing.occurredAt;
    const resolved = (data.resolvedAt as Date | null | undefined) !== undefined
      ? (data.resolvedAt as Date | null)
      : existing.resolvedAt;
    data.daysToSolve = resolved
      ? Math.ceil((resolved.getTime() - occurred.getTime()) / (1000 * 60 * 60 * 24))
      : null;
  }

  const issue = await prisma.migrationIssue.update({ where: { id: issueId }, data });
  return NextResponse.json(issue);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { issueId } = await params;
  await prisma.migrationIssue.delete({ where: { id: issueId } });
  return NextResponse.json({ ok: true });
}
