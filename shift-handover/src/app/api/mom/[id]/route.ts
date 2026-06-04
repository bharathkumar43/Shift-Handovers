import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { readFile, unlink } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), "uploads", "moms");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const mom = await prisma.mOM.findUnique({ where: { id } });
  if (!mom) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const buffer = await readFile(join(UPLOADS_DIR, mom.storedName));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(mom.filename)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const mom = await prisma.mOM.findUnique({ where: { id } });
  if (!mom) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = (session.user as { role?: string })?.role;
  if (role !== "ADMIN" && mom.uploadedById !== session.user.id) {
    return NextResponse.json({ error: "Not authorized to delete this MOM" }, { status: 403 });
  }

  try { await unlink(join(UPLOADS_DIR, mom.storedName)); } catch { /* file may already be gone */ }
  await prisma.mOM.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
