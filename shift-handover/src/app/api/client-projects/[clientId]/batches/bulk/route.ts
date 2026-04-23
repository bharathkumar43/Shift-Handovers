import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { resolveProductLineForBatchTracker } from "@/lib/migration-project-product-line";
import { sanitizeTrackerDetailsFromBody } from "@/lib/batch-tracker-fieldsets";
import { Prisma } from "@prisma/client";

const MAX_BATCHES = 300;

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
  const runs = body?.runs as unknown[] | undefined;
  if (!Array.isArray(runs) || runs.length === 0) {
    return NextResponse.json({ error: "Body must include a non-empty runs array" }, { status: 400 });
  }
  if (runs.length > MAX_BATCHES) {
    return NextResponse.json(
      { error: `At most ${MAX_BATCHES} batches per import` },
      { status: 400 }
    );
  }

  const effectiveProductType = await resolveProductLineForBatchTracker(mp);
  const userId = (session.user as { id?: string }).id;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const out: Awaited<ReturnType<typeof prisma.batchRun.create>>[] = [];
      for (let i = 0; i < runs.length; i++) {
        const item = runs[i];
        if (!item || typeof item !== "object") {
          throw new Error(`Run ${i + 1}: invalid entry`);
        }
        const row = item as Record<string, unknown>;
        const batchName = typeof row.batchName === "string" ? row.batchName.trim() : "";
        if (!batchName) {
          throw new Error(`Run ${i + 1}: batch name required`);
        }

        let batchNumber: number | null = null;
        if (row.batchNumber != null && row.batchNumber !== "") {
          const n = parseInt(String(row.batchNumber), 10);
          batchNumber = Number.isNaN(n) ? null : n;
        }

        const trackerDetails = sanitizeTrackerDetailsFromBody(row.trackerDetails);

        const batch = await tx.batchRun.create({
          data: {
            migrationProjectId: mp!.id,
            batchName,
            productType: effectiveProductType,
            batchNumber,
            totalItems: Number(row.totalItems) || 0,
            migratedItems: Number(row.migratedItems) || 0,
            failedItems: Number(row.failedItems) || 0,
            skippedItems: Number(row.skippedItems) || 0,
            totalSizeGb:
              row.totalSizeGb != null && row.totalSizeGb !== "" ? Number(row.totalSizeGb) : null,
            migratedSizeGb:
              row.migratedSizeGb != null && row.migratedSizeGb !== ""
                ? Number(row.migratedSizeGb)
                : null,
            plannedStartDate: row.plannedStartDate ? new Date(String(row.plannedStartDate)) : null,
            plannedEndDate: row.plannedEndDate ? new Date(String(row.plannedEndDate)) : null,
            actualStartDate: row.actualStartDate ? new Date(String(row.actualStartDate)) : null,
            actualEndDate: row.actualEndDate ? new Date(String(row.actualEndDate)) : null,
            status:
              typeof row.status === "string" && row.status.trim()
                ? row.status.trim()
                : "PENDING",
            errorSummary: row.errorSummary ? String(row.errorSummary) : null,
            notes: row.notes ? String(row.notes) : null,
            batchPhase: row.batchPhase ? String(row.batchPhase) : null,
            trackerDetails: trackerDetails ?? Prisma.JsonNull,
            createdById: userId,
          },
        });
        out.push(batch);
      }
      return out;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
