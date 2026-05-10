import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  ArrowRight, MapPin, Calendar, Sparkles, Plane, Clock,
  Zap, AlertTriangle, Navigation, SkipForward, CheckCircle2, HelpCircle,
} from "lucide-react";
import {
  useActiveTrip, useTripParkDays, useParks, useRouteForDay, useRouteItems,
  useAttractionsByIds, useLiveStatusForAttractions, useWaitHistoryForAttractions,
  useLiveStatusRealtime, useWalkMatrixForAttractions,
} from "@/lib/queries";
import { useGeolocationTracking } from "@/lib/geo";
import { CastleIcon } from "@/components/Logo";
import {
  generateSmartRecommendations,
  type SmartRecommendation,
  type AttractionInput,
} from "@/lib/recommendations";

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

// ---------- card de recomendação ----------

const REC_STYLES: Record<SmartRecommendation["type"], {
  bg: string; border: string; icon: typeof Zap; iconColor: string;
}> = {
  go_now:             { bg: "bg-gradient-magic", border: "border-magic",   icon: Zap,           iconColor: "text-gold" },
  nearby_opportunity: { bg: "bg-gradient-magic", border: "border-magic",   icon: Navigation,    iconColor: "text-gold" },
  route_adjustment:   { bg: "bg-card",           border: "border-warning", icon: AlertTriangle, iconColor: "text-warning" },
  wait_later:         { bg: "bg-card",           border: "border-border",  icon: Clock,         iconColor: "text-muted-foreground" },
  skip_for_now:       { bg: "bg-card",           border: "border-border",  icon: SkipForward,   iconColor: "text-muted-foreground" },
  closed:             { bg: "bg-muted/40",       border: "border-border",  icon: AlertTriangle, iconColor: "text-danger" },
  unknown:            { bg: "bg-card",           border: "border-border",  icon: HelpCircle,    iconColor: "text-muted-foreground" },
};

const URGENCY_BADGE: Record<SmartRecommendation["urgency"], string> = {
  high:   "bg-danger/20 text-danger",
  medium: "bg-warning/20 text-warning",
  low:    "bg-secondary text-muted-foreground",
};

const URGENCY_LABEL: Record<SmartRecommendation["urgency"], string> = {
  high: "Urgente", medium: "Atenção", low: "Dica",
};

