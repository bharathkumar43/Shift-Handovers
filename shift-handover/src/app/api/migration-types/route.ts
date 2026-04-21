import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

const BUILT_IN_TYPES = [
  { value: "GMAIL_TO_GOOGLE_WORKSPACE",        label: "Gmail → Google Workspace",  productType: "EMAIL" },
  { value: "EXCHANGE_TO_MICROSOFT_365",         label: "Exchange → Microsoft 365",  productType: "EMAIL" },
  { value: "MICROSOFT_365_TO_MICROSOFT_365",    label: "M365 → M365",               productType: "EMAIL" },
  { value: "BOX_TO_SHAREPOINT",                 label: "Box → SharePoint",           productType: "CONTENT" },
  { value: "DROPBOX_TO_SHAREPOINT",             label: "Dropbox → SharePoint",       productType: "CONTENT" },
  { value: "GOOGLE_DRIVE_TO_SHAREPOINT",        label: "Google Drive → SharePoint",  productType: "CONTENT" },
  { value: "SLACK_TO_TEAMS",                    label: "Slack → Teams",              productType: "MESSAGE" },
  { value: "OTHER",                             label: "Other",                      productType: "ALL" },
];

async function ensureBuiltIns() {
  const count = await prisma.migrationTypeOption.count({ where: { isBuiltIn: true } });
  if (count === 0) {
    await prisma.migrationTypeOption.createMany({
      data: BUILT_IN_TYPES.map((t) => ({ ...t, isBuiltIn: true })),
      skipDuplicates: true,
    });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureBuiltIns();

    const { searchParams } = new URL(req.url);
    const productType = searchParams.get("productType");

    const types = await prisma.migrationTypeOption.findMany({
      where: productType
        ? { productType: { in: [productType, "ALL"] } }
        : undefined,
      orderBy: [{ isBuiltIn: "desc" }, { productType: "asc" }, { label: "asc" }],
    });

    return NextResponse.json(types);
  } catch (err) {
    console.error("[migration-types GET]", err);
    return NextResponse.json({ error: "Database not ready — run prisma migrate dev" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { label, productType } = body;

    if (!label?.trim()) return NextResponse.json({ error: "Label is required" }, { status: 400 });
    if (!productType) return NextResponse.json({ error: "Product type is required" }, { status: 400 });

    const value = label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

    const type = await prisma.migrationTypeOption.create({
      data: { value, label: label.trim(), productType, isBuiltIn: false },
    });
    return NextResponse.json(type, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "A migration type with this label already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create migration type" }, { status: 500 });
  }
}
