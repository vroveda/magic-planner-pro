import { useMemo, useState } from "react";
import {
  ArrowRight, ArrowLeft, ListChecks, RollerCoaster, Drama, HandHeart, Music,
  Sparkle, Sparkles, Zap, Gauge, Smartphone, Wand2, ChevronDown, Check, Star,
} from "lucide-react";
import { useAttractionsByPark, type TripPrefs, type Attraction } from "@/lib/queries";

const TYPE_ORDER: Attraction["experience_type"][] = ["ride", "show", "meet_greet", "parade", "fireworks", "other"];

const TYPE_META: Record<string, { icon: typeof RollerCoaster; label: string }> = {
  ride: { icon: RollerCoaster, label: "Atração" },
  show: { icon: Drama, label: "Show" },
  meet_greet: { icon: HandHeart, label: "Meet & Greet" },
  parade: { icon: Music, label: "Parada" },
  fireworks: { icon: Sparkle, label: "Fogos" },
  other: { icon: Sparkles, label: "Outro" },
};

const LL_META: Record<string, { icon: typeof Zap; label: string }> = {
  multipass: { icon: Zap, label: "Lightning Lane Multi Pass" },
  single_pass: { icon: Gauge, label: "Lightning Lane Single Pass" },
  virtual_queue: { icon: Smartphone, label: "Fila Virtual" },
};

export function ParkRoutePicker({
  parkId, parkName, childrenPrefs, value, onChange, onBack, onNext,
  nextLabel = "Salvar roteiro", subtitle, headerExtra,
  usesLightningLane, onUsesLightningLaneChange,
  mustDoIds, onMustDoChange,
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
  usesLightningLane?: boolean;
  onUsesLightningLaneChange?: (v: boolean) => void;
  mustDoIds?: string[];
  onMustDoChange?: (ids: string[]) => void;
}) {
  const { data: attractions = [], isLoading } = useAttractionsByPark(parkId);
  const [legendOpen, setLegendOpen] = useState(true);

  const grouped = useMemo(() => {
    const m = new Map<string, Attraction[]>();
    for (const a of attractions) {
      const k = a.experience_type;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(a);
    }
    return TYPE_ORDER
      .filter((t) => m.has(t))
      .map((t) => ({ type: t, items: m.get(t)! }));
  }, [attractions]);

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
      // unselecting also clears must-do
      if (mustDoIds?.includes(id)) onMustDoChange?.(mustDoIds.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  }
  function toggleMustDo(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!onMustDoChange) return;
    const cur = mustDoIds ?? [];
    onMustDoChange(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
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
        <button onClick={useSuggested} className="inline-flex items-center gap-1 text-magic underline">
          <Wand2 className="h-3.5 w-3.5" /> Sugestão do App
        </button>
      </div>
      <h2 className="font-display text-2xl font-bold text-magic">{parkName}</h2>
      <p className="text-sm text-muted-foreground">{subtitle ?? "Marque as atrações que quer fazer."}</p>

      {/* Legenda */}
      <div className="mt-3 rounded-2xl border border-border bg-secondary/40">
        <button
          onClick={() => setLegendOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-magic"
        >
          <span>Legenda dos ícones</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${legendOpen ? "rotate-180" : ""}`} />
        </button>
        {legendOpen && (
          <div className="px-3 pb-3 space-y-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">Tipo</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(TYPE_META).map(([k, m]) => {
                  const Icon = m.icon;
                  return (
                    <span key={k} className="inline-flex items-center gap-1 text-[11px] text-magic">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {m.label}
                    </span>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">Acesso rápido</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(LL_META).map(([k, m]) => {
                  const Icon = m.icon;
                  return (
                    <span key={k} className="inline-flex items-center gap-1 text-[11px] text-magic">
                      <Icon className="h-3.5 w-3.5 text-magic" /> {m.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {onUsesLightningLaneChange && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${usesLightningLane ? "bg-gradient-magic text-white" : "bg-secondary text-magic"}`}>
            <Zap className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display font-bold text-magic leading-tight">Vou usar Lightning Lane</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {usesLightningLane ? "Vamos sugerir os melhores horários para reservar." : "Ative se comprou Multi Pass / Single Pass."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!usesLightningLane}
            onClick={() => onUsesLightningLaneChange(!usesLightningLane)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${usesLightningLane ? "bg-gradient-magic" : "bg-muted"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${usesLightningLane ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      )}

      <div className="mt-4 max-h-[55vh] overflow-y-auto -mx-2 px-2 space-y-4">
        {isLoading && <p className="text-muted-foreground text-sm">Carregando atrações…</p>}
        {grouped.map(({ type, items }) => {
          const meta = TYPE_META[type];
          const Icon = meta.icon;
          const selectedCount = items.filter((a) => value.includes(a.id)).length;
          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <Icon className="h-4 w-4 text-magic" />
                <h3 className="font-display text-sm font-bold text-magic">{meta.label}</h3>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {selectedCount}/{items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((a) => {
                  const sel = value.includes(a.id);
                  const warn = heightWarning(a.min_height_cm);
                  return (
                    <button key={a.id} onClick={() => toggle(a.id)}
                      className={`w-full text-left flex items-start gap-3 rounded-2xl border p-3 transition ${sel ? "bg-gradient-magic text-white border-magic shadow-magic" : "bg-card border-border"}`}>
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${sel ? "bg-gold border-gold text-magic" : "border-border bg-card text-transparent"}`}>
                        <Check className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold leading-tight truncate">{a.name}</p>
                          {a.is_must_do && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${sel ? "bg-gold text-magic" : "bg-gradient-gold text-magic"}`}>IMPERDÍVEL</span>}
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
            </div>
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

function LightningLaneIcon({ type, selected }: { type: string; selected: boolean }) {
  if (type === "none") return null;
  const entry = LL_META[type];
  if (!entry) return null;
  const Icon = entry.icon;
  return (
    <span title={entry.label} aria-label={entry.label}
      className={`inline-flex h-4 w-4 items-center justify-center ${selected ? "text-gold" : "text-magic"}`}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}
