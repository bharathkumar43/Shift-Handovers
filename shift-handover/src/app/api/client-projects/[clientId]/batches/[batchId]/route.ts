import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { resolveProductLineForBatchTracker } from "@/lib/migration-project-product-line";
import { sanitizeTrackerDetailsFromBody } from "@/lib/batch-tracker-fieldsets";
import { Prisma } from "@prisma/client";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; batchId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "LEAD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clientId, batchId } = await params;
  const body = await req.json();
  const existing = await prisma.batchRun.findFirst({
    where: { id: batchId, migrationProject: { clientId } },
    include: { migrationProject: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mp = existing.migrationProject;
  const resolvedProductType = await resolveProductLineForBatchTracker(mp);

  const dateFields = ["plannedStartDate", "plannedEndDate", "actualStartDate", "actualEndDate"];
  const allowed = [
    "batchName", "batchNumber", "totalItems", "migratedItems", "failedItems",
    "skippedItems", "totalSizeGb", "migratedSizeGb", "plannedStartDate", "plannedEndDate",
    "actualStartDate", "actualEndDate", "status", "errorSummary", "notes", "batchPhase",
  ];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      data[k] = dateFields.includes(k) && body[k] ? new Date(body[k]) : (body[k] ?? null);
    }
  }
  if ("trackerDetails" in body) {
    const td = sanitizeTrackerDetailsFromBody(body.trackerDetails);
    data.trackerDetails = td ?? Prisma.JsonNull;
  }
  data.productType = resolvedProductType;

  const batch = await prisma.batchRun.update({ where: { id: batchId }, data });
  return NextResponse.json(batch);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string; batchId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { batchId } = await params;
  await prisma.batchRun.delete({ where: { id: batchId } });
  return NextResponse.json({ ok: true });
}
