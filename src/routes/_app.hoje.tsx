import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { ArrowRight, MapPin, Calendar } from "lucide-react";
import { useActiveTrip, useTripParkDays, useParks, useRouteForDay, useRouteItems, useAttractionsByIds, useLiveStatusForAttractions, useWaitHistoryForAttractions, useLiveStatusRealtime } from "@/lib/queries";
import { computeCondition, conditionMeta } from "@/lib/score";
import { useGeolocationTracking } from "@/lib/geo";

export const Route = createFileRoute("/_app/hoje")({
  head: () => ({ meta: [{ title: "Hoje — Genie Hacker" }] }),
  component: TodayPage,
});

function TodayPage() {
  const nav = useNavigate();
  const { data: trip, isLoading } = useActiveTrip();
  const { data: parks = [] } = useParks();
  const { data: days = [] } = useTripParkDays(trip?.id);

  useEffect(() => {
    if (!isLoading && !trip) nav({ to: "/setup" });
  }, [isLoading, trip, nav]);

  const today = new Date().toISOString().slice(0, 10);
  const todayDay = days.find((d) => d.visit_date === today) ?? days.find((d) => d.is_active_day) ?? days[0];
  const park = todayDay ? parks.find((p) => p.id === todayDay.park_id) : null;

  const { data: route } = useRouteForDay(todayDay?.id);
  const { data: items = [] } = useRouteItems(route?.id);
  const ids = useMemo(() => items.map((i) => i.attraction_id), [items]);
  const { data: attractions = [] } = useAttractionsByIds(ids);
  const { data: live = {} } = useLiveStatusForAttractions(ids);
  const { data: hist = {} } = useWaitHistoryForAttractions(ids);
  useLiveStatusRealtime(ids);
  useGeolocationTracking({ days, attractions });

  const next = items.find((i) => !i.visited_at && !i.skipped_at);
  const nextAttr = next ? attractions.find((a) => a.id === next.attraction_id) : null;
  const done = items.filter((i) => i.visited_at).length;

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Carregando…</div>;

  return (
    <main className="px-5 pt-6 max-w-md mx-auto">
      <header className="mb-5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{trip?.name}</p>
        <h1 className="font-display text-3xl font-bold text-magic">Hoje</h1>
      </header>

      {!todayDay && (
        <div className="rounded-3xl bg-card border border-border p-5 shadow-soft text-center">
          <Calendar className="mx-auto h-10 w-10 text-gold mb-2" />
          <p className="font-bold text-magic">Sem parque programado para hoje.</p>
          <p className="text-sm text-muted-foreground mt-1">Veja seus próximos dias no roteiro.</p>
          <Link to="/roteiro" className="mt-4 inline-flex items-center gap-1 rounded-xl bg-gradient-magic text-white px-4 py-2 text-sm font-bold">
            Ver roteiro <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {todayDay && park && (
        <>
          <div className="rounded-3xl bg-gradient-magic text-white p-5 shadow-magic">
            <div className="flex items-center gap-2 text-white/70 text-xs font-bold mb-1">
              <MapPin className="h-3.5 w-3.5" /> PARQUE DO DIA
            </div>
            <h2 className="font-display text-2xl font-bold">{park.name}</h2>
            <p className="text-white/75 text-sm mt-1">{done} de {items.length} atrações feitas</p>
          </div>

          {nextAttr && next && (() => {
            const w = live[next.attraction_id]?.current_wait_minutes ?? null;
            const h = hist[next.attraction_id] ?? null;
            const { condition } = computeCondition(w, h);
            const meta = conditionMeta[condition];
            return (
              <Link to="/atracao/$id" params={{ id: nextAttr.id }} className="mt-4 block rounded-3xl bg-card border border-border p-5 shadow-soft">
                <p className="text-xs font-bold text-muted-foreground">PRÓXIMA ATRAÇÃO</p>
                <h3 className="font-display text-xl font-bold text-magic mt-1">{nextAttr.name}</h3>
                <div className="mt-2 flex items-center gap-2 text-xs font-bold">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${meta.bg} ${meta.color}`}>
                    {meta.emoji} {meta.label}
                  </span>
                  <span className="text-muted-foreground">{w != null ? `${w} min agora` : "Sem dados ao vivo"}</span>
                </div>
                {nextAttr.strategic_tip && <p className="mt-2 text-sm text-foreground/80"><span className="font-bold text-magic">Dica:</span> {nextAttr.strategic_tip}</p>}
              </Link>
            );
          })()}

          <Link to="/roteiro" className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-gold p-4 font-extrabold text-magic shadow-gold">
            Ver roteiro completo <ArrowRight className="h-5 w-5" />
          </Link>
        </>
      )}
    </main>
  );
}
