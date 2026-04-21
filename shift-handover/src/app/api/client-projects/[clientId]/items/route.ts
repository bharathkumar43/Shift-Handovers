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
  const batchId = searchParams.get("batchId");

  const items = await prisma.migrationItem.findMany({
    where: {
      migrationProjectId: mp.id,
      ...(statusFilter ? { migrationStatus: statusFilter as never } : {}),
      ...(batchId === "none" ? { batchRunId: null } : batchId ? { batchRunId: batchId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(items);
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
    batchRunId, sourceEmail, sourcePath, destinationEmail, destinationPath,
    sourceValidation, destinationValidation, migrationStatus, combination, server, comments,
  } = body;

  const item = await prisma.migrationItem.create({
    data: {
      migrationProjectId: mp.id,
      batchRunId: batchRunId || null,
      sourceEmail: sourceEmail || null,
      sourcePath: sourcePath || null,
      destinationEmail: destinationEmail || null,
      destinationPath: destinationPath || null,
      sourceValidation: sourceValidation || null,
      destinationValidation: destinationValidation || null,
      migrationStatus: migrationStatus || "INITIATED_MIGRATION",
      combination: combination || "MYDRIVE_MYDRIVE",
      server: server || null,
      comments: comments || null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
