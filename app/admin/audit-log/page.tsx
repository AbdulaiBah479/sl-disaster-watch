import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin/audit-log");
  if (user.role !== "ADMIN") redirect("/admin");

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <Link href="/admin" className="text-xs underline text-muted">
          ← Back to report moderation
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Audit Log</h1>
        <p className="mt-1 text-sm text-muted">
          Every moderation and verification action taken through /admin — who, what, when. Append-only.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted" style={{ borderColor: "var(--border-strong)" }}>
          No actions logged yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg surface-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-muted" style={{ borderColor: "var(--border)" }}>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Who</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Target</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-2 text-xs text-muted">{formatDateTime(e.createdAt)}</td>
                  <td className="px-4 py-2 text-xs">{e.user.email}</td>
                  <td className="px-4 py-2 text-xs font-medium">{e.action}</td>
                  <td className="px-4 py-2 text-xs text-muted">
                    {e.targetType} · {e.targetId.slice(0, 10)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
