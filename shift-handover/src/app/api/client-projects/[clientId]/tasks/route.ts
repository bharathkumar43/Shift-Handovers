import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const mp = await prisma.migrationProject.findUnique({ where: { clientId } });
  if (!mp) return NextResponse.json([]);

  const tasks = await prisma.migrationTask.findMany({
    where: { migrationProjectId: mp.id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(tasks);
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
  const { taskName, description, assignedTo, plannedStartDate, plannedEndDate,
    actualStartDate, actualEndDate, status, comments, additionalNotes } = body;

  if (!taskName?.trim()) return NextResponse.json({ error: "Task name required" }, { status: 400 });

  const maxSort = await prisma.migrationTask.aggregate({
    where: { migrationProjectId: mp.id },
    _max: { sortOrder: true },
  });

  const task = await prisma.migrationTask.create({
    data: {
      migrationProjectId: mp.id,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      taskName: taskName.trim(),
      description: description || null,
      assignedTo: assignedTo || "CLOUDFUZE",
      plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
      plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
      actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
      actualEndDate: actualEndDate ? new Date(actualEndDate) : null,
      status: status || "NOT_STARTED",
      comments: comments || null,
      additionalNotes: additionalNotes || null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
