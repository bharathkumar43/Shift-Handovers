import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { dateParamToDbDate } from "@/lib/db-date";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, must-revalidate" } as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const dateFilter: Record<string, Date> = {};
  if (startDate) dateFilter.gte = dateParamToDbDate(startDate);
  if (endDate) dateFilter.lte = dateParamToDbDate(endDate);

  const where: Record<string, unknown> = {
    entries: { some: { clientId } },
  };
  if (projectId) where.projectId = projectId;
  if (Object.keys(dateFilter).length > 0) where.date = dateFilter;

  const handovers = await prisma.shiftHandover.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      entries: {
        where: { clientId },
        include: {
          client: { select: { id: true, name: true } },
          engineerWorkedBy: { select: { id: true, name: true } },
          engineer: { select: { id: true, name: true } },
          filledBy: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }, { shiftNumber: "asc" }],
  });

  return NextResponse.json(handovers, { headers: NO_STORE });
}
