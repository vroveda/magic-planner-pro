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
  | "go_now"
  | "wait_later"
  | "skip_for_now"
  | "nearby_opportunity"
  | "route_adjustment"
  | "closed"
  | "unknown";

export type RecommendationUrgency = "low" | "medium" | "high";

export type SmartRecommendation = {
  type: RecommendationType;
  attraction_id?: string;
  title: string;
  message: string;
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
  is_must_do: boolean;
  route_is_must_do: boolean;
  experience_type: string;
  /** índice original no roteiro (0-based) */
  route_position: number;
  visited: boolean;
  skipped: boolean;
  /** fila atual em minutos — null = sem dados */
  current_wait: number | null;
  /** status ao vivo */
  live_status: "operating" | "closed" | "down" | "refurbishment" | "unknown";
  /** média histórica para o horário atual */
  historical_avg: number | null;
  /** coordenadas para cálculo de proximidade */
  lat: number | null;
  lng: number | null;
  /** Lightning Lane */
  lightning_lane_type: string;
};

export type RecommendationInput = {
  /** hora atual local do dispositivo */
  now: Date;
  /** hora de fechamento do parque — default 22:00 */
  parkCloseTime?: string;
  attractions: AttractionInput[];
  walkMatrix: WalkMatrix;
  /** posição atual do usuário (geolocalização) */
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

function distanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function isNearby(a: AttractionInput, userLat: number, userLng: number): boolean {
  if (a.lat == null || a.lng == null) return false;
  return distanceMeters(userLat, userLng, a.lat, a.lng) <= 400;
}

// ---------- generateSmartRecommendations ----------

/**
 * Gera até 3 recomendações inteligentes baseadas no estado atual do roteiro.
 * Leva em conta fase do dia, filas, desvio histórico, must-dos e proximidade.
 */
export function generateSmartRecommendations(
  input: RecommendationInput,
): SmartRecommendation[] {
  const { now, parkCloseTime = "22:00", attractions, walkMatrix, userLat, userLng } = input;
  const phase = getDayPhase(now, parkCloseTime);
  const phaseLabel = dayPhaseLabel(phase);
  const recs: SmartRecommendation[] = [];

  // Atrações pendentes (não visitadas, não puladas)
  const pending = attractions.filter((a) => !a.visited && !a.skipped);

  // Próxima na ordem do roteiro
  const nextInRoute = [...pending].sort((a, b) => a.route_position - b.route_position)[0];

  // --- 1. Atrações fechadas entre as pendentes ---
  for (const a of pending) {
    if (a.live_status === "closed" || a.live_status === "refurbishment") {
      recs.push({
        type: "closed",
        attraction_id: a.id,
        title: `${a.name} está fechada`,
        message: `Pule por enquanto e volte mais tarde.`,
        reason: `Como ${phaseLabel}, não vale perder tempo esperando reabertura.`,
        urgency: a.route_is_must_do || a.is_must_do ? "medium" : "low",
        confidence: 0.95,
        score: a.route_is_must_do ? 60 : 20,
      });
    }
  }

  // --- 2. Must-do com fila abaixo da média (≥ 20%) → go_now ---
  for (const a of pending) {
    if (a.live_status !== "operating") continue;
    if (!a.route_is_must_do && !a.is_must_do) continue;
    if (a.current_wait == null || a.historical_avg == null) continue;

    const dev = deviation(a.current_wait, a.historical_avg);
    if (dev <= -0.2) {
      const pct = Math.round(Math.abs(dev) * 100);
      recs.push({
        type: "go_now",
        attraction_id: a.id,
        title: `Hora de ir: ${a.name}`,
        message: `Fila ${pct}% abaixo da média — ${a.current_wait}min agora vs ${Math.round(a.historical_avg)}min no histórico.`,
        reason: `Como ${phaseLabel}, essa janela pode fechar. Atrações must-do costumam lotar rápido.`,
        urgency: pct >= 40 ? "high" : "medium",
        confidence: 0.85,
        score: 900 + pct * 2,
      });
    }
  }

  // --- 3. Próxima do roteiro com fila ruim (≥ 30% acima) → route_adjustment ---
  if (nextInRoute && nextInRoute.live_status === "operating") {
    const { current_wait, historical_avg } = nextInRoute;
    if (current_wait != null && historical_avg != null) {
      const dev = deviation(current_wait, historical_avg);
      if (dev >= 0.3) {
        // Encontra alternativa pendente com fila melhor
        const alternative = pending
          .filter((a) => a.id !== nextInRoute.id && a.live_status === "operating" && a.current_wait != null && a.historical_avg != null)
          .sort((a, b) => {
            const devA = deviation(a.current_wait!, a.historical_avg!);
            const devB = deviation(b.current_wait!, b.historical_avg!);
            return devA - devB;
          })[0];

        const pct = Math.round(dev * 100);
        recs.push({
          type: "route_adjustment",
          attraction_id: alternative?.id ?? nextInRoute.id,
          title: `Ajuste de rota sugerido`,
          message: alternative
            ? `A fila de ${nextInRoute.name} está ${pct}% acima do normal. Considere ir antes para ${alternative.name} (${alternative.current_wait}min).`
            : `A fila de ${nextInRoute.name} está ${pct}% acima do normal. Pode valer esperar um pouco.`,
          reason: `Como ${phaseLabel}, vale reorganizar o roteiro para aproveitar melhor o tempo.`,
          urgency: pct >= 50 ? "high" : "medium",
          confidence: 0.75,
          score: 700 + pct,
        });
      }
    }
  }

  // --- 4. Oportunidade próxima ao usuário ---
  if (userLat != null && userLng != null) {
    const nearbyGood = pending
      .filter((a) => {
        if (a.live_status !== "operating") return false;
        if (a.current_wait == null || a.historical_avg == null) return false;
        if (!isNearby(a, userLat, userLng)) return false;
        return deviation(a.current_wait, a.historical_avg) <= -0.15;
      })
      .sort((a, b) => {
        const devA = deviation(a.current_wait!, a.historical_avg!);
        const devB = deviation(b.current_wait!, b.historical_avg!);
        return devA - devB;
      })[0];

    if (nearbyGood) {
      const pct = Math.round(Math.abs(deviation(nearbyGood.current_wait!, nearbyGood.historical_avg!)) * 100);
      recs.push({
        type: "nearby_opportunity",
        attraction_id: nearbyGood.id,
        title: `Oportunidade perto de você`,
        message: `${nearbyGood.name} está a poucos passos com fila ${pct}% abaixo da média (${nearbyGood.current_wait}min).`,
        reason: `Como ${phaseLabel}, vale aproveitar sem precisar cruzar o parque.`,
        urgency: "medium",
        confidence: 0.7,
        score: 650 + pct,
      });
    }
  }

  // --- 5. Fase: midday → sugerir atração interna/show se fila geral alta ---
  if (phase === "midday") {
    const indoorTypes = ["show", "meet_greet"];
    const goodIndoor = pending
      .filter((a) => {
        if (!indoorTypes.includes(a.experience_type)) return false;
        if (a.live_status !== "operating") return false;
        if (a.current_wait != null && a.current_wait > 30) return false;
        return true;
      })
      .sort((a, b) => (a.current_wait ?? 99) - (b.current_wait ?? 99))[0];

    if (goodIndoor) {
      recs.push({
        type: "go_now",
        attraction_id: goodIndoor.id,
        title: `Boa hora para ${goodIndoor.name}`,
        message: `Shows e encontros com personagens costumam ter menos concorrência no meio do dia.`,
        reason: `Como ${phaseLabel}, o calor e o movimento estão no pico. Atrações cobertas são ótima pedida.`,
        urgency: "low",
        confidence: 0.65,
        score: 400,
      });
    }
  }

  // --- 6. Closing → pendências must-do restantes ---
  if (phase === "closing") {
    const mustDoPending = pending.filter(
      (a) => (a.route_is_must_do || a.is_must_do) && a.live_status === "operating",
    );
    if (mustDoPending.length > 0) {
      const names = mustDoPending.map((a) => a.name).join(", ");
      recs.push({
        type: "go_now",
        attraction_id: mustDoPending[0].id,
        title: `Corra para as must-dos restantes`,
        message: `Ainda faltam: ${names}.`,
        reason: `Como ${phaseLabel}, priorize o que não pode perder antes de encerrar o dia.`,
        urgency: "high",
        confidence: 0.9,
        score: 950,
      });
    }
  }

  // --- 7. Fallback: seguir o roteiro ---
  if (nextInRoute && recs.filter((r) => r.type !== "closed").length === 0) {
    recs.push({
      type: "unknown",
      attraction_id: nextInRoute.id,
      title: `Siga o roteiro`,
      message: `Continue para ${nextInRoute.name} conforme planejado${nextInRoute.current_wait != null ? ` — fila atual: ${nextInRoute.current_wait}min` : ""}.`,
      reason: `Nenhuma grande oportunidade detectada agora. Como ${phaseLabel}, seguir o plano é a melhor estratégia.`,
      urgency: "low",
      confidence: 0.6,
      score: 100,
    });
  }

  // Deduplica por attraction_id, remove fechadas se já há recomendações ativas
  const seen = new Set<string>();
  const activeRecs = recs.filter((r) => r.type !== "closed");
  const closedRecs = recs.filter((r) => r.type === "closed");

  const deduped = [...activeRecs, ...closedRecs].filter((r) => {
    const key = r.attraction_id ?? r.type;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Ordena por score desc e retorna no máximo 3
  return deduped.sort((a, b) => b.score - a.score).slice(0, 3);
}
