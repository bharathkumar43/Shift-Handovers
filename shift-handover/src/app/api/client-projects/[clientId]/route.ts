import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { resolveEffectiveProductTypeFromMigrationOptions } from "@/lib/effective-product-type";
import { normalizeMigrationTypesFromDb } from "@/lib/migration-project-helpers";
import type { ProductType } from "@prisma/client";

async function orderedMigrationOptions(values: string[]) {
  if (!values.length) return [];
  const all = await prisma.migrationTypeOption.findMany();
  return values
    .map((v) => all.find((o) => o.value.toLowerCase() === v.toLowerCase()))
    .filter((o): o is { productType: string } => !!o);
}

async function effectiveProductTypeForProject(mp: {
  migrationTypes: string[];
  migrationType: string | null;
  productType: ProductType | null;
}) {
  const norm = normalizeMigrationTypesFromDb(mp);
  const opts = await orderedMigrationOptions(norm);
  return resolveEffectiveProductTypeFromMigrationOptions(opts, mp.productType);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    let mp = await prisma.migrationProject.findUnique({
      where: { clientId },
      include: {
        projectManager: { select: { id: true, name: true } },
        _count: { select: { batchRuns: true, comments: true, migrationTasks: true, migrationItems: true, migrationIssues: true } },
      },
    });

    if (!mp) {
      mp = await prisma.migrationProject.create({
        data: { clientId },
        include: {
          projectManager: { select: { id: true, name: true } },
          _count: { select: { batchRuns: true, comments: true, migrationTasks: true, migrationItems: true, migrationIssues: true } },
        },
      });
    }

    const norm = normalizeMigrationTypesFromDb(mp);
    const effectiveProductType = await effectiveProductTypeForProject({
      migrationTypes: norm,
      migrationType: mp.migrationType,
      productType: mp.productType,
    });

    return NextResponse.json({
      client,
      migrationProject: { ...mp, migrationTypes: norm, effectiveProductType },
    });
  } catch (err) {
    console.error("[client-projects GET]", err);
    const msg = err instanceof Error ? err.message : "Database error";
    const hint =
      /column|does not exist|P2022|migrationTypes|overagePaid/i.test(msg)
        ? "Run database migrations: npx prisma migrate deploy — then restart the dev server and run npx prisma generate if needed."
        : undefined;
    return NextResponse.json(
      { error: "Failed to load project", detail: msg, hint },
      { status: 500 }
    );
  }
}

export async function PUT(
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
  const body = await req.json();

  try {
  const existing = await prisma.migrationProject.findUnique({ where: { clientId } });

  const allowedFields = [
    "status", "projectManagerId", "sowStartDate", "sowEndDate", "kickoffDate",
    "productType", "sourceSystem", "destinationSystem",
    "description", "internalNotes",
    "migrationPhase", "deltaScheduledDate", "deltaReadyConfirmedAt", "deltaCompletedAt", "deltaNotes",
    "overagePaid",
  ];
  const DATE_FIELDS = ["sowStartDate", "sowEndDate", "kickoffDate", "deltaScheduledDate", "deltaReadyConfirmedAt", "deltaCompletedAt"];
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      if (DATE_FIELDS.includes(key) && body[key]) {
        data[key] = new Date(body[key]);
      } else {
        data[key] = body[key] ?? null;
      }
    }
  }

  if (role !== "ADMIN") delete data.internalNotes;

  if (Array.isArray(body.migrationTypes) || body.migrationType !== undefined) {
    let arr: string[];
    if (Array.isArray(body.migrationTypes)) {
      arr = body.migrationTypes
        .filter((x: unknown) => typeof x === "string")
        .map((s: string) => s.trim())
        .filter(Boolean);
    } else if (body.migrationType) {
      arr = [String(body.migrationType).trim()];
    } else {
      arr = [];
    }
    data.migrationTypes = arr;
    data.migrationType = arr[0] ?? null;
    const mergedStored =
      body.productType !== undefined ? (body.productType as ProductType | null) : existing?.productType ?? null;
    const opts = await orderedMigrationOptions(arr);
    const eff = resolveEffectiveProductTypeFromMigrationOptions(opts, mergedStored);
    if (eff) data.productType = eff;
  }

    const mp = await prisma.migrationProject.upsert({
      where: { clientId },
      update: data,
      create: { clientId, ...data },
      include: {
        projectManager: { select: { id: true, name: true } },
        _count: { select: { batchRuns: true, comments: true, migrationTasks: true, migrationItems: true, migrationIssues: true } },
      },
    });

    const norm = normalizeMigrationTypesFromDb(mp);
    const effectiveProductType = await effectiveProductTypeForProject({
      migrationTypes: norm,
      migrationType: mp.migrationType,
      productType: mp.productType,
    });

    return NextResponse.json({ ...mp, migrationTypes: norm, effectiveProductType });
  } catch (err) {
    console.error("[client-projects PUT]", err);
    const msg = err instanceof Error ? err.message : "Database error";
    const hint =
      /column|does not exist|P2022|migrationTypes|overagePaid/i.test(msg)
        ? "Run: npx prisma migrate deploy — then npx prisma generate (stop dev server first on Windows if generate fails)."
        : undefined;
    return NextResponse.json({ error: "Failed to save project", detail: msg, hint }, { status: 500 });
  }
}
