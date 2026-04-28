import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Lightbulb, Crown, Star } from "lucide-react";
import { getPark, simulateWait } from "@/lib/parks";
import { useApp } from "@/lib/app-state";
import { PlanBadge } from "@/components/PlanBadge";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/roteiro")({
  head: () => ({ meta: [{ title: "Roteiro do dia — Genie Hacker" }, { name: "description", content: "Roteiro otimizado de atrações imperdíveis para o seu dia na Disney." }] }),
  component: Itinerary,
});

function Itinerary() {
  const { selectedPark, selectedDate, monitored, toggleMonitor } = useApp();
  const nav = useNavigate();
  const park = selectedPark ? getPark(selectedPark) : null;

  useEffect(() => { if (!park) nav({ to: "/parques" }); }, [park, nav]);
  if (!park) return null;

  const dateLabel = new Date(selectedDate + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main className="min-h-screen pb-32">
      <header className="sticky top-0 z-30 bg-gradient-magic text-white px-5 pt-5 pb-5 rounded-b-3xl shadow-magic">
        <div className="flex items-center justify-between mb-3">
          <Logo size="sm" />
          <PlanBadge />
        </div>
        <div className="flex items-center gap-2 text-3xl">
          <span>{park.emoji}</span>
          <h1 className="font-display text-2xl font-bold">{park.name}</h1>
        </div>
        <p className="text-white/70 text-sm mt-0.5 capitalize">{dateLabel}</p>
      </header>

      <section className="px-4 pt-5 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <Lightbulb className="h-4 w-4 text-gold" />
          <span className="font-semibold">Roteiro inteligente — siga a ordem para minimizar filas.</span>
        </div>

        {park.attractions.map((a, idx) => {
          const wait = simulateWait(a.baseWait);
          const isMon = monitored.has(a.id);
          const imperdivel = a.priority === "imperdivel";
          return (
            <article key={a.id} className="rounded-2xl bg-card border border-border p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-display font-bold text-sm ${imperdivel ? "bg-gradient-gold text-magic" : "bg-secondary text-magic"}`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-magic text-base leading-tight">{a.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {imperdivel ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-gold text-magic text-[10px] font-extrabold px-2 py-0.5">
                        <Crown className="h-3 w-3" /> IMPERDÍVEL
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-magic text-[10px] font-extrabold px-2 py-0.5">
                        <Star className="h-3 w-3" /> RECOMENDADA
                      </span>
                    )}
                    <span className={`inline-flex items-center rounded-full text-[10px] font-extrabold px-2 py-0.5 ${
                      wait > a.baseWait * 1.15 ? "bg-danger/15 text-danger" : wait < a.baseWait * 0.9 ? "bg-success/15 text-success" : "bg-warning/20 text-warning"
                    }`}>
                      🕒 {wait} min agora
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm text-foreground/80 leading-snug">
                <span className="font-bold text-magic">Dica:</span> {a.tip}
              </p>

              <button
                onClick={() => toggleMonitor(a.id)}
                className={`mt-3 w-full rounded-xl py-2.5 text-sm font-bold transition active:scale-[0.98] ${
                  isMon
                    ? "bg-magic text-white shadow-magic"
                    : "bg-secondary text-magic hover:bg-secondary/70 border border-border"
                }`}
              >
                {isMon ? "✓ Monitorando" : "+ Monitorar"}
              </button>
            </article>
          );
        })}
      </section>

      <div className="fixed bottom-16 inset-x-0 z-30 px-3 pb-2">
        <Link
          to="/filas"
          className="flex w-full max-w-md mx-auto items-center justify-between gap-2 rounded-2xl bg-gradient-magic py-3.5 px-5 text-sm font-extrabold text-white shadow-magic active:scale-[0.98]"
        >
          <span>{monitored.size} {monitored.size === 1 ? "atração monitorada" : "atrações monitoradas"}</span>
          <span className="flex items-center gap-1">Ver alertas <ArrowRight className="h-4 w-4" /></span>
        </Link>
      </div>

      <BottomNav />
    </main>
  );
}
