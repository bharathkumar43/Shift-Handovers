import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { resolveEffectiveProductType } from "@/lib/effective-product-type";
import { sanitizeTrackerDetailsFromBody } from "@/lib/batch-tracker-fieldsets";
import { Prisma } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const mp = await prisma.migrationProject.findUnique({ where: { clientId } });
  if (!mp) return NextResponse.json([]);

  const batches = await prisma.batchRun.findMany({
    where: { migrationProjectId: mp.id },
    orderBy: [{ batchNumber: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(batches);
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
  const { batchName, batchNumber, totalItems, migratedItems, failedItems,
    skippedItems, totalSizeGb, migratedSizeGb, plannedStartDate, plannedEndDate,
    actualStartDate, actualEndDate, status, errorSummary, notes, batchPhase } = body;

  if (!batchName) return NextResponse.json({ error: "Batch name required" }, { status: 400 });

  let mtOpt = mp.migrationType
    ? await prisma.migrationTypeOption.findUnique({ where: { value: mp.migrationType } })
    : null;
  if (!mtOpt && mp.migrationType) {
    mtOpt = await prisma.migrationTypeOption.findFirst({
      where: { value: { equals: mp.migrationType, mode: "insensitive" } },
    });
  }
  const effectiveProductType = resolveEffectiveProductType(mtOpt?.productType, mp.productType);
  if (!effectiveProductType) {
    return NextResponse.json(
      {
        error:
          "Choose a migration type on the project (e.g. Exchange → Microsoft 365) so the batch tracker can pick Content / Email / Message options. Generic “Other” migrations need product type set on the project.",
      },
      { status: 400 }
    );
  }

  const userId = (session.user as { id?: string }).id;
  const trackerDetails = sanitizeTrackerDetailsFromBody(body.trackerDetails);
  const batch = await prisma.batchRun.create({
    data: {
      migrationProjectId: mp.id,
      batchName,
      productType: effectiveProductType,
      batchNumber: batchNumber ?? null,
      totalItems: totalItems ?? 0,
      migratedItems: migratedItems ?? 0,
      failedItems: failedItems ?? 0,
      skippedItems: skippedItems ?? 0,
      totalSizeGb: totalSizeGb ?? null,
      migratedSizeGb: migratedSizeGb ?? null,
      plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
      plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
      actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
      actualEndDate: actualEndDate ? new Date(actualEndDate) : null,
      status: (typeof status === "string" && status.trim()) ? status.trim() : "PENDING",
      errorSummary: errorSummary || null,
      notes: notes || null,
      batchPhase: batchPhase || null,
      trackerDetails: trackerDetails ?? Prisma.JsonNull,
      createdById: userId,
    },
  });

  return NextResponse.json(batch, { status: 201 });
}
