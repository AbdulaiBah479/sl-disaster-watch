import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const disasters = await prisma.historicalDisaster.findMany({
    orderBy: { date: "desc" },
    include: { district: true },
  });
  return NextResponse.json(disasters);
}
