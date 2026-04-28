import { useApp } from "@/lib/app-state";
import { Sparkles, Crown } from "lucide-react";

export function PlanBadge() {
  const { plan, setUpgradeOpen } = useApp();
  const labels = {
    free: { text: "Free · 3 atrações · 1 parque", icon: Sparkles, cls: "bg-white/15 text-white border-white/30" },
    day: { text: "Day Pass · 1 parque completo", icon: Crown, cls: "bg-gold text-gold-foreground border-gold" },
    trip: { text: "Trip Pass · todos os parques", icon: Crown, cls: "bg-gradient-gold text-gold-foreground border-transparent" },
  } as const;
  const c = labels[plan];
  const Icon = c.icon;
  return (
    <button
      onClick={() => plan === "free" && setUpgradeOpen(true)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur-md transition active:scale-95 ${c.cls}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {c.text}
    </button>
  );
}
