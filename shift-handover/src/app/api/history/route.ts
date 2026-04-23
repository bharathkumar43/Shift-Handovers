import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { dateParamToDbDate } from "@/lib/db-date";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, must-revalidate" } as const;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...NO_STORE, ...(init?.headers as Record<string, string> | undefined) },
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const projectId = searchParams.get("projectId");
  const shiftNumber = searchParams.get("shiftNumber");
  const clientId = searchParams.get("clientId");

  const where: Record<string, unknown> = {};

  if (startDate && endDate) {
    where.date = {
      gte: dateParamToDbDate(startDate),
      lte: dateParamToDbDate(endDate),
    };
  } else if (startDate) {
    where.date = { gte: dateParamToDbDate(startDate) };
  } else if (endDate) {
    where.date = { lte: dateParamToDbDate(endDate) };
  }

  if (projectId) where.projectId = projectId;
  if (shiftNumber) where.shiftNumber = parseInt(shiftNumber);
  if (clientId) where.entries = { some: { clientId } };

  const handovers = await prisma.shiftHandover.findMany({
    where,
    include: {
      project: true,
      lead: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      entries: {
        include: {
          client: true,
          engineer: { select: { id: true, name: true } },
          engineerWorkedBy: { select: { id: true, name: true } },
          filledBy: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }, { shiftNumber: "asc" }],
    take: 100,
  });

  return json(handovers);
}
