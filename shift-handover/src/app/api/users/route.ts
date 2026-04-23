import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, must-revalidate" } as const;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...NO_STORE, ...(init?.headers as Record<string, string> | undefined) },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      assignedShifts: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role, assignedShifts } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const shifts =
    Array.isArray(assignedShifts) && assignedShifts.length > 0
      ? [...new Set(assignedShifts.map((n: number) => parseInt(String(n), 10)))].filter((n) => n >= 1 && n <= 3)
      : [];

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role || "ENGINEER",
      assignedShifts: shifts,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      assignedShifts: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, name, email, role, active, password, assignedShifts } = body;

  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;
  if (active !== undefined) updateData.active = active;
  if (password) updateData.password = await bcrypt.hash(password, 10);
  if (assignedShifts !== undefined) {
    const shifts = Array.isArray(assignedShifts)
      ? [...new Set(assignedShifts.map((n: number) => parseInt(String(n), 10)))].filter((n) => n >= 1 && n <= 3)
      : [];
    updateData.assignedShifts = shifts;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      assignedShifts: true,
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  if (id === session.user.id) {
    return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.shiftHandover.updateMany({ where: { leadId: id }, data: { leadId: null } }),
    prisma.shiftHandover.updateMany({ where: { submittedById: id }, data: { submittedById: null } }),
    prisma.shiftHandover.updateMany({ where: { engineerAcknowledgedById: id }, data: { engineerAcknowledgedById: null, engineerAcknowledged: false, engineerAcknowledgedAt: null } }),
    prisma.shiftHandover.updateMany({ where: { managerAcknowledgedById: id }, data: { managerAcknowledgedById: null, managerAcknowledged: false, managerAcknowledgedAt: null } }),
    prisma.clientEntry.updateMany({ where: { engineerId: id }, data: { engineerId: null } }),
    prisma.clientEntry.updateMany({ where: { engineerWorkedUserId: id }, data: { engineerWorkedUserId: null } }),
    prisma.clientEntry.updateMany({ where: { filledById: id }, data: { filledById: null } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
