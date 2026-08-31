import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface SubscribeBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  districtId?: string | null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as SubscribeBody;
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    update: { p256dh: body.keys.p256dh, auth: body.keys.auth, districtId: body.districtId ?? null },
    create: {
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      districtId: body.districtId ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
