import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Send, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { PlanBadge } from "@/components/PlanBadge";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/telegram")({
  head: () => ({ meta: [{ title: "Conectar Telegram — Genie Hacker" }, { name: "description", content: "Conecte seu Telegram para receber alertas de Lightning Lane em tempo real." }] }),
  component: Telegram,
});

function Telegram() {
  const { telegramConnected, setTelegramConnected } = useApp();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(() => { setTelegramConnected(true); setWaiting(false); }, 3000);
    return () => clearTimeout(t);
  }, [waiting, setTelegramConnected]);

  const open = () => {
    setWaiting(true);
    window.open("https://t.me/DisneyAssistantBot", "_blank", "noopener,noreferrer");
  };

  const steps = [
    { n: 1, text: "Clique no botão abaixo para abrir o nosso bot no Telegram", emoji: "🤖" },
    { n: 2, text: 'Pressione "Iniciar" no bot', emoji: "▶️" },
    { n: 3, text: "Volte aqui — sua conta será conectada automaticamente", emoji: "✨" },
  ];

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-gradient-magic text-white px-5 pt-5 pb-5 rounded-b-3xl shadow-magic">
        <div className="flex items-center justify-between mb-3">
          <Logo size="sm" />
          <PlanBadge />
        </div>
        <h1 className="font-display text-2xl font-bold">Receba alertas no Telegram</h1>
        <p className="text-white/70 text-sm">Configuração em 3 passos rápidos.</p>
      </header>

      <section className="px-4 pt-6">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#229ED9] shadow-lg animate-float">
          <Send className="h-10 w-10 text-white -rotate-12" fill="white" />
        </div>

        <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s.n} className="flex items-start gap-3 rounded-2xl bg-card border border-border p-4 shadow-soft">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-gold font-display font-bold text-magic">
                {s.n}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground/90 leading-snug">{s.text}</p>
              </div>
              <div className="text-2xl">{s.emoji}</div>
            </li>
          ))}
        </ol>

        <button
          onClick={open}
          disabled={telegramConnected}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#229ED9] py-4 text-base font-extrabold text-white shadow-magic transition active:scale-[0.98] disabled:opacity-60"
        >
          <Send className="h-5 w-5" fill="white" />
          Abrir @DisneyAssistantBot
          <ExternalLink className="h-4 w-4 opacity-80" />
        </button>

        <div className="mt-5">
          {telegramConnected ? (
            <div className="flex items-center gap-3 rounded-2xl bg-success/15 border border-success/40 p-4">
              <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
              <div className="text-sm">
                <div className="font-bold text-success">Telegram conectado!</div>
                <div className="text-foreground/80">Você receberá alertas em tempo real.</div>
              </div>
            </div>
          ) : waiting ? (
            <div className="flex items-center gap-3 rounded-2xl bg-gold/15 border border-gold/40 p-4">
              <Loader2 className="h-6 w-6 text-gold-foreground animate-spin shrink-0" />
              <div className="text-sm">
                <div className="font-bold text-magic">Aguardando conexão...</div>
                <div className="text-foreground/80">Confirme no app do Telegram.</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-xs text-muted-foreground">
              Suas notificações chegam apenas quando algo realmente importar.
            </div>
          )}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
