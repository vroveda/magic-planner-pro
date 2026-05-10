import type { WalkMatrix } from "@/lib/route-builder";

// ---------- tipos ----------

export type DayPhase =
  | "rope_drop"
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "closing";

export type RecommendationType =
  | "go_now"           // janela boa — vai agora
  | "must_do_urgent"   // must-do em risco de não caber no dia
  | "follow_route"     // segue o plano, tudo normal
  | "route_detour"     // desvia do roteiro com motivo concreto
  | "closed"           // atração fechada — pula por enquanto
  | "day_complete";    // todas as atrações feitas

export type RecommendationUrgency = "low" | "medium" | "high";

export type SmartRecommendation = {
  type: RecommendationType;
  attraction_id?: string;
  title: string;
  message: string;
  /** motivo em uma linha — por que o app está recomendando isso */
  reason: string;
  urgency: RecommendationUrgency;
  /** 0–1 */
  confidence: number;
  /** score interno para ordenação */
  score: number;
};

export type AttractionInput = {
  id: string;
  name: string;
  /** is_must_do do banco (ícone do parque) */
  is_must_do: boolean;
  /** is_must_do do route_item (marcado pelo usuário) */
  route_is_must_do: boolean;
  experience_type: string;
  schedule_type?: "queue" | "showtime" | "both" | null;
  /** próximos horários de sessão (shows/meets com horário fixo) */
  show_next_times?: string[] | null;
  /** posição no roteiro (1-based) */
  route_position: number;
  visited: boolean;
  skipped: boolean;
  /** fila atual em minutos — null = sem dados */
  current_wait: number | null;
  /** status ao vivo */
  live_status: "operating" | "closed" | "down" | "refurbishment" | "unknown";
  /** média histórica para o horário atual */
  historical_avg: number | null;
  /** duração média dentro da atração em minutos */
  avg_duration_minutes: number | null;
  /** coordenadas para cálculo de proximidade */
  lat: number | null;
  lng: number | null;
  lightning_lane_type: string;
  popularity_score?: number | null;
};

export type RecommendationInput = {
  now: Date;
  parkCloseTime?: string;
  attractions: AttractionInput[];
  walkMatrix: WalkMatrix;
  userLat?: number | null;
  userLng?: number | null;
};

// ---------- getDayPhase ----------

export function getDayPhase(now: Date, parkCloseTime = "22:00"): DayPhase {
  const h = now.getHours() + now.getMinutes() / 60;
  const [ch, cm] = parkCloseTime.split(":").map(Number);
  const closeH = ch + cm / 60;
  const minutesToClose = (closeH - h) * 60;

  if (h < 9) return "rope_drop";
  if (h < 11) return "morning";
  if (h < 13) return "midday";
  if (h < 16) return "afternoon";
  if (minutesToClose <= 90) return "closing";
  return "evening";
}

function dayPhaseLabel(phase: DayPhase): string {
  switch (phase) {
    case "rope_drop": return "ainda estamos na abertura do parque";
    case "morning":   return "ainda estamos de manhã";
    case "midday":    return "já é meio-dia";
    case "afternoon": return "já é meio da tarde";
    case "evening":   return "o dia está chegando ao fim";
    case "closing":   return "o parque está prestes a fechar";
  }
}

// ---------- helpers ----------

function deviation(current: number, avg: number): number {
  if (avg <= 0) return 0;
  return (current - avg) / avg;
}

