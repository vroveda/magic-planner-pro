import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Activity, Bell, MapPin, ArrowRight } from "lucide-react";
import { Logo, CastleIcon } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Genie Hacker — Aproveite mais. Espere menos." },
      { name: "description", content: "Filas em tempo real, alertas de Lightning Lane no Telegram e roteiros otimizados para Walt Disney World." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-sky text-white">
      <Stars />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-8">
        <header className="flex items-center justify-between">
          <Logo />
        </header>

        <section className="mt-10 text-center">
          <div className="relative mx-auto h-32 w-32 mb-5 animate-float">
            <div className="absolute inset-0 rounded-full bg-gold/20 blur-2xl" />
            <div className="relative flex h-full w-full items-center justify-center rounded-3xl bg-gradient-gold shadow-gold">
              <CastleIcon className="h-16 w-16 text-magic" />
              <Sparkles className="absolute top-2 right-3 h-5 w-5 text-magic animate-sparkle" />
              <Sparkles className="absolute bottom-3 left-2 h-4 w-4 text-magic animate-sparkle" style={{ animationDelay: "0.6s" }} />
            </div>
          </div>

          <h1 className="font-display text-4xl font-bold leading-tight">
            Aproveite <span className="text-gradient-gold">mais.</span>
            <br />
            Espere <span className="text-gradient-gold">menos.</span>
          </h1>
          <p className="mt-3 text-white/75 text-sm max-w-xs mx-auto">
            Seu companion inteligente para Walt Disney World em Orlando.
          </p>
        </section>

        <ul className="mt-10 space-y-3">
          {[
            { icon: Activity, text: "Monitore as filas em tempo real" },
            { icon: Bell, text: "Receba alertas de Lightning Lane no Telegram" },
            { icon: MapPin, text: "Siga o roteiro otimizado por parque" },
          ].map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-gold">
                <Icon className="h-5 w-5 text-magic" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-white/95">{text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-10">
          <Link
            to="/parques"
            className="group flex items-center justify-center gap-2 rounded-2xl bg-gradient-gold py-4 text-base font-extrabold text-magic shadow-gold transition active:scale-[0.98]"
          >
            Começar gratuitamente
            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
          </Link>
          <p className="mt-3 text-center text-xs text-white/60">
            Planos disponíveis: <span className="font-bold text-white/80">Free · Day Pass · Trip Pass</span>
          </p>
        </div>
      </div>
    </main>
  );
}

function Stars() {
  const stars = Array.from({ length: 30 }, (_, i) => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    delay: `${Math.random() * 3}s`,
    key: i,
  }));
  return (
    <div className="pointer-events-none absolute inset-0">
      {stars.map((s) => (
        <div
          key={s.key}
          className="absolute rounded-full bg-white animate-sparkle"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }}
        />
      ))}
    </div>
  );
}
