import { useApp } from "@/lib/app-state";
import { X, Check, Sparkles, Crown } from "lucide-react";

export function UpgradeModal() {
  const { upgradeOpen, setUpgradeOpen, setPlan } = useApp();
  if (!upgradeOpen) return null;

  const plans = [
    { id: "free" as const, name: "Free", price: "R$ 0", features: ["3 atrações", "1 parque", "Alertas básicos"], highlight: false },
    { id: "day" as const, name: "Day Pass", price: "$9.99", features: ["1 parque completo", "Atrações ilimitadas", "Alertas Telegram"], highlight: true },
    { id: "trip" as const, name: "Trip Pass", price: "$29.99", features: ["Todos os 4 parques", "7 dias", "Alertas prioritários", "Roteiros premium"], highlight: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-magic/70 backdrop-blur-sm p-3 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-card shadow-magic max-h-[92vh] overflow-y-auto">
        <div className="relative bg-gradient-magic px-6 pt-7 pb-8 rounded-t-3xl text-white">
          <button onClick={() => setUpgradeOpen(false)} className="absolute top-3 right-3 p-2 rounded-full bg-white/15 hover:bg-white/25">
            <X className="h-4 w-4" />
          </button>
          <Sparkles className="h-7 w-7 text-gold mb-2 animate-sparkle" />
          <h2 className="font-display text-2xl font-bold">Aproveite mais da sua viagem</h2>
          <p className="text-white/75 text-sm mt-1">Desbloqueie atrações ilimitadas e alertas em tempo real.</p>
        </div>

        <div className="p-4 space-y-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-2xl border-2 p-4 transition ${
                p.highlight ? "border-gold bg-gold/5 shadow-gold" : "border-border bg-card"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-gradient-gold px-2.5 py-0.5 text-[10px] font-extrabold text-magic">
                  <Crown className="h-3 w-3" /> MAIS POPULAR
                </span>
              )}
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="font-display font-bold text-lg text-magic">{p.name}</h3>
                <div className="font-display font-bold text-xl text-magic">{p.price}</div>
              </div>
              <ul className="space-y-1.5 mb-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                    <Check className="h-4 w-4 text-success shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setPlan(p.id); setUpgradeOpen(false); }}
                className={`w-full rounded-xl py-2.5 text-sm font-bold transition active:scale-[0.98] ${
                  p.highlight ? "bg-gradient-magic text-white shadow-magic" : "bg-secondary text-magic hover:bg-secondary/70"
                }`}
              >
                {p.id === "free" ? "Continuar grátis" : "Assinar agora"}
              </button>
            </div>
          ))}
          <p className="text-center text-[11px] text-muted-foreground pt-1">MVP — pagamento ainda não habilitado</p>
        </div>
      </div>
    </div>
  );
}
