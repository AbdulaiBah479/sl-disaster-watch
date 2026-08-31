import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");

  return (
    <div>
      <div className="mx-auto flex max-w-4xl items-center justify-end gap-3 px-4 pt-4 sm:px-6">
        <span className="text-xs text-muted">Signed in as {user.email}</span>
        <LogoutButton />
      </div>
      {children}
    </div>
  );
}
