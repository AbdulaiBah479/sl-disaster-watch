import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ReportSchema = z.object({
  districtId: z.string().min(1),
  settlementId: z.string().min(1).optional(),
  category: z.enum([
    "EARTHQUAKE",
    "TSUNAMI",
    "LANDSLIDE",
    "FLOOD_RIVER",
    "FLOOD_COASTAL",
    "DROUGHT",
    "WILDFIRE",
    "STORM_WIND",
    "AIR_QUALITY",
    "EPIDEMIC_HUMAN",
    "EPIDEMIC_ANIMAL",
    "CROP_PEST_DISEASE",
    "MARINE_HAZARD",
  ]),
  reporterName: z.string().max(120).optional(),
  contact: z.string().max(120).optional(),
  description: z.string().min(5).max(2000),
  lat: z.number().optional(),
  lon: z.number().optional(),
});

// Ushahidi-style citizen incident reporting: anyone can submit a ground
// report tagged to a district and hazard category. Reports start PENDING
// and are surfaced separately from the algorithmic risk scores until
// reviewed, so unverified reports never silently move official risk levels.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const district = await prisma.district.findUnique({
    where: { id: parsed.data.districtId },
  });
  if (!district) {
    return NextResponse.json({ error: "Unknown district" }, { status: 400 });
  }

  const report = await prisma.citizenReport.create({ data: parsed.data });
  return NextResponse.json(report, { status: 201 });
}

// Admin-only: lists reporter name/contact (PII) alongside every report.
export async function GET(req: Request) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const reports = await prisma.citizenReport.findMany({
    where: status ? { status: status as "PENDING" | "VERIFIED" | "DISMISSED" } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { district: true, settlement: true },
  });
  return NextResponse.json(reports);
}
