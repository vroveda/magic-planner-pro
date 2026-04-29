import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Crown, Check, SkipForward } from "lucide-react";
import { useActiveTrip, useTripParkDays, useParks, useRouteForDay, useRouteItems, useAttractionsByIds, useLiveStatusForAttractions, useWaitHistoryForAttractions, useMarkVisited, useMarkSkipped } from "@/lib/queries";
import { computeCondition, conditionMeta } from "@/lib/score";

export const Route = createFileRoute("/_app/roteiro")({
  head: () => ({ meta: [{ title: "Roteiro — Genie Hacker" }] }),
  component: RouteList,
});

function RouteList() {
  const nav = useNavigate();
  const { data: trip, isLoading } = useActiveTrip();
  const { data: parks = [] } = useParks();
  const { data: days = [] } = useTripParkDays(trip?.id);

  useEffect(() => { if (!isLoading && !trip) nav({ to: "/setup" }); }, [isLoading, trip, nav]);

  const today = new Date().toISOString().slice(0, 10);
  const day = days.find((d) => d.visit_date === today) ?? days.find((d) => d.is_active_day) ?? days[0];
  const park = day ? parks.find((p) => p.id === day.park_id) : null;
  const { data: route } = useRouteForDay(day?.id);
  const { data: items = [] } = useRouteItems(route?.id);
  const ids = useMemo(() => items.map((i) => i.attraction_id), [items]);
  const { data: attractions = [] } = useAttractionsByIds(ids);
  const { data: live = {} } = useLiveStatusForAttractions(ids);
  const { data: hist = {} } = useWaitHistoryForAttractions(ids);
  const markVisited = useMarkVisited();
  const markSkipped = useMarkSkipped();

  return (
    <main className="px-5 pt-6 max-w-md mx-auto">
      <header className="mb-5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{park?.name ?? "Roteiro"}</p>
        <h1 className="font-display text-3xl font-bold text-magic">Roteiro do dia</h1>
      </header>

      {items.length === 0 && (
        <div className="rounded-3xl bg-card border border-border p-5 text-center">
          <p className="text-muted-foreground">Nenhuma atração no roteiro deste dia.</p>
          <Link to="/setup" className="mt-3 inline-block rounded-xl bg-gradient-magic text-white px-4 py-2 text-sm font-bold">Ajustar viagem</Link>
        </div>
      )}

      <ul className="space-y-3">
        {items.map((item, idx) => {
          const a = attractions.find((x) => x.id === item.attraction_id);
          if (!a) return null;
          const w = live[a.id]?.current_wait_minutes ?? null;
          const h = hist[a.id] ?? null;
          const { condition } = computeCondition(w, h);
          const meta = conditionMeta[condition];
          const done = !!item.visited_at;
          const skipped = !!item.skipped_at;
          return (
            <li key={item.id} className={`rounded-2xl border p-4 ${done ? "bg-success/5 border-success/30" : skipped ? "bg-muted/40 border-border opacity-70" : "bg-card border-border shadow-soft"}`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-display font-bold text-sm ${a.is_must_do ? "bg-gradient-gold text-magic" : "bg-secondary text-magic"}`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to="/atracao/$id" params={{ id: a.id }}>
                    <h3 className={`font-display font-bold text-magic text-base leading-tight ${done ? "line-through" : ""}`}>{a.name}</h3>
                  </Link>
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[10px] font-extrabold">
                    {a.is_must_do && <span className="inline-flex items-center gap-1 rounded-full bg-gradient-gold text-magic px-2 py-0.5"><Crown className="h-3 w-3" /> IMPERDÍVEL</span>}
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${meta.bg} ${meta.color}`}>{meta.emoji} {meta.label}</span>
                    {w != null && <span className="text-muted-foreground">{w} min</span>}
                  </div>
                </div>
              </div>
              {!done && !skipped && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => markVisited.mutate({ itemId: item.id, visited: true })}
                    className="rounded-xl bg-success text-white py-2 text-sm font-bold flex items-center justify-center gap-1">
                    <Check className="h-4 w-4" /> Feito!
                  </button>
                  <button onClick={() => markSkipped.mutate({ itemId: item.id })}
                    className="rounded-xl border border-border bg-card text-magic py-2 text-sm font-bold flex items-center justify-center gap-1">
                    <SkipForward className="h-4 w-4" /> Pular
                  </button>
                </div>
              )}
              {done && <button onClick={() => markVisited.mutate({ itemId: item.id, visited: false })} className="mt-3 text-xs font-bold text-muted-foreground hover:underline">Desfazer</button>}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
