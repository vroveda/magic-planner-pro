import { Link, useLocation } from "@tanstack/react-router";
import { Home, ListChecks, Activity, Bell, Settings } from "lucide-react";

const items = [
  { to: "/hoje", label: "Hoje", icon: Home },
  { to: "/roteiro", label: "Roteiro", icon: ListChecks },
  { to: "/filas", label: "Filas", icon: Activity },
  { to: "/alertas", label: "Alertas", icon: Bell },
  { to: "/config", label: "Config", icon: Settings },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition ${
                  active ? "text-magic" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "scale-110" : ""}`} strokeWidth={active ? 2.6 : 2} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