function minutesUntil(isoTime: string, now: Date): number {
  const target = new Date(isoTime);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

/** Minutos úteis restantes no parque (com buffer de 30min antes do fechamento) */
function availableMinutes(now: Date, parkCloseTime: string): number {
  const [ch, cm] = parkCloseTime.split(":").map(Number);
  const closeMin = ch * 60 + cm;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return Math.max(0, closeMin - nowMin - 30);
}

/** Custo estimado de uma atração em minutos (fila atual ou histórica + duração) */
function attractionCost(a: AttractionInput): number {
  const wait = a.current_wait ?? a.historical_avg ?? 20;
  const duration = a.avg_duration_minutes ?? 10;
  return wait + duration + 5; // +5 de caminhada média
}

// ---------- generateSmartRecommendations ----------

/**
 * Filosofia GPS: 1 recomendação principal clara + até 2 cards de contexto.
 *
 * Hierarquia (ordem de avaliação):
 * 1. Must-do em risco de não caber no dia → alerta urgente
 * 2. Must-do com janela boa agora (fila ≥ 20% abaixo da média) → vai agora
 * 3. Próxima do roteiro fechada → informa e sugere alternativa
 * 4. Próxima do roteiro com fila ruim mas há alternativa melhor → desvia com motivo
 * 5. Tudo normal → segue a próxima do roteiro
 *
 * Must-dos são garantias — o app monitora e alerta quando estão em risco.
 */
export function generateSmartRecommendations(
  input: RecommendationInput,
): SmartRecommendation[] {
  const { now, parkCloseTime = "22:00", attractions } = input;
  const phase = getDayPhase(now, parkCloseTime);
  const phaseLabel = dayPhaseLabel(phase);
  const availMin = availableMinutes(now, parkCloseTime);

  // Pendentes na ordem do roteiro
  const pending = attractions
    .filter((a) => !a.visited && !a.skipped)
    .sort((a, b) => a.route_position - b.route_position);

  // Dia completo
  if (pending.length === 0 && attractions.some((a) => a.visited)) {
    return [{
      type: "day_complete",
      title: "Roteiro concluído! 🎉",
      message: "Você fez tudo que planejou. Aproveite o parque livremente.",
      reason: "Todas as atrações do roteiro foram concluídas.",
      urgency: "low",
      confidence: 1,
      score: 1000,
    }];
  }

  if (pending.length === 0) return [];

  const nextInRoute = pending[0];
  const result: SmartRecommendation[] = [];

  // -------------------------------------------------------
  // CAMADA 1 — Must-do em risco de não caber no dia
  // -------------------------------------------------------
  const mustDosPending = pending.filter((a) => a.route_is_must_do || a.is_must_do);
  const mustDoTotalCost = mustDosPending.reduce((acc, a) => acc + attractionCost(a), 0);
  const mustDoAtRisk = mustDosPending.length > 0 && mustDoTotalCost > availMin && availMin < 180;

  if (mustDoAtRisk) {
    const names = mustDosPending.slice(0, 2).map((a) => a.name).join(" e ");
    const extra = mustDosPending.length > 2 ? ` (+${mustDosPending.length - 2})` : "";
    result.push({
      type: "must_do_urgent",
      attraction_id: mustDosPending[0].id,
      title: "⚠️ Must-dos em risco",
      message: `Ainda faltam: ${names}${extra}. No ritmo atual, pode não dar tempo.`,
      reason: `Como ${phaseLabel}, priorize agora o que não pode perder antes de encerrar o dia.`,
      urgency: "high",
      confidence: 0.9,
      score: 1000,
    });
  }

  // -------------------------------------------------------
  // CAMADA 2 — Must-do com janela boa agora
  // -------------------------------------------------------
  if (result.length === 0) {
    const mustDoWindow = mustDosPending.find((a) => {
      if (a.live_status !== "operating") return false;
      if (a.current_wait == null || a.historical_avg == null) return false;
      return deviation(a.current_wait, a.historical_avg) <= -0.2;
    });

    if (mustDoWindow) {
      const dev = deviation(mustDoWindow.current_wait!, mustDoWindow.historical_avg!);
      const pct = Math.round(Math.abs(dev) * 100);
      result.push({
        type: "go_now",
        attraction_id: mustDoWindow.id,
        title: `Hora de ir: ${mustDoWindow.name}`,
        message: `Fila ${pct}% abaixo da média — ${mustDoWindow.current_wait}min agora vs ${Math.round(mustDoWindow.historical_avg!)}min no histórico.`,
        reason: `Must-do com janela boa. Essa oportunidade pode fechar.`,
        urgency: pct >= 40 ? "high" : "medium",
        confidence: 0.85,
        score: 950,
      });
    }
  }

  // -------------------------------------------------------
  // CAMADA 3 — Próxima do roteiro fechada
  // -------------------------------------------------------
  if (result.length === 0) {
    const nextClosed =
      nextInRoute.live_status === "closed" ||
      nextInRoute.live_status === "down" ||
      nextInRoute.live_status === "refurbishment";

    if (nextClosed) {
      const nextAvailable = pending.find(
        (a) => a.id !== nextInRoute.id && a.live_status === "operating"
      );
      result.push({
        type: "closed",
        attraction_id: nextAvailable?.id ?? nextInRoute.id,
        title: `${nextInRoute.name} está fechada`,
        message: nextAvailable
          ? `Vá para ${nextAvailable.name} (próxima disponível no roteiro).`
          : "Aguarde reabertura ou explore o parque livremente.",
        reason: `Como ${phaseLabel}, não vale perder tempo esperando reabertura.`,
        urgency: nextInRoute.route_is_must_do ? "medium" : "low",
        confidence: 0.95,
        score: 800,
      });
    }
  }

  // -------------------------------------------------------
  // CAMADA 4 — Próxima do roteiro com fila ruim → desvio justificado
  // -------------------------------------------------------
  if (result.length === 0) {
    const nextOp = nextInRoute.live_status === "operating";
    const nextDev =
      nextOp && nextInRoute.current_wait != null && nextInRoute.historical_avg != null
        ? deviation(nextInRoute.current_wait, nextInRoute.historical_avg)
        : 0;

    if (nextDev >= 0.3) {
      // Busca alternativa com fila significativamente melhor
      const alt = pending
        .filter((a) => {
          if (a.id === nextInRoute.id) return false;
          if (a.live_status !== "operating") return false;
          if (a.current_wait == null || a.historical_avg == null) return false;
          // Alternativa precisa ser claramente melhor (pelo menos 25pp a menos)
          return deviation(a.current_wait, a.historical_avg) < nextDev - 0.25;
        })
        .sort((a, b) => {
          const dA = deviation(a.current_wait!, a.historical_avg!);
          const dB = deviation(b.current_wait!, b.historical_avg!);
          return dA - dB;
        })[0];

      if (alt) {
        const pct = Math.round(nextDev * 100);
        result.push({
          type: "route_detour",
          attraction_id: alt.id,
          title: "Desvio recomendado",
          message: `Fila de ${nextInRoute.name} está ${pct}% acima do normal (${nextInRoute.current_wait}min). Vá antes para ${alt.name} (${alt.current_wait}min).`,
          reason: `Como ${phaseLabel}, vale trocar a ordem para aproveitar melhor o tempo.`,
          urgency: pct >= 50 ? "high" : "medium",
          confidence: 0.75,
          score: 700,
        });
      }
    }
  }

  // -------------------------------------------------------
  // CAMADA 5 — Segue o plano (fallback padrão)
  // -------------------------------------------------------
  if (result.length === 0) {
    const waitInfo = nextInRoute.current_wait != null
      ? ` — fila atual: ${nextInRoute.current_wait}min`
      : "";

    // Verifica se é show com sessão próxima
    let showNote = "";
    if (
      (nextInRoute.schedule_type === "showtime" || nextInRoute.schedule_type === "both") &&
      nextInRoute.show_next_times?.length
    ) {
      const minsUntilShow = minutesUntil(nextInRoute.show_next_times[0], now);
      if (minsUntilShow > 0 && minsUntilShow <= 60) {
        showNote = ` Próxima sessão em ${minsUntilShow}min.`;
      }
    }

    result.push({
      type: "follow_route",
      attraction_id: nextInRoute.id,
      title: `Próxima: ${nextInRoute.name}`,
      message: `Continue conforme o roteiro${waitInfo}.${showNote}`,
      reason: `Nenhuma oportunidade melhor detectada. Como ${phaseLabel}, seguir o plano é a melhor estratégia.`,
      urgency: "low",
      confidence: 0.8,
      score: 500,
    });
  }

  // -------------------------------------------------------
  // CARDS SECUNDÁRIOS — contexto complementar
  // -------------------------------------------------------

  // Se a principal não é about must-do urgente mas há must-dos acumulando risco
  if (
    result.length < 3 &&
    result[0].type !== "must_do_urgent" &&
    mustDosPending.length > 0 &&
    mustDoTotalCost > availMin * 0.75
  ) {
    const mainId = result[0].attraction_id;
    const nextMustDo = mustDosPending.find((a) => a.id !== mainId);
    if (nextMustDo) {
      result.push({
        type: "must_do_urgent",
        attraction_id: nextMustDo.id,
        title: `Lembre: ${nextMustDo.name}`,
        message: `Must-do ainda pendente. Garanta que cabe no tempo restante do dia.`,
        reason: `Como ${phaseLabel}, monitore o tempo para não perder as prioridades.`,
        urgency: "medium",
        confidence: 0.8,
        score: 400,
      });
    }
  }

  // Show com sessão começando em breve
  if (result.length < 3) {
    const soonShow = pending.find((a) => {
      if (a.id === result[0]?.attraction_id) return false;
      if (!a.show_next_times?.length) return false;
      const min = minutesUntil(a.show_next_times[0], now);
      return min > 0 && min <= 30;
    });

    if (soonShow) {
      const min = minutesUntil(soonShow.show_next_times![0], now);
      result.push({
        type: "go_now",
        attraction_id: soonShow.id,
        title: `Show em ${min}min: ${soonShow.name}`,
        message: `Próxima sessão começa em ${min} minutos. Vá agora para garantir lugar.`,
        reason: "Shows têm horário fixo — se perder, o próximo pode ser daqui a horas.",
        urgency: min <= 15 ? "high" : "medium",
        confidence: 0.9,
        score: min <= 15 ? 750 : 350,
      });
    }
  }

  return result.slice(0, 3);
}
