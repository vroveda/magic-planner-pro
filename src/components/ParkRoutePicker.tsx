import { useMemo, useState } from "react";
import {
  ArrowRight, ArrowLeft, ListChecks, RollerCoaster, Drama, HandHeart, Music,
  Sparkle, Sparkles, Zap, Gauge, Smartphone, Wand2, ChevronDown, Check, Star,
} from "lucide-react";
import { useAttractionsByPark, type TripPrefs, type Attraction } from "@/lib/queries";
import { buildSuggestion, type WaitHistory } from "@/lib/route-builder";

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

// Converte a faixa de altura do prefs para cm (valor mínimo da faixa)
function heightBandToCm(band: string): number {
  switch (band) {
    case "under_97": return 80;
    case "97_107": return 97;
    case "107_122": return 107;
    case "above_122": return 130;
    default: return 130;
  }
}

export function ParkRoutePicker({
  parkId, parkName, childrenPrefs, value, onChange, onBack, onNext,
  nextLabel = "Salvar roteiro", subtitle, headerExtra,
  usesLightningLane, onUsesLightningLaneChange,
  mustDoIds, onMustDoChange,
  // Contexto para a sugestão inteligente
  plannedArrivalTime,
  waitHistory = {},
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
  plannedArrivalTime?: string | null;
  waitHistory?: WaitHistory;
}) {
  const { data: attractions = [], isLoading } = useAttractionsByPark(parkId);
  const [legendOpen, setLegendOpen] = useState(true);
  const [suggestionReasons, setSuggestionReasons] = useState<Record<string, string>>({});

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
    if (attractions.length === 0) return;

    const childrenHeightsCm = childrenPrefs.map((c) => heightBandToCm(c.height));

    const suggestion = buildSuggestion({
      arrivalTime: plannedArrivalTime?.slice(0, 5) ?? "09:00",
      childrenHeightsCm,
      waitHistory,
      attractions: attractions.map((a) => ({
        id: a.id,
        min_height_cm: a.min_height_cm,
        avg_duration_minutes: a.avg_duration_minutes,
        is_must_do: a.is_must_do,
        experience_type: a.experience_type,
        lightning_lane_type: a.lightning_lane_type,
      })),
    });

    const ids = suggestion.map((s) => s.attractionId);
    const mustDos = suggestion.filter((s) => s.isMustDo).map((s) => s.attractionId);
    const reasons: Record<string, string> = {};
    for (const s of suggestion) reasons[s.attractionId] = s.reason;

    onChange(ids);
    onMustDoChange?.(mustDos);
    setSuggestionReasons(reasons);
  }

  function heightWarning(min: number | null) {
    if (!min || childrenPrefs.length === 0) return null;
    const blocked = childrenPrefs.filter((c) => {
      const cm = heightBandToCm(c.height);
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
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">Prioridade</p>
              <span className="inline-flex items-center gap-1 text-[11px] text-magic">
                <Star className="h-3.5 w-3.5 fill-gold text-gold" /> Obrigatório (não posso perder) — toque na estrela após selecionar
              </span>
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
                  const must = sel && (mustDoIds?.includes(a.id) ?? false);
                  const reason = suggestionReasons[a.id];
                  return (
                    <div key={a.id} role="button" tabIndex={0} onClick={() => toggle(a.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(a.id); } }}
                      className={`w-full text-left rounded-2xl border overflow-hidden transition cursor-pointer ${sel ? "bg-gradient-magic text-white border-magic shadow-magic" : "bg-card border-border"}`}>
                      {a.image_url && (
                        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                          <img src={a.image_url} alt={a.name} loading="lazy" className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="flex items-start gap-3 p-3">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${sel ? "bg-gold border-gold text-magic" : "border-border bg-card text-transparent"}`}>
                          <Check className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold leading-tight truncate">{a.name}</p>
                            {a.is_must_do && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${sel ? "bg-gold text-magic" : "bg-gradient-gold text-magic"}`}>IMPERDÍVEL</span>}
                            <LightningLaneIcon type={a.lightning_lane_type} selected={sel} />
                          </div>
                          {/* Razão da sugestão — aparece só quando veio da sugestão do app */}
                          {sel && reason && (
                            <p className="text-[10px] mt-0.5 font-bold text-white/70 flex items-center gap-1">
                              <Wand2 className="h-3 w-3" /> {reason}
                            </p>
                          )}
                          {a.short_description && (
                            <p className={`text-[11px] mt-0.5 leading-snug line-clamp-2 ${sel ? "text-white/80" : "text-muted-foreground"}`}>{a.short_description}</p>
                          )}
                          {warn && <p className={`text-[11px] mt-0.5 font-bold ${sel ? "text-gold" : "text-warning"}`}>{warn}</p>}
                        </div>
                        {sel && onMustDoChange && (
                          <button
                            type="button"
                            onClick={(e) => toggleMustDo(a.id, e)}
                            aria-pressed={must}
                            aria-label={must ? "Remover obrigatório" : "Marcar como obrigatório"}
                            title={must ? "Obrigatório (não posso perder)" : "Marcar como obrigatório"}
                            className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full transition ${must ? "bg-gold text-magic shadow-gold" : "bg-white/15 text-white hover:bg-white/25"}`}
                          >
                            <Star className={`h-4 w-4 ${must ? "fill-current" : ""}`} />
                          </button>
                        )}
                      </div>
                    </div>
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
