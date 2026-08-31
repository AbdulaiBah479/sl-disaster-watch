import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "DISMISSED"]),
});

// Admin moderation action — gated by session (see app/admin/layout.tsx for
// the page-level gate; this is the API-level gate for the mutation itself).
export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/reports/[id]">,
) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

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
