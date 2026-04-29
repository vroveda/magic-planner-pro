import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Send, LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile, useUpdateProfile, useActiveTrip, useDeleteTrip } from "@/lib/queries";

export const Route = createFileRoute("/_app/config")({
  head: () => ({ meta: [{ title: "Configurações — Genie Hacker" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const nav = useNavigate();
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: trip } = useActiveTrip();
  const deleteTrip = useDeleteTrip();
  const [chatId, setChatId] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (profile?.telegram_chat_id) setChatId(profile.telegram_chat_id);
  }, [profile?.telegram_chat_id]);

  return (
    <main className="px-5 pt-6 max-w-md mx-auto">
      <header className="mb-5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{user?.email}</p>
        <h1 className="font-display text-3xl font-bold text-magic">Configurações</h1>
      </header>

      <section className="rounded-3xl bg-card border border-border p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-2">
          <Send className="h-5 w-5 text-magic" />
          <h2 className="font-display text-lg font-bold text-magic">Telegram</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Receba alertas no Telegram. Abra o bot, envie <code className="rounded bg-secondary px-1">/start</code> e cole aqui o seu chat ID.
        </p>
        <input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="Seu chat ID"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold mb-2" />
        <button onClick={() => updateProfile.mutate({ telegram_chat_id: chatId.trim() || null })}
          className="w-full rounded-xl bg-gradient-magic text-white py-2.5 text-sm font-bold">
          {updateProfile.isPending ? "Salvando…" : "Salvar"}
        </button>
      </section>

      <section className="mt-4 rounded-3xl bg-card border border-border p-5 shadow-soft">
        <h2 className="font-display text-lg font-bold text-magic mb-3">Conta</h2>
        <button onClick={async () => { await signOut(); nav({ to: "/login" }); }}
          className="w-full rounded-xl border border-border bg-card text-magic py-2.5 text-sm font-bold flex items-center justify-center gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </section>

      <section className="mt-4 rounded-3xl bg-card border border-danger/20 p-4">
        <p className="text-xs font-bold text-muted-foreground mb-2">Avançado</p>
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} className="text-xs text-danger underline">Resetar viagem atual</button>
        ) : (
          <div>
            <p className="text-xs text-foreground mb-2">Apagar viagem, dias e roteiros? Essa ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmReset(false)} className="flex-1 rounded-xl border border-border py-2 text-xs font-bold">Cancelar</button>
              <button disabled={!trip} onClick={async () => { if (trip) { await deleteTrip.mutateAsync(trip.id); setConfirmReset(false); nav({ to: "/setup" }); } }}
                className="flex-1 rounded-xl bg-danger text-white py-2 text-xs font-bold flex items-center justify-center gap-1">
                <RefreshCw className="h-3 w-3" /> Resetar
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
