import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessDistrict } from "@/lib/auth";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

const VerifySchema = z.object({ official: z.boolean() });

// Marks an algorithmic Alert as agency-endorsed (or reverses that) — a
// human confirmation layered on top of the risk engine's output, not a
// replacement for it. Scoped to the officer's district like report
// moderation, and logged the same way.
export async function POST(req: Request, ctx: RouteContext<"/api/alerts/[id]/verify">) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.alert.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccessDistrict(auth, existing.districtId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const alert = await prisma.alert.update({
    where: { id },
    data: parsed.data.official
      ? { official: true, verifiedByUserId: auth.id, verifiedAt: new Date() }
      : { official: false, verifiedByUserId: null, verifiedAt: null },
  });

  await logAction(
    auth.id,
    parsed.data.official ? "ALERT_MARKED_OFFICIAL" : "ALERT_UNMARKED_OFFICIAL",
    "Alert",
    id,
  );

  return NextResponse.json(alert);
}
