import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-xl font-bold">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Institutional access — report moderation and admin tools.</p>
      <LoginForm next={next && next.startsWith("/") ? next : "/admin"} />
    </div>
  );
}
