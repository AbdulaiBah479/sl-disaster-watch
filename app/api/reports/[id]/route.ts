import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessDistrict } from "@/lib/auth";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "DISMISSED"]),
});

// Admin moderation action — gated by session (see app/admin/layout.tsx for
// the page-level gate; this is the API-level gate for the mutation itself),
// scoped to the officer's own district if they're a DISTRICT_OFFICER, and
// recorded to AuditLog either way.
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

  const existing = await prisma.citizenReport.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccessDistrict(auth, existing.districtId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const report = await prisma.citizenReport.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  await logAction(auth.id, `REPORT_${parsed.data.status}`, "CitizenReport", id, {
    from: existing.status,
    to: parsed.data.status,
  });

  return NextResponse.json(report);
}
