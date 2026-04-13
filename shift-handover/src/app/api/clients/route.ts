import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;

  const clients = await prisma.client.findMany({
    where,
    include: { project: { select: { id: true, name: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, projectId } = body;

  if (!name || !projectId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const maxSort = await prisma.client.aggregate({
    where: { projectId },
    _max: { sortOrder: true },
  });

  const client = await prisma.client.create({
    data: {
      name,
      projectId,
      sortOrder: (maxSort._max.sortOrder || 0) + 1,
    },
  });

  return NextResponse.json(client, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, name, active, sortOrder } = body;

  if (!id) {
    return NextResponse.json({ error: "Client ID required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (active !== undefined) updateData.active = active;
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

  const client = await prisma.client.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(client);
}
