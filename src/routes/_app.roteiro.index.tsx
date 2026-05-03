import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Calendar, Check, ChevronRight, ListChecks } from "lucide-react";
import { useActiveTrip, useTripParkDays, useParks, useRoutesForDays } from "@/lib/queries";

export const Route = createFileRoute("/_app/roteiro/")({
  head: () => ({ meta: [{ title: "Roteiro — Genie Hacker" }] }),
  component: RoteiroIndex,
});

function RoteiroIndex() {
  const nav = useNavigate();
  const { data: trip, isLoading } = useActiveTrip();
  const { data: parks = [] } = useParks();
  const { data: days = [] } = useTripParkDays(trip?.id);
  const dayIds = days.map((d) => d.id);
  const { data: routesByDay = {} } = useRoutesForDays(dayIds);

  useEffect(() => { if (!isLoading && !trip) nav({ to: "/setup" }); }, [isLoading, trip, nav]);

  const today = new Date().toISOString().slice(0, 10);

  function fmt(iso: string) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  }

  return (
    <main className="px-5 pt-6 max-w-md mx-auto pb-32">
      <header className="mb-5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sua viagem</p>
        <h1 className="font-display text-3xl font-bold text-magic">Roteiro</h1>
        <p className="text-xs text-muted-foreground mt-1">Defina as atrações de cada dia.</p>
      </header>

      {days.length === 0 && (
        <div className="rounded-3xl bg-card border border-border p-5 text-center">
          <p className="text-muted-foreground">Você ainda não escolheu parques.</p>
          <Link to="/setup" className="mt-3 inline-block rounded-xl bg-gradient-magic text-white px-4 py-2 text-sm font-bold">Configurar viagem</Link>
        </div>
      )}

      <ul className="space-y-3">
        {days.map((d) => {
          const park = parks.find((p) => p.id === d.park_id);
          const r = routesByDay[d.id];
          const hasRoute = (r?.itemCount ?? 0) > 0;
          const isToday = d.visit_date === today;
          return (
            <li key={d.id}>
              <Link to="/roteiro/$dayId" params={{ dayId: d.id }}
                className={`flex items-center gap-3 rounded-2xl border p-4 transition ${isToday ? "bg-gradient-magic text-white border-magic shadow-magic" : "bg-card border-border shadow-soft"}`}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isToday ? "bg-white/15" : "bg-secondary"}`}>
                  <Calendar className={`h-6 w-6 ${isToday ? "text-white" : "text-magic"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-display font-bold text-base leading-tight ${isToday ? "text-white" : "text-magic"}`}>{park?.name ?? "Parque"}</p>
                  <p className={`text-xs font-bold ${isToday ? "text-white/80" : "text-muted-foreground"}`}>
                    {fmt(d.visit_date)}{isToday && " • HOJE"}
                  </p>
                  <div className="mt-1.5">
                    {hasRoute ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isToday ? "bg-white/20 text-white" : "bg-success/15 text-success"}`}>
                        <Check className="h-3 w-3" /> Roteiro definido • {r!.itemCount} atrações
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isToday ? "bg-gradient-gold text-magic" : "bg-warning/15 text-warning"}`}>
                        <ListChecks className="h-3 w-3" /> Definir roteiro
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 shrink-0 ${isToday ? "text-white" : "text-muted-foreground"}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
