import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Crown, Check, SkipForward, Pencil, Clock } from "lucide-react";
import {
  useActiveTrip, useTripParkDays, useParks, useRouteForDay, useRouteItems,
  useAttractionsByIds, useLiveStatusForAttractions, useWaitHistoryForAttractions,
  useLiveStatusRealtime, useMarkVisited, useMarkSkipped, useReplaceRoute,
  useSetPlannedArrival, useSetUsesLightningLane, readTripPrefs,
} from "@/lib/queries";
import { computeCondition, conditionMeta } from "@/lib/score";
import { ParkRoutePicker } from "@/components/ParkRoutePicker";
import { RouteOrderStep } from "@/components/RouteOrderStep";
import { useAttractionsByPark } from "@/lib/queries";

export const Route = createFileRoute("/_app/roteiro/$dayId")({
  head: () => ({ meta: [{ title: "Roteiro do dia — Genie Hacker" }] }),
  component: DayRoute,
});

function DayRoute() {
  const { dayId } = Route.useParams();
  const { data: trip } = useActiveTrip();
  const { data: parks = [] } = useParks();
  const { data: days = [] } = useTripParkDays(trip?.id);
  const day = days.find((d) => d.id === dayId);
  const park = day ? parks.find((p) => p.id === day.park_id) : null;
  const { data: route } = useRouteForDay(day?.id);
  const { data: items = [] } = useRouteItems(route?.id);
  const ids = useMemo(() => items.map((i) => i.attraction_id), [items]);
  const { data: attractions = [] } = useAttractionsByIds(ids);
  const { data: live = {} } = useLiveStatusForAttractions(ids);
  const { data: hist = {} } = useWaitHistoryForAttractions(ids);
  useLiveStatusRealtime(ids);
  const markVisited = useMarkVisited();
  const markSkipped = useMarkSkipped();
  const replaceRoute = useReplaceRoute();
  const setArrival = useSetPlannedArrival();
  const setUsesLL = useSetUsesLightningLane();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [mustDoDraft, setMustDoDraft] = useState<string[]>([]);
  const [step, setStep] = useState<"arrival" | "picker" | "order">("picker");
  const [arrivalDraft, setArrivalDraft] = useState<string>("09:00");
  const prefs = trip ? readTripPrefs(trip.id) : {};
  const { data: parkAttractions = [] } = useAttractionsByPark(day?.park_id);

  const showPicker = editing || items.length === 0;

  // initialize step + drafts when entering picker mode
  useEffect(() => {
    if (!showPicker || !day) return;
    setDraft(editing ? ids : []);
    setMustDoDraft(
      editing
        ? items.filter((i) => i.is_must_do).map((i) => i.attraction_id)
        : [],
    );
    if (!day.planned_arrival_time) {
      setStep("arrival");
      setArrivalDraft("09:00");
    } else {
      setStep("picker");
      setArrivalDraft(day.planned_arrival_time.slice(0, 5));
    }
  }, [showPicker, editing, day?.id, day?.planned_arrival_time]);

  if (!day) {
    return (
      <main className="px-5 pt-6 max-w-md mx-auto">
        <p className="text-muted-foreground">Dia não encontrado.</p>
        <Link to="/roteiro" className="text-magic underline">Voltar</Link>
      </main>
    );
  }

  if (showPicker && park && step === "arrival") {
    return (
      <main className="px-5 pt-6 max-w-md mx-auto pb-32">
        <Link to="/roteiro" className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{park.name}</p>
          <h2 className="font-display text-2xl font-bold text-magic mt-1">
            Que horas você pretende chegar?
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vamos usar isso para organizar seu roteiro.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Clock className="h-5 w-5 text-magic" />
            <input
              type="time"
              value={arrivalDraft}
              onChange={(e) => setArrivalDraft(e.target.value)}
              className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-lg font-display font-bold text-magic"
            />
          </div>
          <div className="mt-6 flex items-center gap-2">
            {editing && (
              <button onClick={() => setEditing(false)} className="flex items-center gap-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-magic">
                <ArrowLeft className="h-4 w-4" /> Cancelar
              </button>
            )}
            <button
              onClick={async () => {
                await setArrival.mutateAsync({ dayId: day.id, time: arrivalDraft });
                setStep("picker");
              }}
              disabled={!arrivalDraft}
              className="ml-auto flex items-center gap-1 rounded-2xl bg-gradient-gold px-5 py-3 text-sm font-extrabold text-magic shadow-gold disabled:opacity-50"
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (showPicker && park && step === "order") {
    return (
      <main className="px-5 pt-6 max-w-md mx-auto pb-32">
        <Link to="/roteiro" className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <RouteOrderStep
          parkName={park.name}
          attractions={parkAttractions.filter((a) => draft.includes(a.id))}
          initialIds={draft}
          mustDoIds={mustDoDraft}
          onBack={() => setStep("picker")}
          saving={replaceRoute.isPending}
          onSave={async (orderedIds) => {
            await replaceRoute.mutateAsync({
              tripParkDayId: day.id,
              attractionIds: orderedIds,
              mustDoIds: mustDoDraft.filter((id) => orderedIds.includes(id)),
            });
            setEditing(false);
          }}
        />
      </main>
    );
  }

  if (showPicker && park) {
    return (
      <main className="px-5 pt-6 max-w-md mx-auto pb-32">
        <Link to="/roteiro" className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <button
          onClick={() => setStep("arrival")}
          className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-magic"
        >
          <Clock className="h-3.5 w-3.5" />
          Chegada às {arrivalDraft} <span className="text-muted-foreground">• alterar</span>
        </button>
        <ParkRoutePicker
          parkId={park.id}
          parkName={park.name}
          childrenPrefs={prefs.children ?? []}
          value={draft}
          onChange={setDraft}
          headerExtra={editing ? "Editar roteiro" : "Definir roteiro"}
          onBack={editing ? () => setEditing(false) : null}
          usesLightningLane={!!day.uses_lightning_lane}
          onUsesLightningLaneChange={(v) => setUsesLL.mutate({ dayId: day.id, value: v })}
          onNext={draft.length > 0 ? () => setStep("order") : null}
          nextLabel="Continuar"
        />
      </main>
    );
  }

  return (
    <main className="px-5 pt-6 max-w-md mx-auto pb-32">
      <Link to="/roteiro" className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground mb-3">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>
      <header className="mb-5 flex items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{park?.name}</p>
          <h1 className="font-display text-3xl font-bold text-magic">Roteiro & Filas</h1>
        </div>
        <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-magic">
          <Pencil className="h-3.5 w-3.5" /> Editar
        </button>
      </header>

      <ul className="space-y-3">
        {items.map((item, idx) => {
          const a = attractions.find((x) => x.id === item.attraction_id);
          if (!a) return null;
          const w = live[a.id]?.current_wait_minutes ?? null;
          const h = hist[a.id] ?? null;
          const { condition, deviation } = computeCondition(w, h);
          const meta = conditionMeta[condition];
          const trend = deviation == null ? "→" : deviation > 0.05 ? "↑" : deviation < -0.05 ? "↓" : "→";
          const done = !!item.visited_at;
          const skipped = !!item.skipped_at;
          return (
            <li key={item.id} className={`rounded-2xl border p-4 ${done ? "bg-success/5 border-success/30" : skipped ? "bg-muted/40 border-border opacity-70" : `bg-card border-border shadow-soft ${meta.bg}`}`}>
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
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${meta.color}`}>{meta.emoji} {meta.label}</span>
                    {h != null && <span className="text-muted-foreground">média {Math.round(h)}m</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-2xl font-bold text-magic leading-none">
                    {w != null ? w : "—"}
                    <span className="text-xs font-bold text-muted-foreground"> min</span>
                  </p>
                  <p className={`text-xs font-bold ${meta.color}`}>{trend}</p>
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
