import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check, X } from "lucide-react";
import { useAlerts, useRespondAlert } from "@/lib/queries";

export const Route = createFileRoute("/_app/alertas")({
  head: () => ({ meta: [{ title: "Alertas — Genie Hacker" }] }),
  component: AlertsPage,
});

function AlertsPage() {
  const { data: alerts = [], isLoading } = useAlerts();
  const respond = useRespondAlert();

  return (
    <main className="px-5 pt-6 max-w-md mx-auto">
      <header className="mb-5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Motor de alertas</p>
        <h1 className="font-display text-3xl font-bold text-magic">Alertas</h1>
      </header>

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
