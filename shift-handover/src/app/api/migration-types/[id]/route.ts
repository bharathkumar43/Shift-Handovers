import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const type = await prisma.migrationTypeOption.findUnique({ where: { id } });
  if (!type) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (type.isBuiltIn) return NextResponse.json({ error: "Built-in types cannot be deleted" }, { status: 403 });

  await prisma.migrationTypeOption.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
