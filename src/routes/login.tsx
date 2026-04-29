import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Logo, CastleIcon } from "@/components/Logo";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Genie Hacker" },
      { name: "description", content: "Acesse sua conta no Genie Hacker para planejar e monitorar sua viagem à Walt Disney World." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/hoje" });
  }, [loading, user, nav]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) setError(error);
    else nav({ to: "/hoje" });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-sky text-white">
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-8">
        <header className="flex items-center justify-between">
          <Logo />
          <Link to="/" className="text-xs font-bold text-white/70 hover:text-white">← Início</Link>
        </header>

        <section className="mt-10 text-center">
          <div className="relative mx-auto h-24 w-24 mb-4">
            <div className="absolute inset-0 rounded-full bg-gold/20 blur-2xl" />
            <div className="relative flex h-full w-full items-center justify-center rounded-3xl bg-gradient-gold shadow-gold">
              <CastleIcon className="h-12 w-12 text-magic" />
              <Sparkles className="absolute top-1 right-2 h-4 w-4 text-magic animate-sparkle" />
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight">Bem-vindo de volta</h1>
          <p className="mt-2 text-white/75 text-sm">Entre com sua conta para continuar planejando.</p>
        </section>

        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <div>
            <label className="block text-xs font-bold text-white/70 mb-1.5">E-mail</label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="voce@exemplo.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/70 mb-1.5">Senha</label>
            <input
              type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-danger/20 border border-danger/30 px-3 py-2 text-sm font-semibold text-white">
              {error === "Invalid login credentials" ? "E-mail ou senha incorretos." : error}
            </div>
          )}

          <button
            type="submit" disabled={submitting}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold py-4 text-base font-extrabold text-magic shadow-gold transition active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "Entrando…" : (<>Entrar <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></>)}
          </button>
        </form>

        <p className="mt-auto pt-10 text-center text-xs text-white/60">
          Acesso restrito ao admin no MVP.
        </p>
      </div>
    </main>
  );
}
