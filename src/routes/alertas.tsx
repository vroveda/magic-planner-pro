import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ChevronDown, Send, Info, Bell, Zap } from "lucide-react";
import { PARKS, nextLLSlot } from "@/lib/parks";
import { useApp } from "@/lib/app-state";
import { PlanBadge } from "@/components/PlanBadge";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/alertas")({
  head: () => ({ meta: [{ title: "Alertas Lightning Lane — Genie Hacker" }, { name: "description", content: "Configure alertas de Lightning Lane via Telegram." }] }),
  component: Alerts,
});

function Alerts() {
  const { monitored, alerts, setAlert, telegramConnected } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);
  const items = useMemo(
    () => PARKS.flatMap((p) => p.attractions.map((a) => ({ ...a, park: p }))).filter((a) => monitored.has(a.id)),
    [monitored]
  );

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-gradient-magic text-white px-5 pt-5 pb-5 rounded-b-3xl shadow-magic">
        <div className="flex items-center justify-between mb-3">
          <Logo size="sm" />
          <PlanBadge />
        </div>
        <h1 className="font-display text-2xl font-bold">Configurar Alertas</h1>
        <p className="text-white/70 text-sm">Lightning Lane em tempo real.</p>
      </header>

      <section className="px-4 pt-5 space-y-3">
        <div className={`flex items-start gap-3 rounded-2xl border p-3.5 ${telegramConnected ? "bg-success/10 border-success/30" : "bg-gold/10 border-gold/40"}`}>
          <Info className={`h-5 w-5 shrink-0 mt-0.5 ${telegramConnected ? "text-success" : "text-gold-foreground"}`} />
          <div className="flex-1 text-sm">
            {telegramConnected ? (
              <p className="text-foreground"><span className="font-bold">Telegram conectado!</span> Você receberá os alertas em tempo real.</p>
            ) : (
              <>
                <p className="text-foreground">Os alertas serão enviados via Telegram. Configure sua conta abaixo.</p>
                <Link to="/telegram" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-magic underline">
                  Conectar Telegram <Send className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border p-8 text-center">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground/60 mb-2" />
            <h3 className="font-display font-bold text-magic">Nenhuma atração monitorada</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Selecione atrações no Roteiro para configurar alertas.</p>
            <Link to="/roteiro" className="inline-flex rounded-xl bg-gradient-magic px-5 py-2.5 text-sm font-bold text-white shadow-magic">
              Abrir Roteiro
            </Link>
          </div>
        ) : (
          items.map((a) => {
            const open = expanded === a.id;
            const al = alerts[a.id] ?? { earlier: false, available: false };
            const ll = (a.id.charCodeAt(0) % 2) === 0;
            return (
              <div key={a.id} className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
                <button onClick={() => setExpanded(open ? null : a.id)} className="w-full flex items-center justify-between gap-3 p-4 text-left">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{a.park.shortName}</div>
                    <h3 className="font-display font-bold text-magic text-base leading-tight">{a.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {(al.earlier || al.available) && <span className="h-2 w-2 rounded-full bg-success animate-pulse-soft" />}
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {open && (
                  <div className="border-t border-border px-4 py-4 space-y-3 bg-secondary/40">
                    <div className="flex items-center gap-2 text-xs">
                      <Zap className={`h-4 w-4 ${ll ? "text-gold-foreground fill-gold" : "text-muted-foreground"}`} />
                      <span className="font-bold text-magic">Status LL atual:</span>
                      <span className={ll ? "text-success font-bold" : "text-danger font-bold"}>
                        {ll ? `Disponível · ${nextLLSlot()}` : "Esgotado"}
                      </span>
                    </div>

                    <Toggle
                      label="Avisar quando um horário mais cedo abrir"
                      checked={al.earlier}
                      onChange={(v) => setAlert(a.id, "earlier", v)}
                    />
                    <Toggle
                      label="Avisar quando voltar a ter disponibilidade"
                      checked={al.available}
                      onChange={(v) => setAlert(a.id, "available", v)}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {!telegramConnected && (
        <div className="fixed bottom-20 inset-x-0 z-30 px-4 pb-2">
          <Link
            to="/telegram"
            className="flex w-full max-w-md mx-auto items-center justify-center gap-2 rounded-2xl bg-gradient-magic py-4 text-base font-extrabold text-white shadow-magic active:scale-[0.98]"
          >
            <Send className="h-5 w-5" /> Conectar Telegram
          </Link>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-sm font-semibold text-foreground/90">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-gradient-magic" : "bg-muted"}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[calc(100%-1.25rem-0.125rem)]" : "left-0.5"}`} />
      </button>
    </label>
  );
}
