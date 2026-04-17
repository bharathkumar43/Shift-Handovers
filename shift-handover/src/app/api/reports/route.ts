import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode"); // "date" | "employee" | "client"
  const date = searchParams.get("date");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const employeeId = searchParams.get("employeeId");
  const clientId = searchParams.get("clientId");

  if (mode === "date" && date) {
    const handovers = await prisma.shiftHandover.findMany({
      where: { date: new Date(date) },
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
      orderBy: [{ project: { name: "asc" } }, { shiftNumber: "asc" }],
    });
    return NextResponse.json({ handovers });
  }

  if (mode === "employee" && employeeId) {
    const dateFilter: Record<string, unknown> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const entries = await prisma.clientEntry.findMany({
      where: {
        filledById: employeeId,
        ...(Object.keys(dateFilter).length > 0
          ? { shiftHandover: { date: dateFilter } }
          : {}),
      },
      include: {
        client: true,
        shiftHandover: {
          include: {
            project: true,
          },
        },
        engineer: { select: { id: true, name: true } },
        engineerWorkedBy: { select: { id: true, name: true } },
        filledBy: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ entries });
  }

  if (mode === "client" && clientId) {
    const dateFilter: Record<string, unknown> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const entries = await prisma.clientEntry.findMany({
      where: {
        clientId,
        ...(Object.keys(dateFilter).length > 0
          ? { shiftHandover: { date: dateFilter } }
          : {}),
      },
      include: {
        client: true,
        shiftHandover: {
          include: {
            project: true,
          },
        },
        engineer: { select: { id: true, name: true } },
        engineerWorkedBy: { select: { id: true, name: true } },
        filledBy: { select: { id: true, name: true } },
      },
      orderBy: { shiftHandover: { date: "desc" } },
      take: 200,
    });
    return NextResponse.json({ entries });
  }

  return NextResponse.json({ error: "Invalid mode or missing parameters" }, { status: 400 });
}
