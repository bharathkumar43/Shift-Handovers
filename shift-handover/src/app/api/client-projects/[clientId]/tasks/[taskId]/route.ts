import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

const DATE_FIELDS = ["plannedStartDate", "plannedEndDate", "actualStartDate", "actualEndDate"];
const ALLOWED = ["taskName", "description", "assignedTo", ...DATE_FIELDS, "status", "comments", "additionalNotes"];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "LEAD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { taskId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ALLOWED) {
    if (k in body) {
      data[k] = DATE_FIELDS.includes(k) && body[k] ? new Date(body[k]) : (body[k] ?? null);
    }
  }

  const task = await prisma.migrationTask.update({ where: { id: taskId }, data });
  return NextResponse.json(task);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { taskId } = await params;
  await prisma.migrationTask.delete({ where: { id: taskId } });
  return NextResponse.json({ ok: true });
}
