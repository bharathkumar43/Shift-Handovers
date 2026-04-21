import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const mp = await prisma.migrationProject.findUnique({ where: { clientId } });
  if (!mp) return NextResponse.json([]);

  const comments = await prisma.projectComment.findMany({
    where: { migrationProjectId: mp.id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  let mp = await prisma.migrationProject.findUnique({ where: { clientId } });
  if (!mp) mp = await prisma.migrationProject.create({ data: { clientId } });

  const userId = (session.user as { id?: string }).id!;
  const comment = await prisma.projectComment.create({
    data: { migrationProjectId: mp.id, authorId: userId, content: content.trim() },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
