import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "DISMISSED"]),
});

// Admin moderation action. This demo has no auth layer (see /admin) — in a
// production deployment this route would sit behind an authenticated role
// check before the status mutation below.
export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/reports/[id]">,
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const report = await prisma.citizenReport.update({
    where: { id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json(report);
}
