import { useMemo } from "react";
import { ArrowRight, ArrowLeft, ListChecks, RollerCoaster, Drama, HandHeart, Music, Sparkle, Sparkles, Zap, Gauge, Smartphone } from "lucide-react";
import { useAttractionsByPark, type TripPrefs } from "@/lib/queries";

export function ParkRoutePicker({
  parkId, parkName, childrenPrefs, value, onChange, onBack, onNext,
  nextLabel = "Salvar roteiro", subtitle, headerExtra,
}: {
  parkId: string;
  parkName: string;
  childrenPrefs: NonNullable<TripPrefs["children"]>;
  value: string[];
  onChange: (ids: string[]) => void;
  onBack?: (() => void) | null;
  onNext: (() => void) | null;
  nextLabel?: string;
  subtitle?: string;
  headerExtra?: React.ReactNode;
}) {
  const { data: attractions = [], isLoading } = useAttractionsByPark(parkId);
  const ordered = useMemo(() => {
    const selected = value.map((id) => attractions.find((a) => a.id === id)).filter(Boolean) as typeof attractions;
    const rest = attractions.filter((a) => !value.includes(a.id));
    return [...selected, ...rest];
  }, [attractions, value]);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }
  function useSuggested() {
    onChange(attractions.filter((a) => a.is_must_do).map((a) => a.id));
  }
  function heightWarning(min: number | null) {
    if (!min || childrenPrefs.length === 0) return null;
    const blocked = childrenPrefs.filter((c) => {
      const cm = c.height === "under_97" ? 80 : c.height === "97_107" ? 97 : c.height === "107_122" ? 107 : 122;
      return cm < min;
    });
    if (blocked.length === 0) return null;
    return `⚠️ Restrição (${min} cm) — ${blocked.length} criança(s)`;
  }

  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-1">
        <span><ListChecks className="inline h-3.5 w-3.5 mr-1" />{headerExtra ?? "Roteiro"}</span>
        <button onClick={useSuggested} className="text-magic underline">Usar sugerido</button>
      </div>
      <h2 className="font-display text-2xl font-bold text-magic">{parkName}</h2>
      <p className="text-sm text-muted-foreground">{subtitle ?? "Selecione na ordem de prioridade."}</p>

      <div className="mt-4 max-h-[60vh] overflow-y-auto -mx-2 px-2 space-y-2">
        {isLoading && <p className="text-muted-foreground text-sm">Carregando atrações…</p>}
        {ordered.map((a, idx) => {
          const sel = value.includes(a.id);
          const order = sel ? value.indexOf(a.id) + 1 : null;
          const warn = heightWarning(a.min_height_cm);
          return (
            <button key={a.id} onClick={() => toggle(a.id)}
              className={`w-full text-left flex items-start gap-3 rounded-2xl border p-3 transition ${sel ? "bg-gradient-magic text-white border-magic shadow-magic" : "bg-card border-border"}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-display font-bold text-sm ${sel ? "bg-gradient-gold text-magic" : "bg-secondary text-magic"}`}>
                {order ?? (idx + 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold leading-tight truncate">{a.name}</p>
                  {a.is_must_do && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${sel ? "bg-gold text-magic" : "bg-gradient-gold text-magic"}`}>IMPERDÍVEL</span>}
                  <ExperienceIcon type={a.experience_type} selected={sel} />
                  <LightningLaneIcon type={a.lightning_lane_type} selected={sel} />
                </div>
                {a.short_description && (
                  <p className={`text-[11px] mt-0.5 leading-snug line-clamp-2 ${sel ? "text-white/80" : "text-muted-foreground"}`}>{a.short_description}</p>
                )}
                {warn && <p className={`text-[11px] mt-0.5 font-bold ${sel ? "text-gold" : "text-warning"}`}>{warn}</p>}
              </div>
            </button>
          );
        })}
      </div>

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
    </div>
  );
}

function ExperienceIcon({ type, selected }: { type: string; selected: boolean }) {
  const map: Record<string, { icon: typeof RollerCoaster; label: string }> = {
    ride: { icon: RollerCoaster, label: "Atração" },
    show: { icon: Drama, label: "Show" },
    meet_greet: { icon: HandHeart, label: "Meet & Greet" },
    parade: { icon: Music, label: "Parada" },
    fireworks: { icon: Sparkle, label: "Fogos" },
    other: { icon: Sparkles, label: "Outro" },
  };
  const entry = map[type] ?? map.other;
  const Icon = entry.icon;
  return (
    <span title={entry.label} aria-label={entry.label}
      className={`inline-flex h-4 w-4 items-center justify-center ${selected ? "text-white/70" : "text-muted-foreground"}`}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

function LightningLaneIcon({ type, selected }: { type: string; selected: boolean }) {
  if (type === "none") return null;
  const map: Record<string, { icon: typeof Zap; label: string }> = {
    multipass: { icon: Zap, label: "Lightning Lane Multi Pass" },
    single_pass: { icon: Gauge, label: "Lightning Lane Single Pass" },
    virtual_queue: { icon: Smartphone, label: "Fila Virtual" },
  };
  const entry = map[type];
  if (!entry) return null;
  const Icon = entry.icon;
  return (
    <span title={entry.label} aria-label={entry.label}
      className={`inline-flex h-4 w-4 items-center justify-center ${selected ? "text-gold" : "text-magic"}`}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}
