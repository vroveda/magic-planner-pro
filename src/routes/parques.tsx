import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Calendar } from "lucide-react";
import { PARKS } from "@/lib/parks";
import { useApp } from "@/lib/app-state";
import { Logo } from "@/components/Logo";
import { PlanBadge } from "@/components/PlanBadge";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/parques")({
  head: () => ({ meta: [{ title: "Escolha o parque — Genie Hacker" }, { name: "description", content: "Selecione o parque Disney que você vai visitar hoje." }] }),
  component: ParkSelect,
});

function ParkSelect() {
  const { selectedDate, setSelectedDate, setSelectedPark, plan, parksUsed, setUpgradeOpen } = useApp();
  const [picked, setPicked] = useState<string | null>(null);
  const nav = useNavigate();

  const choose = (slug: string) => {
    if (plan === "free" && parksUsed.size >= 1 && !parksUsed.has(slug)) {
      setUpgradeOpen(true);
      return;
    }
    setPicked(slug);
  };

  const go = () => {
    if (!picked) return;
    setSelectedPark(picked);
    nav({ to: "/roteiro" });
  };

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-gradient-magic text-white px-5 pt-5 pb-6 rounded-b-3xl shadow-magic">
        <div className="flex items-center justify-between mb-5">
          <Logo size="sm" />
          <PlanBadge />
        </div>
        <h1 className="font-display text-2xl font-bold leading-tight">
          Qual parque você vai visitar hoje?
        </h1>
        <p className="text-white/70 text-sm mt-1">Escolha um parque para ver o roteiro otimizado.</p>
      </header>

      <section className="px-4 pt-5 grid grid-cols-2 gap-3">
        {PARKS.map((p) => {
          const isPicked = picked === p.slug;
          return (
            <button
              key={p.slug}
              onClick={() => choose(p.slug)}
              className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left transition active:scale-[0.97] ${
                isPicked ? "border-gold bg-gold/10 shadow-gold" : "border-border bg-card hover:border-magic/40"
              }`}
            >
              <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br ${p.hue} opacity-20 blur-xl`} />
              <div className="text-4xl mb-2">{p.emoji}</div>
              <div className="font-display font-bold text-magic text-base leading-tight">{p.name}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{p.attractions.length} atrações</div>
              {isPicked && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-gold flex items-center justify-center text-magic text-xs font-bold">✓</div>
              )}
            </button>
          );
        })}
      </section>

      <section className="px-4 pt-5">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data da visita</span>
          <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-soft">
            <Calendar className="h-5 w-5 text-magic" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 bg-transparent text-sm font-semibold text-magic outline-none"
            />
          </div>
        </label>
      </section>

      <div className="fixed bottom-20 inset-x-0 z-30 px-4 pb-2">
        <button
          onClick={go}
          disabled={!picked}
          className="group flex w-full max-w-md mx-auto items-center justify-center gap-2 rounded-2xl bg-gradient-magic py-4 text-base font-extrabold text-white shadow-magic transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
        >
          Ver roteiro e filas
          <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
        </button>
      </div>

      <BottomNav />
    </main>
  );
}
