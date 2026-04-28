import { Link, useLocation } from "@tanstack/react-router";
import { Home, ListChecks, Activity, Bell, Send } from "lucide-react";

const items = [
  { to: "/parques", label: "Parques", icon: Home },
  { to: "/roteiro", label: "Roteiro", icon: ListChecks },
  { to: "/filas", label: "Filas", icon: Activity },
  { to: "/alertas", label: "Alertas", icon: Bell },
  { to: "/telegram", label: "Telegram", icon: Send },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        {items.map(({ to, label, icon: Icon }) => {
          const active = loc.pathname === to || (to !== "/parques" && loc.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-bold transition ${
                active ? "text-magic" : "text-muted-foreground"
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${active ? "bg-gradient-gold shadow-gold" : ""}`}>
                <Icon className={`h-4.5 w-4.5 ${active ? "text-magic" : ""}`} strokeWidth={active ? 2.5 : 2} />
              </div>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
