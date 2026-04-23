import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, must-revalidate" } as const;

export async function GET() {
  const projects = await prisma.project.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      clients: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  return NextResponse.json(projects, { headers: NO_STORE });
}
