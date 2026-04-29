import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Crown, Bell, Activity } from "lucide-react";
import { useAttraction, useLiveStatusForAttractions, useWaitHistoryForAttractions, useToggleMonitor, useMonitors } from "@/lib/queries";
import { computeCondition, conditionMeta } from "@/lib/score";

export const Route = createFileRoute("/_app/atracao/$id")({
  head: () => ({ meta: [{ title: "Atração — Genie Hacker" }] }),
  component: AttractionPage,
});

function AttractionPage() {
  const { id } = Route.useParams();
  const { data: a } = useAttraction(id);
  const { data: live = {} } = useLiveStatusForAttractions(id ? [id] : []);
  const { data: hist = {} } = useWaitHistoryForAttractions(id ? [id] : []);
  const toggle = useToggleMonitor();
  const { data: monitors = [] } = useMonitors(undefined);
  const isMonWait = monitors.some((m) => m.attraction_id === id && m.monitor_type === "wait_time");
  const isMonLL = monitors.some((m) => m.attraction_id === id && m.monitor_type === "lightning_lane");

  if (!a) return <div className="p-10 text-center text-muted-foreground">Carregando…</div>;

  const w = live[a.id]?.current_wait_minutes ?? null;
  const h = hist[a.id] ?? null;
  const { condition } = computeCondition(w, h);
  const meta = conditionMeta[condition];

  return (
    <main className="px-5 pt-6 max-w-md mx-auto pb-10">
      <Link to="/roteiro" className="inline-flex items-center gap-1 text-sm font-bold text-magic mb-3"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
      <h1 className="font-display text-3xl font-bold text-magic">{a.name}</h1>
      <p className="text-sm text-muted-foreground">{a.area} · {a.experience_type}</p>

      <div className="mt-4 flex items-center gap-2 text-xs font-extrabold flex-wrap">
        {a.is_must_do && <span className="inline-flex items-center gap-1 rounded-full bg-gradient-gold text-magic px-2 py-0.5"><Crown className="h-3 w-3" /> IMPERDÍVEL</span>}
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${meta.bg} ${meta.color}`}>{meta.emoji} {meta.label}</span>
        {w != null && <span className="rounded-full bg-secondary text-magic px-2 py-0.5">{w} min agora</span>}
        {h != null && <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5">média {Math.round(h)} min</span>}
        {a.lightning_lane_type !== "none" && <span className="rounded-full bg-magic text-white px-2 py-0.5">LL {a.lightning_lane_type}</span>}
        {a.min_height_cm && <span className="rounded-full bg-warning/20 text-warning px-2 py-0.5">⚠ {a.min_height_cm} cm</span>}
      </div>

      {a.strategic_tip && (
        <div className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 p-4">
          <p className="text-xs font-extrabold text-magic mb-1">DICA ESTRATÉGICA</p>
          <p className="text-sm text-foreground/90">{a.strategic_tip}</p>
        </div>
      )}

      {a.short_description && <p className="mt-4 text-sm text-foreground/85 leading-snug">{a.short_description}</p>}
      {a.long_description && <p className="mt-2 text-sm text-foreground/70 leading-snug">{a.long_description}</p>}

      <div className="mt-6 space-y-2">
        <button onClick={() => toggle.mutate({ attractionId: a.id, tripParkDayId: null, monitorType: "wait_time", max_wait_minutes: 30 })}
          className={`w-full rounded-2xl py-3 text-sm font-extrabold flex items-center justify-center gap-2 ${isMonWait ? "bg-magic text-white" : "bg-secondary text-magic border border-border"}`}>
          <Activity className="h-4 w-4" /> {isMonWait ? "Monitorando fila" : "Monitorar queda de fila"}
        </button>
        {a.lightning_lane_type !== "none" && (
          <button onClick={() => toggle.mutate({ attractionId: a.id, tripParkDayId: null, monitorType: "lightning_lane" })}
            className={`w-full rounded-2xl py-3 text-sm font-extrabold flex items-center justify-center gap-2 ${isMonLL ? "bg-magic text-white" : "bg-secondary text-magic border border-border"}`}>
            <Bell className="h-4 w-4" /> {isMonLL ? "Monitorando Lightning Lane" : "Monitorar Lightning Lane"}
          </button>
        )}
      </div>
    </main>
  );
}
