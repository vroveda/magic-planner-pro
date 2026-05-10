import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Check, X, Drama, Activity, Clock } from "lucide-react";
import {
  useAlerts,
  useRespondAlert,
  useMonitors,
  useAttractionsByIds,
  useLiveStatusForAttractions,
} from "@/lib/queries";

export const Route = createFileRoute("/_app/alertas")({
  head: () => ({ meta: [{ title: "Alertas — Genie Hacker" }] }),
  component: AlertsPage,
});

function fmtShowTime(iso: string) {
  return new Date(iso)
    .toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" })
    .replace(":", "h");
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "começou";
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `em ${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `em ${h}h${m.toString().padStart(2, "0")}`;
}

function useNowTick(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function AlertsPage() {
  const { data: alerts = [], isLoading } = useAlerts();
  const respond = useRespondAlert();
  const { data: monitors = [] } = useMonitors(undefined);
  const monitorAttractionIds = [...new Set(monitors.map((m) => m.attraction_id))];
  const { data: attractions = [] } = useAttractionsByIds(monitorAttractionIds);
  const { data: live = {} } = useLiveStatusForAttractions(monitorAttractionIds);
  const now = useNowTick();

  const attrById = new Map(attractions.map((a) => [a.id, a]));

  return (
    <main className="px-5 pt-6 max-w-md mx-auto pb-10">
      <header className="mb-5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Motor de alertas</p>
        <h1 className="font-display text-3xl font-bold text-magic">Alertas</h1>
      </header>

      {/* Atrações monitoradas */}
      {monitors.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Atrações monitoradas</h2>
          <ul className="space-y-3">
            {monitors.map((m) => {
              const attr = attrById.get(m.attraction_id);
              if (!attr) return null;
              const isShow = attr.experience_type === "show";
              const liveRow = live[m.attraction_id] as
                | { current_wait_minutes?: number | null; show_next_times?: string[] | null }
                | undefined;
              const futureTimes = ((liveRow?.show_next_times as string[] | null) ?? [])
                .filter((t) => new Date(t).getTime() > now);
              const next = futureTimes[0];
              const countdown = next ? formatCountdown(new Date(next).getTime() - now) : null;

              return (
                <li key={m.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <div className="flex items-center gap-2 mb-1.5">
                    {isShow ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold rounded-full bg-magic/15 text-magic px-2 py-0.5 uppercase">
                        <Drama className="h-3 w-3" /> Show
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold rounded-full bg-gold/20 text-magic px-2 py-0.5 uppercase">
                        <Activity className="h-3 w-3" /> Ride
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{m.monitor_type.replace(/_/g, " ")}</span>
                  </div>
                  <Link
                    to="/atracao/$id"
                    params={{ id: attr.id }}
                    className="font-display font-bold text-magic block leading-tight"
                  >
                    {attr.name}
                  </Link>

                  {isShow ? (
                    futureTimes.length > 0 ? (
                      <div className="mt-2">
                        <p className="text-sm font-bold text-magic">
                          {futureTimes.slice(0, 4).map(fmtShowTime).join(" · ")}
                        </p>
                        {countdown && (
                          <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> próximo {countdown}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">Sem horários divulgados.</p>
                    )
                  ) : (
                    <p className="mt-2 text-sm text-magic">
                      {liveRow?.current_wait_minutes != null
                        ? `${liveRow.current_wait_minutes} min de fila agora`
                        : "Fila não disponível"}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Alertas */}
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Histórico de alertas</h2>
      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      {!isLoading && alerts.length === 0 && (
        <div className="rounded-3xl bg-card border border-border p-6 text-center">
          <Bell className="mx-auto h-10 w-10 text-gold mb-2" />
          <p className="font-bold text-magic">Tudo tranquilo por aqui.</p>
          <p className="text-sm text-muted-foreground mt-1">Você será notificado quando houver algo acionável.</p>
        </div>
      )}

      <ul className="space-y-3">
        {alerts.map((a) => (
          <li key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold rounded-full bg-gradient-gold text-magic px-2 py-0.5 uppercase">{a.alert_type.replace(/_/g, " ")}</span>
              <span className="text-[10px] font-bold text-muted-foreground">{new Date(a.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <h3 className="font-display font-bold text-magic mt-1">{a.title}</h3>
            <p className="mt-1 text-sm text-foreground/85 leading-snug">{a.message}</p>
            {a.status === "sent" || a.status === "pending" ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => respond.mutate({ alertId: a.id, action: "accepted" })}
                  className="rounded-xl bg-success text-white py-2 text-sm font-bold flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Aceitar</button>
                <button onClick={() => respond.mutate({ alertId: a.id, action: "rejected" })}
                  className="rounded-xl border border-border bg-card text-magic py-2 text-sm font-bold flex items-center justify-center gap-1"><X className="h-4 w-4" /> Recusar</button>
              </div>
            ) : (
              <p className="mt-2 text-xs font-bold text-muted-foreground">Status: {a.status}</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
