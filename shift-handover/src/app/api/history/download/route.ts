import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { dateParamToDbDate } from "@/lib/db-date";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

function shiftLabel(n: number): string {
  if (n === 1) return "Shift 1 (Morning)";
  if (n === 2) return "Shift 2 (Afternoon)";
  if (n === 3) return "Shift 3 (Night)";
  return `Shift ${n}`;
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    COMPLETE: "Complete",
    IN_PROGRESS: "In Progress",
    PENDING: "Pending",
    DELTA: "Delta",
    NA: "N/A",
  };
  return map[s] ?? s;
}

function formatDate(iso: string): string {
  return new Date(iso.substring(0, 10) + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const projectId = searchParams.get("projectId");
  const shiftNumber = searchParams.get("shiftNumber");

  if (!startDate && !endDate) {
    return NextResponse.json({ error: "Missing date parameters" }, { status: 400 });
  }

  const where: Record<string, unknown> = {};

  if (startDate && endDate) {
    where.date = { gte: dateParamToDbDate(startDate), lte: dateParamToDbDate(endDate) };
  } else if (startDate) {
    where.date = { gte: dateParamToDbDate(startDate) };
  } else if (endDate) {
    where.date = { lte: dateParamToDbDate(endDate) };
  }

  if (projectId) where.projectId = projectId;
  if (shiftNumber) where.shiftNumber = parseInt(shiftNumber);

  const handovers = await prisma.shiftHandover.findMany({
    where,
    include: {
      project: true,
      lead: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      entries: {
        include: {
          client: true,
          engineer: { select: { id: true, name: true } },
          engineerWorkedBy: { select: { id: true, name: true } },
          filledBy: { select: { id: true, name: true } },
        },
        orderBy: { client: { name: "asc" } },
      },
    },
    orderBy: [{ date: "desc" }, { shiftNumber: "asc" }],
  });

  const HEADER = [
    "Date",
    "Project",
    "Shift",
    "Handover Status",
    "Lead",
    "Client",
    "Tickets",
    "Status",
    "Engineer Worked",
    "Issues",
    "Updates",
    "Engineer Notes",
    "Manager Notes",
    "Next Shift Engineer",
    "Filled By",
  ];

  const COL_WIDTHS = [18, 22, 24, 16, 18, 20, 30, 14, 20, 30, 30, 30, 30, 20, 18];

  const wb = XLSX.utils.book_new();

  // One sheet per project so the file is readable when multiple projects are included
  const byProject = new Map<string, typeof handovers>();
  for (const h of handovers) {
    const key = h.project.name;
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key)!.push(h);
  }

  if (byProject.size === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["No handover data found for the selected filters."]]);
    XLSX.utils.book_append_sheet(wb, ws, "No Data");
  } else {
    for (const [projectName, rows] of byProject) {
      const data: (string | null)[][] = [HEADER];

      for (const h of rows) {
        const dateStr = formatDate(h.date.toISOString());
        const shift = shiftLabel(h.shiftNumber);
        const hStatus = h.status === "SUBMITTED" ? "Submitted" : "Draft";
        const lead = h.lead?.name ?? "";

        for (const entry of h.entries) {
          data.push([
            dateStr,
            projectName,
            shift,
            hStatus,
            lead,
            entry.client.name,
            entry.tickets ?? "",
            statusLabel(entry.status),
            entry.engineerWorkedBy?.name ?? entry.engineerWorked ?? "",
            entry.issues ?? "",
            entry.updates ?? "",
            entry.handoverNotes ?? "",
            entry.managerNotes ?? "",
            entry.engineer?.name ?? "",
            entry.filledBy?.name ?? "",
          ]);
        }

        if (h.leadNotes) {
          data.push([
            dateStr,
            projectName,
            shift,
            hStatus,
            lead,
            "— Lead Notes —",
            h.leadNotes,
            "", "", "", "", "", "", "", "",
          ]);
        }

        // blank separator row between shifts
        data.push(Array(HEADER.length).fill("") as string[]);
      }

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = COL_WIDTHS.map((wch) => ({ wch }));

      // Bold header row
      const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
        if (cell) cell.s = { font: { bold: true } };
      }

      const sheetName = projectName.slice(0, 31).replace(/[:/\\?[\]*]/g, "_");
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  }

  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const fileDatePart = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
  const filename = `handover-${fileDatePart}.xlsx`;

  return new NextResponse(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
