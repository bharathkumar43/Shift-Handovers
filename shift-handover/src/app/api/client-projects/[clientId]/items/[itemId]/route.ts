import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

const ALLOWED = [
  "batchRunId", "sourceEmail", "sourcePath", "destinationEmail", "destinationPath",
  "sourceValidation", "destinationValidation", "migrationStatus", "combination", "server", "comments",
];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "LEAD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { itemId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ALLOWED) {
    if (k in body) data[k] = body[k] ?? null;
  }

  const item = await prisma.migrationItem.update({ where: { id: itemId }, data });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { itemId } = await params;
  await prisma.migrationItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