function RecCard({ rec, primary }: { rec: SmartRecommendation; primary: boolean }) {
  const style = REC_STYLES[rec.type];
  const Icon = style.icon;
  const isGradient = style.bg.includes("gradient");

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-soft ${style.bg} ${style.border} ${primary ? "shadow-magic" : ""}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isGradient ? "bg-white/15" : "bg-secondary"}`}>
            <Icon className={`h-5 w-5 ${isGradient ? "text-white" : style.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isGradient ? "bg-white/20 text-white" : URGENCY_BADGE[rec.urgency]}`}>
                {URGENCY_LABEL[rec.urgency]}
              </span>
              {primary && <span className="rounded-full bg-gold/30 text-magic px-2 py-0.5 text-[10px] font-extrabold">Melhor jogada agora</span>}
            </div>
            <p className={`font-display font-bold text-base leading-tight ${isGradient ? "text-white" : "text-magic"}`}>
              {rec.title}
            </p>
            <p className={`text-sm mt-1 leading-snug ${isGradient ? "text-white/85" : "text-foreground/85"}`}>
              {rec.message}
            </p>
            <p className={`text-[11px] mt-1.5 leading-snug italic ${isGradient ? "text-white/60" : "text-muted-foreground"}`}>
              {rec.reason}
            </p>
          </div>
        </div>

        {rec.attraction_id && (
          <Link
            to="/atracao/$id"
            params={{ id: rec.attraction_id }}
            className={`mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-extrabold transition ${
              isGradient
                ? "bg-gold text-magic"
                : "bg-gradient-magic text-white"
            }`}
          >
            Ver atração <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ---------- página ----------

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

  const { data: route } = useRouteForDay(todayDay?.id);
  const { data: items = [] } = useRouteItems(route?.id);
  const ids = useMemo(() => items.map((i) => i.attraction_id), [items]);
  const { data: attractions = [] } = useAttractionsByIds(ids);
  const { data: live = {} } = useLiveStatusForAttractions(ids);
  const { data: hist = {} } = useWaitHistoryForAttractions(ids);
  const { data: walkMatrix = {} } = useWalkMatrixForAttractions(ids);
  useLiveStatusRealtime(ids);
  useGeolocationTracking({ days, attractions });

  const done = items.filter((i) => i.visited_at).length;

  // Monta input para o motor de recomendações
  const recInput = useMemo(() => {
    if (!todayDay || items.length === 0 || attractions.length === 0) return null;

    const now = new Date();
    const hour = now.getHours();

    const attrMap = new Map(attractions.map((a) => [a.id, a]));
    const attrInputs: AttractionInput[] = items.map((item) => {
      const a = attrMap.get(item.attraction_id);
      const liveRow = live[item.attraction_id];
      const histAvg = hist[item.attraction_id] ?? null;
      const hourAvg = histAvg != null ? histAvg : null;

      return {
        id: item.attraction_id,
        name: a?.name ?? "Atração",
        is_must_do: a?.is_must_do ?? false,
        route_is_must_do: item.is_must_do ?? false,
        experience_type: a?.experience_type ?? "ride",
        route_position: item.position ?? 0,
        visited: !!item.visited_at,
        skipped: !!item.skipped_at,
        current_wait: liveRow?.current_wait_minutes ?? null,
        live_status: (liveRow?.status as AttractionInput["live_status"]) ?? "unknown",
        historical_avg: hourAvg,
        lat: a?.coordinates_lat ?? null,
        lng: a?.coordinates_lng ?? null,
        lightning_lane_type: a?.lightning_lane_type ?? "none",
      };
    });

    return {
      now,
      parkCloseTime: "22:00",
      attractions: attrInputs,
      walkMatrix,
      userLat: null as number | null,
      userLng: null as number | null,
    };
  }, [todayDay, items, attractions, live, hist, walkMatrix]);

  const recommendations = useMemo(() => {
    if (!recInput) return [];
    return generateSmartRecommendations(recInput);
  }, [recInput]);

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Carregando…</div>;
  if (!trip) return null;

  // ----- Modo 1: hoje é dia de parque -----
  if (todayDay && nextPark) {
    return (
      <main className="px-5 pt-6 max-w-md mx-auto pb-32">
        <header className="mb-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{trip.name}</p>
          <h1 className="font-display text-3xl font-bold text-magic">Hoje</h1>
        </header>

        {/* Card do parque / progresso */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-gold p-6 shadow-gold">
          <Sparkles className="absolute top-3 right-4 h-6 w-6 text-magic animate-sparkle" />
          <Sparkles className="absolute bottom-4 left-5 h-4 w-4 text-magic animate-sparkle" style={{ animationDelay: "0.7s" }} />
          <div className="flex items-center gap-2 text-magic/80 text-xs font-extrabold tracking-wider">
            <MapPin className="h-3.5 w-3.5" /> É HOJE!
          </div>
          <h2 className="mt-1 font-display text-3xl font-extrabold text-magic leading-tight">{nextPark.name}</h2>
          <p className="text-magic/80 text-sm mt-1 font-semibold capitalize">{formatPtDate(today)}</p>
          {items.length > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-magic/10 text-magic px-3 py-1 text-xs font-bold">
                <CastleIcon className="h-3.5 w-3.5" /> {done} de {items.length} feitas
              </span>
              {done === items.length && items.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/20 text-success px-3 py-1 text-xs font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Dia completo!
                </span>
              )}
            </div>
          )}
        </div>

        {/* Recomendações inteligentes */}
        {recommendations.length > 0 && (
          <section className="mt-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              Melhor jogada agora
            </h3>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <RecCard key={`${rec.type}-${rec.attraction_id ?? i}`} rec={rec} primary={i === 0} />
              ))}
            </div>
          </section>
        )}

        {/* Sem roteiro ainda */}
        {items.length === 0 && (
          <div className="mt-4 rounded-3xl bg-card border border-border p-5 text-center shadow-soft">
            <p className="text-sm text-muted-foreground">Você ainda não definiu o roteiro de hoje.</p>
            <Link to="/roteiro/$dayId" params={{ dayId: todayDay.id }}
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-gradient-magic text-white px-4 py-2 text-sm font-bold">
              Definir roteiro <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        <Link to="/roteiro" className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-magic p-4 font-extrabold text-white shadow-magic">
          Ver roteiro completo <ArrowRight className="h-5 w-5" />
        </Link>
      </main>
    );
  }

  // ----- Modo 2: contagem regressiva -----
  const arrival = trip.arrival_date ?? null;
  const targetISO = nextDay?.visit_date ?? arrival ?? null;
  const targetLabel = nextPark?.name ?? (arrival ? "Chegada em Orlando" : null);
  const daysLeft = targetISO ? daysBetween(today, targetISO) : null;

  return (
    <main className="px-5 pt-6 max-w-md mx-auto pb-32">
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
