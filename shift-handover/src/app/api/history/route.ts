import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const projectId = searchParams.get("projectId");
  const shiftNumber = searchParams.get("shiftNumber");

  const where: Record<string, unknown> = {};

  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  } else if (startDate) {
    where.date = { gte: new Date(startDate) };
  } else if (endDate) {
    where.date = { lte: new Date(endDate) };
  }

  if (projectId) where.projectId = projectId;
  if (shiftNumber) where.shiftNumber = parseInt(shiftNumber);

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
          filledBy: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }, { shiftNumber: "asc" }],
    take: 100,
  });

  return NextResponse.json(handovers);
}
