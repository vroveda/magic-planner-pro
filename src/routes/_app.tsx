import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { loading, user } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user && typeof window !== "undefined") {
      nav({ to: "/login", search: { redirect: location.href }, replace: true });
    }
  }, [loading, user, nav, location.href]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <div className="text-2xl animate-pulse">✨ Carregando…</div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen pb-20">
      <Outlet />
      <BottomNav />
    </div>
  );
}
