import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const mp = await prisma.migrationProject.findUnique({ where: { clientId } });
  if (!mp) return NextResponse.json([]);

  const rows = await prisma.migrationProjectTicket.findMany({
    where: { migrationProjectId: mp.id },
    include: {
      sourceClientEntry: {
        include: {
          shiftHandover: {
            include: { project: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const payload = rows.map((r) => {
    const sh = r.sourceClientEntry.shiftHandover;
    return {
      id: r.id,
      content: r.content,
      updatedAt: r.updatedAt.toISOString(),
      handoverDate: sh.date.toISOString().slice(0, 10),
      shiftNumber: sh.shiftNumber,
      handoverStatus: sh.status,
      projectName: sh.project.name,
    };
  });

  return NextResponse.json(payload);
}
