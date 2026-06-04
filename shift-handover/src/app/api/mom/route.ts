import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), "uploads", "moms");

const NO_STORE = { "Cache-Control": "private, no-store, must-revalidate" } as const;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...NO_STORE, ...(init?.headers as Record<string, string> | undefined) },
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return json({ error: "clientId required" }, { status: 400 });

  const moms = await prisma.mOM.findMany({
    where: { clientId },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return json(moms);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const clientId = formData.get("clientId") as string | null;
  const projectId = formData.get("projectId") as string | null;
  const notes = formData.get("notes") as string | null;

  if (!file || !clientId || !projectId) {
    return json({ error: "file, clientId, and projectId are required" }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return json({ error: "File too large. Maximum 20 MB." }, { status: 400 });
  }

  await mkdir(UPLOADS_DIR, { recursive: true });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const storedName = `${randomUUID()}.${ext}`;
  await writeFile(join(UPLOADS_DIR, storedName), Buffer.from(await file.arrayBuffer()));

  const mom = await prisma.mOM.create({
    data: {
      clientId,
      projectId,
      filename: file.name,
      storedName,
      fileSize: file.size,
      notes: notes?.trim() || null,
      uploadedById: session.user.id,
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });

  return json(mom, { status: 201 });
}
