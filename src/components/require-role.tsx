import { useEffect, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useAuth, dashboardPathFor, type Role } from "@/lib/auth";

export function RequireRole({
  allow,
  children,
}: {
  allow: Role[];
  children: ReactNode;
}) {
  const { user, roles, primaryRole, loading } = useAuth();
  const router = useRouter();

  const allowed = roles.some((r) => allow.includes(r));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.navigate({ to: "/login" });
      return;
    }
    if (!allowed) {
      router.navigate({ to: dashboardPathFor(primaryRole) });
    }
  }, [loading, user, allowed, primaryRole, router]);

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user || !allowed) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Redirecting…</div>
      </div>
    );
  }

  return <>{children}</>;
}
