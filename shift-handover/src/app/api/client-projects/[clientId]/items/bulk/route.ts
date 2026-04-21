import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

const STATUS_MAP: Record<string, string> = {
  "initiated migration": "INITIATED_MIGRATION",
  "initated migartion": "INITIATED_MIGRATION",
  "initiated one time": "INITIATED_ONE_TIME",
  "pilot completed": "PILOT_COMPLETED",
  "in progress": "IN_PROGRESS",
  "completed": "COMPLETED",
  "failed": "FAILED",
  "skipped": "SKIPPED",
};

const COMBO_MAP: Record<string, string> = {
  "mydrive - mydrive": "MYDRIVE_MYDRIVE",
  "mydrive-mydrive": "MYDRIVE_MYDRIVE",
  "shareddrive - shareddrive": "SHAREDDRIVE_SHAREDDRIVE",
  "shareddrive-shareddrive": "SHAREDDRIVE_SHAREDDRIVE",
  "mydrive - shareddrive": "MYDRIVE_SHAREDDRIVE",
  "mydrive-shareddrive": "MYDRIVE_SHAREDDRIVE",
  "shareddrive - mydrive": "SHAREDDRIVE_MYDRIVE",
  "shareddrive-mydrive": "SHAREDDRIVE_MYDRIVE",
};

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
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }
  if (items.length > 500) {
    return NextResponse.json({ error: "Max 500 items per import" }, { status: 400 });
  }

  const data = items.map((row: Record<string, string>) => ({
    migrationProjectId: mp!.id,
    batchRunId: row.batchRunId || null,
    sourceEmail: row.sourceEmail || null,
    sourcePath: row.sourcePath || null,
    destinationEmail: row.destinationEmail || null,
    destinationPath: row.destinationPath || null,
    sourceValidation: row.sourceValidation || null,
    destinationValidation: row.destinationValidation || null,
    migrationStatus: (STATUS_MAP[row.migrationStatus?.toLowerCase()?.trim()] ?? "INITIATED_MIGRATION") as never,
    combination: (COMBO_MAP[row.combination?.toLowerCase()?.trim()] ?? "OTHER") as never,
    server: row.server || null,
    comments: row.comments || null,
  }));

  const result = await prisma.migrationItem.createMany({ data });
  return NextResponse.json({ created: result.count });
}
