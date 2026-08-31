import { prisma } from "@/lib/prisma";

// Append-only — call this from every route that mutates something an
// institution would care about (report moderation, alert verification,
// user provisioning). See AuditLog in prisma/schema.prisma.
export async function logAction(
  userId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      targetType,
      targetId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
