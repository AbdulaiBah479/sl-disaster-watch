import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEVERITY_RANK: Record<string, number> = { RED: 3, ORANGE: 2, YELLOW: 1, GREEN: 0 };

export async function GET() {
  const alerts = await prisma.alert.findMany({
    where: { active: true },
    orderBy: { issuedAt: "desc" },
    include: { district: true, settlement: true },
  });
  alerts.sort((a, b) => SEVERITY_RANK[b.level] - SEVERITY_RANK[a.level]);
  return NextResponse.json(alerts);
}
