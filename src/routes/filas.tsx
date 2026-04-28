import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Zap, MapPin } from "lucide-react";
import { PARKS, simulateWait, trend, context, nextLLSlot } from "@/lib/parks";
import { useApp } from "@/lib/app-state";
import { PlanBadge } from "@/components/PlanBadge";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/filas")({
  head: () => ({ meta: [{ title: "Filas em tempo real — Genie Hacker" }, { name: "description", content: "Acompanhe as filas das suas atrações monitoradas em tempo real." }] }),
  component: Queues,
});

function Queues() {
  const { monitored, selectedPark } = useApp();
  const [tick, setTick] = useState(0);
  const [updated, setUpdated] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => { setTick((t) => t + 1); setUpdated(new Date()); }, 30000);
    return () => clearInterval(i);
  }, []);

  const park = useMemo(() => PARKS.find((p) => p.slug === selectedPark) ?? PARKS[0], [selectedPark]);
  const items = useMemo(() => {
    const all = PARKS.flatMap((p) => p.attractions.map((a) => ({ ...a, park: p })));
    return all.filter((a) => monitored.has(a.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitored, tick]);

  const refresh = () => { setTick((t) => t + 1); setUpdated(new Date()); };

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-gradient-magic text-white px-5 pt-5 pb-5 rounded-b-3xl shadow-magic">
        <div className="flex items-center justify-between mb-3">
          <Logo size="sm" />
          <PlanBadge />
        </div>
        <h1 className="font-display text-2xl font-bold">Filas agora</h1>
        <p className="text-white/70 text-sm">{park.emoji} {park.name}</p>
        <div className="flex items-center justify-between mt-3 text-[11px] text-white/60">
          <span>Atualizado às {updated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          <button onClick={refresh} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 font-bold backdrop-blur active:scale-95">
            <RefreshCw className="h-3 w-3" /> Atualizar
          </button>
        </div>
      </header>

      <section className="px-4 pt-5 space-y-3">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          items.map((a) => {
            const wait = simulateWait(a.baseWait);
            const tr = trend(wait, a.baseWait);
            const ctx = context(wait, a.baseWait);
            const ll = Math.random() > 0.35;
            const slot = ll ? nextLLSlot() : null;

            return (
              <article key={a.id} className="rounded-2xl bg-card border border-border p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{a.park.shortName}</div>
                    <h3 className="font-display font-bold text-magic text-base leading-tight mt-0.5">{a.name}</h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold text-3xl text-magic leading-none">{wait}<span className="text-sm font-bold text-muted-foreground"> min</span></div>
                    <TrendIcon t={tr} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <ContextBadge c={ctx} />
                  {ll ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-gold text-magic text-[10px] font-extrabold px-2 py-0.5">
                      <Zap className="h-3 w-3 fill-magic" /> LL · próximo: {slot}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground text-[10px] font-extrabold px-2 py-0.5">
                      <Zap className="h-3 w-3" /> LL esgotado
                    </span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>

      <BottomNav />
    </main>
  );
}

function TrendIcon({ t }: { t: "up" | "down" | "stable" }) {
  if (t === "up") return <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-danger"><TrendingUp className="h-3 w-3" /> subindo</span>;
  if (t === "down") return <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-success"><TrendingDown className="h-3 w-3" /> caindo</span>;
  return <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-muted-foreground"><Minus className="h-3 w-3" /> estável</span>;
}

function ContextBadge({ c }: { c: "below" | "avg" | "above" }) {
  const map = {
    below: { txt: "🟢 Abaixo da média", cls: "bg-success/15 text-success" },
    avg: { txt: "🟡 Na média", cls: "bg-warning/20 text-warning" },
    above: { txt: "🔴 Acima da média", cls: "bg-danger/15 text-danger" },
  } as const;
  const v = map[c];
  return <span className={`inline-flex items-center rounded-full text-[10px] font-extrabold px-2 py-0.5 ${v.cls}`}>{v.txt}</span>;
}

function EmptyState() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border bg-card/50 p-8 text-center">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-gold animate-float">
        <MapPin className="h-7 w-7 text-magic" />
      </div>
      <h3 className="font-display font-bold text-lg text-magic">Nenhuma atração monitorada</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">Vá ao Roteiro e ative o monitoramento das suas favoritas.</p>
      <Link to="/roteiro" className="inline-flex rounded-xl bg-gradient-magic px-5 py-2.5 text-sm font-bold text-white shadow-magic active:scale-95">
        Abrir Roteiro
      </Link>
    </div>
  );
}
