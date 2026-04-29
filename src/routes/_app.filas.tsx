import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useActiveTrip, useTripParkDays, useRouteForDay, useRouteItems, useAttractionsByIds, useLiveStatusForAttractions, useWaitHistoryForAttractions, useLiveStatusRealtime } from "@/lib/queries";
import { computeCondition, conditionMeta } from "@/lib/score";

export const Route = createFileRoute("/_app/filas")({
  head: () => ({ meta: [{ title: "Filas — Genie Hacker" }] }),
  component: QueuesPage,
});

function QueuesPage() {
  const { data: trip } = useActiveTrip();
  const { data: days = [] } = useTripParkDays(trip?.id);
  const today = new Date().toISOString().slice(0, 10);
  const day = days.find((d) => d.visit_date === today) ?? days.find((d) => d.is_active_day) ?? days[0];
  const { data: route } = useRouteForDay(day?.id);
  const { data: items = [] } = useRouteItems(route?.id);
  const ids = useMemo(() => items.map((i) => i.attraction_id), [items]);
  const { data: attractions = [] } = useAttractionsByIds(ids);
  const { data: live = {} } = useLiveStatusForAttractions(ids);
  const { data: hist = {} } = useWaitHistoryForAttractions(ids);
  useLiveStatusRealtime(ids);

  return (
    <main className="px-5 pt-6 max-w-md mx-auto">
      <header className="mb-5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tempo real</p>
        <h1 className="font-display text-3xl font-bold text-magic">Filas</h1>
      </header>

      {ids.length === 0 && <p className="text-muted-foreground text-sm">Sem atrações monitoradas hoje.</p>}

      <ul className="space-y-2">
        {attractions.map((a) => {
          const w = live[a.id]?.current_wait_minutes ?? null;
          const h = hist[a.id] ?? null;
          const { condition, deviation } = computeCondition(w, h);
          const meta = conditionMeta[condition];
          const trend = deviation == null ? "→" : deviation > 0.05 ? "↑" : deviation < -0.05 ? "↓" : "→";
          return (
            <li key={a.id} className={`flex items-center justify-between rounded-2xl border border-border bg-card p-3 ${meta.bg}`}>
              <div className="min-w-0">
                <p className="font-bold text-magic truncate">{a.name}</p>
                <p className={`text-xs font-bold ${meta.color}`}>{meta.emoji} {meta.label}{h != null ? ` · média ${Math.round(h)} min` : ""}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-bold text-magic leading-none">{w != null ? `${w}` : "—"}<span className="text-xs font-bold text-muted-foreground"> min</span></p>
                <p className="text-xs font-bold text-muted-foreground">{trend}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
