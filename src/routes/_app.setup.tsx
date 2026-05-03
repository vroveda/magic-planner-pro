import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowLeft, Calendar, Hotel, Ticket, Users, Baby, MapPin, Check, Sparkles } from "lucide-react";
import {
  useActiveTrip, useCreateTrip, useUpdateTrip, useParks, useTripParkDays, useUpsertTripParkDays,
  readTripPrefs, writeTripPrefs, type TripPrefs,
} from "@/lib/queries";

export const Route = createFileRoute("/_app/setup")({
  head: () => ({ meta: [{ title: "Configurar viagem — Genie Hacker" }] }),
  component: SetupWizard,
});

const HEIGHTS: { value: NonNullable<TripPrefs["children"]>[number]["height"]; label: string }[] = [
  { value: "under_97", label: "Menos de 97 cm" },
  { value: "97_107", label: "97–107 cm" },
  { value: "107_122", label: "107–122 cm" },
  { value: "above_122", label: "Acima de 122 cm" },
];

function SetupWizard() {
  const nav = useNavigate();
  const { data: trip, isLoading: loadingTrip } = useActiveTrip();
  const createTrip = useCreateTrip();
  const updateTrip = useUpdateTrip();
  const { data: parks = [] } = useParks();
  const upsertDays = useUpsertTripParkDays();
  const replaceRoute = useReplaceRoute();
  const { data: existingDays = [] } = useTripParkDays(trip?.id);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<TripPrefs>({});
  const [arrival, setArrival] = useState<string>("");
  const [parkIds, setParkIds] = useState<string[]>([]);
  const [parkDates, setParkDates] = useState<Record<string, string>>({});

  // Auto-create trip on first load
  useEffect(() => {
    if (!loadingTrip && !trip && !createTrip.isPending) createTrip.mutate(undefined);
  }, [loadingTrip, trip, createTrip]);

  // Load saved prefs/dates on trip ready
  useEffect(() => {
    if (!trip) return;
    setPrefs(readTripPrefs(trip.id));
    setArrival(trip.arrival_date ?? "");
  }, [trip]);

  useEffect(() => {
    if (existingDays.length > 0) {
      setParkIds(existingDays.map((d) => d.park_id));
      setParkDates(Object.fromEntries(existingDays.map((d) => [d.park_id, d.visit_date])));
    }
  }, [existingDays]);

  const totalSteps = 8;
  const progress = ((step + 1) / totalSteps) * 100;
  const hasChildren = (prefs.children?.length ?? 0) > 0;

  function next() { setStep((s) => Math.min(totalSteps - 1, s + 1)); }
  function back() { setStep((s) => Math.max(0, s - 1)); }

  function addDaysISO(iso: string, days: number) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  // Pre-fill park visit dates: arrival + 1, +2, +3... for parks that don't have a date yet
  useEffect(() => {
    if (!arrival || parkIds.length === 0) return;
    setParkDates((cur) => {
      const out = { ...cur };
      let changed = false;
      parkIds.forEach((pid, i) => {
        if (!out[pid]) {
          out[pid] = addDaysISO(arrival, i + 1);
          changed = true;
        }
      });
      return changed ? out : cur;
    });
  }, [arrival, parkIds]);

  async function persistPrefs(p: TripPrefs) {
    setPrefs(p);
    if (trip) writeTripPrefs(trip.id, p);
  }

  async function persistArrival(d: string) {
    setArrival(d);
    if (trip) await updateTrip.mutateAsync({ id: trip.id, patch: { arrival_date: d } });
  }

  async function persistParksAndDates() {
    if (!trip) return;
    const days = parkIds
      .filter((pid) => parkDates[pid])
      .map((pid) => ({ park_id: pid, visit_date: parkDates[pid] }));
    if (days.length === 0) return;
    await upsertDays.mutateAsync({ tripId: trip.id, days });
  }

  async function finalize() {
    if (!trip) return;
    const days = parkIds.map((pid) => ({ park_id: pid, visit_date: parkDates[pid] }));
    await upsertDays.mutateAsync({ tripId: trip.id, days });
    await updateTrip.mutateAsync({ id: trip.id, patch: { status: "active" } });
    nav({ to: "/roteiro" });
  }

  if (loadingTrip || !trip) {
    return <div className="p-10 text-center text-muted-foreground">Carregando…</div>;
  }

  return (
    <main className="min-h-screen px-5 pt-6 pb-32">
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-2">
            <span>Passo {step + 1} de {totalSteps}</span>
            <Link to="/hoje" className="text-magic hover:underline">Pular</Link>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-gradient-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {step === 0 && (
          <Card icon={<Calendar className="h-6 w-6" />} title="Quando você chega em Orlando?" subtitle="Vamos usar essa data para montar seu cronograma.">
            <input type="date" value={arrival} min={todayISO} onChange={(e) => setArrival(e.target.value)} onBlur={(e) => persistArrival(e.target.value)}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-gold" />
            <NavButtons onBack={null} onNext={arrival && arrival >= todayISO ? () => { persistArrival(arrival); next(); } : null} />
          </Card>
        )}

        {step === 1 && (
          <Card icon={<Hotel className="h-6 w-6" />} title="Vai se hospedar em hotel oficial Disney?" subtitle="Hóspedes Disney compram Lightning Lane com 7 dias de antecedência (vs 3 dias).">
            <Choices options={[{ v: true, l: "Sim" }, { v: false, l: "Não" }]} value={prefs.is_disney_hotel}
              onChange={(v) => persistPrefs({ ...prefs, is_disney_hotel: v as boolean })} />
            <NavButtons onBack={back} onNext={prefs.is_disney_hotel !== undefined ? next : null} />
          </Card>
        )}

        {step === 2 && (
          <Card icon={<Ticket className="h-6 w-6" />} title="Qual o seu tipo de ingresso?" subtitle="Park Hopper permite trocar de parque no mesmo dia.">
            <Choices options={[{ v: "park_hopper", l: "Park Hopper" }, { v: "single_park", l: "Um parque por dia" }]}
              value={prefs.ticket_type} onChange={(v) => persistPrefs({ ...prefs, ticket_type: v as TripPrefs["ticket_type"] })} />
            <NavButtons onBack={back} onNext={prefs.ticket_type ? next : null} />
          </Card>
        )}

        {step === 3 && (
          <Card icon={<Users className="h-6 w-6" />} title="Quantos adultos no grupo?">
            <NumberPicker value={prefs.adults ?? 0} onChange={(n) => persistPrefs({ ...prefs, adults: n })} />
            <NavButtons onBack={back} onNext={(prefs.adults ?? 0) > 0 ? next : null} />
          </Card>
        )}

        {step === 4 && (
          <Card icon={<Baby className="h-6 w-6" />} title="Tem crianças no grupo?">
            <Choices options={[{ v: "yes", l: "Sim" }, { v: "no", l: "Não" }]}
              value={hasChildren ? "yes" : (prefs.children !== undefined ? "no" : undefined)}
              onChange={(v) => persistPrefs({ ...prefs, children: v === "yes" ? (prefs.children?.length ? prefs.children : [{ id: crypto.randomUUID(), height: "above_122" }]) : [] })} />
            {hasChildren && (
              <div className="mt-4">
                <p className="text-sm font-bold mb-2">Quantas?</p>
                <NumberPicker value={prefs.children?.length ?? 0}
                  onChange={(n) => {
                    const cur = prefs.children ?? [];
                    const next = Array.from({ length: n }, (_, i) => cur[i] ?? { id: crypto.randomUUID(), height: "above_122" as const });
                    persistPrefs({ ...prefs, children: next });
                  }} />
              </div>
            )}
            <NavButtons onBack={back} onNext={prefs.children !== undefined ? () => setStep(hasChildren ? 5 : 6) : null} />
          </Card>
        )}

        {step === 5 && (
          <Card icon={<Baby className="h-6 w-6" />} title="Faixa de altura das crianças" subtitle="Vamos sinalizar atrações com restrição.">
            {!hasChildren ? <p className="text-muted-foreground text-sm">Sem crianças no grupo.</p> : (
              <div className="space-y-3">
                {prefs.children!.map((c, idx) => (
                  <div key={c.id} className="rounded-2xl border border-border bg-card p-3">
                    <p className="text-sm font-bold mb-2">Criança {idx + 1}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {HEIGHTS.map((h) => (
                        <button key={h.value} onClick={() => persistPrefs({ ...prefs, children: prefs.children!.map((x, i) => i === idx ? { ...x, height: h.value } : x) })}
                          className={`rounded-xl px-3 py-2 text-xs font-bold border ${c.height === h.value ? "bg-gradient-magic text-white border-magic" : "bg-secondary text-magic border-border"}`}>
                          {h.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <NavButtons onBack={back} onNext={next} />
          </Card>
        )}

        {step === 6 && (
          <Card icon={<MapPin className="h-6 w-6" />} title="Quais parques você vai visitar?">
            <div className="grid grid-cols-1 gap-2">
              {parks.map((p) => {
                const sel = parkIds.includes(p.id);
                return (
                  <button key={p.id}
                    onClick={() => setParkIds(sel ? parkIds.filter((x) => x !== p.id) : [...parkIds, p.id])}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left border ${sel ? "bg-gradient-magic text-white border-magic shadow-magic" : "bg-card border-border"}`}>
                    <span className="font-bold">{p.name}</span>
                    {sel && <Check className="h-5 w-5" />}
                  </button>
                );
              })}
            </div>
            <NavButtons onBack={() => setStep(hasChildren ? 5 : 4)} onNext={parkIds.length > 0 ? next : null} />
          </Card>
        )}

        {step === 7 && (
          <Card icon={<Calendar className="h-6 w-6" />} title="Em qual dia visita cada parque?">
            <div className="space-y-2">
              {parkIds.map((pid) => {
                const p = parks.find((x) => x.id === pid);
                return (
                  <div key={pid} className="rounded-2xl border border-border bg-card p-3">
                    <p className="font-bold text-sm mb-2">{p?.name}</p>
                    <input type="date" value={parkDates[pid] ?? ""} min={arrival || todayISO} onChange={(e) => setParkDates({ ...parkDates, [pid]: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold" />
                  </div>
                );
              })}
            </div>
            <NavButtons onBack={back} onNext={parkIds.every((pid) => parkDates[pid] && parkDates[pid] >= (arrival || todayISO)) ? async () => { await finalize(); } : null} nextLabel="Concluir" />
          </Card>
        )}

      </div>
    </main>
  );
}

function Card({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
      <div className="flex items-center gap-2 text-magic mb-1"><Sparkles className="h-4 w-4 text-gold" />{icon}</div>
      <h2 className="font-display text-2xl font-bold text-magic leading-tight">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Choices<T extends string | number | boolean>({ options, value, onChange }: { options: { v: T; l: string }[]; value: T | undefined; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => {
        const sel = value === o.v;
        return (
          <button key={String(o.v)} onClick={() => onChange(o.v)}
            className={`rounded-2xl px-4 py-3 text-sm font-bold border transition ${sel ? "bg-gradient-magic text-white border-magic shadow-magic" : "bg-secondary text-magic border-border"}`}>
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function NumberPicker({ value, onChange, max = 6 }: { value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const sel = value === n;
        return (
          <button key={n} onClick={() => onChange(n)}
            className={`rounded-xl py-3 text-sm font-extrabold border ${sel ? "bg-gradient-magic text-white border-magic" : "bg-secondary text-magic border-border"}`}>
            {n}{n === max ? "+" : ""}
          </button>
        );
      })}
    </div>
  );
}

function NavButtons({ onBack, onNext, nextLabel = "Continuar" }: { onBack: (() => void) | null; onNext: (() => void) | null; nextLabel?: string }) {
  return (
    <div className="mt-6 flex items-center gap-2">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-magic">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      )}
      <button onClick={onNext ?? undefined} disabled={!onNext}
        className="ml-auto flex items-center gap-1 rounded-2xl bg-gradient-gold px-5 py-3 text-sm font-extrabold text-magic shadow-gold disabled:opacity-50">
        {nextLabel} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

