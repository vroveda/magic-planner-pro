import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { ArrowRight, MapPin, Calendar, Sparkles, Plane, Clock } from "lucide-react";
import {
  useActiveTrip, useTripParkDays, useParks, useRouteForDay, useRouteItems,
  useAttractionsByIds, useLiveStatusForAttractions, useWaitHistoryForAttractions, useLiveStatusRealtime,
} from "@/lib/queries";
import { computeCondition, conditionMeta } from "@/lib/score";
import { useGeolocationTracking } from "@/lib/geo";
import { CastleIcon } from "@/components/Logo";

export const Route = createFileRoute("/_app/hoje")({
  head: () => ({ meta: [{ title: "Hub da viagem — Genie Hacker" }] }),
  component: HubPage,
});

const todayISO = () => new Date().toISOString().slice(0, 10);

function daysBetween(fromISO: string, toISO: string) {
  const a = new Date(fromISO + "T00:00:00");
  const b = new Date(toISO + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function formatPtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function HubPage() {
  const nav = useNavigate();
  const { data: trip, isLoading } = useActiveTrip();
  const { data: parks = [] } = useParks();
  const { data: days = [] } = useTripParkDays(trip?.id);

  useEffect(() => {
    if (!isLoading && !trip) nav({ to: "/setup" });
  }, [isLoading, trip, nav]);

  const today = todayISO();
  const todayDay = days.find((d) => d.visit_date === today);
  const upcomingDays = useMemo(
    () => [...days].filter((d) => d.visit_date >= today).sort((a, b) => a.visit_date.localeCompare(b.visit_date)),
    [days, today],
  );
  const nextDay = todayDay ?? upcomingDays[0] ?? null;
  const nextPark = nextDay ? parks.find((p) => p.id === nextDay.park_id) ?? null : null;

  // Route data — only meaningful if today is a park day
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
  if (!trip) return null;

  // ----- Mode 1: TODAY is a park day → "empolgação"
  if (todayDay && nextPark) {
    return (
      <main className="px-5 pt-6 max-w-md mx-auto">
        <header className="mb-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{trip.name}</p>
          <h1 className="font-display text-3xl font-bold text-magic">Hoje</h1>
        </header>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-gold p-6 shadow-gold">
          <Sparkles className="absolute top-3 right-4 h-6 w-6 text-magic animate-sparkle" />
          <Sparkles className="absolute bottom-4 left-5 h-4 w-4 text-magic animate-sparkle" style={{ animationDelay: "0.7s" }} />
          <div className="flex items-center gap-2 text-magic/80 text-xs font-extrabold tracking-wider">
            <MapPin className="h-3.5 w-3.5" /> É HOJE!
          </div>
          <h2 className="mt-1 font-display text-3xl font-extrabold text-magic leading-tight">{nextPark.name}</h2>
          <p className="text-magic/80 text-sm mt-1 font-semibold capitalize">{formatPtDate(today)}</p>
          {items.length > 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-magic/10 text-magic px-3 py-1 text-xs font-bold">
              <CastleIcon className="h-3.5 w-3.5" /> {done} de {items.length} atrações feitas
            </p>
          )}
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

        <Link to="/roteiro" className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-magic p-4 font-extrabold text-white shadow-magic">
          Ver roteiro completo <ArrowRight className="h-5 w-5" />
        </Link>
      </main>
    );
  }

  // ----- Mode 2: countdown to next park day (or arrival)
  const arrival = trip.arrival_date ?? null;
  const targetISO = nextDay?.visit_date ?? arrival ?? null;
  const targetLabel = nextPark?.name ?? (arrival ? "Chegada em Orlando" : null);
  const daysLeft = targetISO ? daysBetween(today, targetISO) : null;

  return (
    <main className="px-5 pt-6 max-w-md mx-auto">
      <header className="mb-5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{trip.name}</p>
        <h1 className="font-display text-3xl font-bold text-magic">Hub da viagem</h1>
      </header>

      {targetISO && daysLeft != null ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-magic text-white p-6 shadow-magic">
          <Sparkles className="absolute top-3 right-4 h-5 w-5 text-gold animate-sparkle" />
          <div className="flex items-center gap-2 text-white/70 text-xs font-extrabold tracking-wider">
            {nextPark ? <><MapPin className="h-3.5 w-3.5" /> PRÓXIMO PARQUE</> : <><Plane className="h-3.5 w-3.5" /> SUA CHEGADA</>}
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold">{targetLabel}</h2>
          <p className="text-white/70 text-sm mt-0.5 capitalize">{formatPtDate(targetISO)}</p>

          <div className="mt-5 flex items-end gap-3">
            <span className="font-display text-7xl font-extrabold text-gold leading-none">{daysLeft}</span>
            <span className="pb-2 text-white/85 font-bold">
              {daysLeft === 0 ? "é hoje! ✨" : daysLeft === 1 ? "dia restante" : "dias restantes"}
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-card border border-border p-5 shadow-soft text-center">
          <Calendar className="mx-auto h-10 w-10 text-gold mb-2" />
          <p className="font-bold text-magic">Sem datas configuradas.</p>
          <Link to="/setup" className="mt-3 inline-flex items-center gap-1 rounded-xl bg-gradient-magic text-white px-4 py-2 text-sm font-bold">
            Configurar viagem <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {upcomingDays.length > 0 && (
        <section className="mt-5">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Próximos dias</h3>
          <ul className="space-y-2">
            {upcomingDays.slice(0, 5).map((d) => {
              const p = parks.find((x) => x.id === d.park_id);
              const dl = daysBetween(today, d.visit_date);
              return (
                <li key={d.id} className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3 shadow-soft">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-gold text-magic">
                    <span className="text-base font-extrabold leading-none">{dl}</span>
                    <span className="text-[9px] font-bold leading-none mt-0.5">{dl === 1 ? "DIA" : "DIAS"}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-magic truncate">{p?.name ?? "Parque"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{formatPtDate(d.visit_date)}</p>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Link to="/roteiro" className="mt-5 flex items-center justify-between rounded-2xl bg-gradient-gold p-4 font-extrabold text-magic shadow-gold">
        Ver roteiro completo <ArrowRight className="h-5 w-5" />
      </Link>
    </main>
  );
}
