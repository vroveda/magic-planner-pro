import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    // Client-side guard: check session from supabase storage. SSR returns null and we re-check on mount.
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        throw redirect({ to: "/login", search: { redirect: location.href } });
      }
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const { loading, user } = useAuth();

  useEffect(() => {
    if (!loading && !user && typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, [loading, user]);

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
