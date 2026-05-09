export type RouteInputItem = {
  attractionId: string;
  isMustDo: boolean;
  experienceType: string;
  avgDurationMinutes: number;
  fixedTime?: string | null;
};

export type WalkMatrix = Record<string, Record<string, number>>;
export type WaitHistory = Record<string, Record<number, number>>;

export type ScheduledItem = {
  attractionId: string;
  arrivalTime: string;
  estimatedWaitMinutes: number;
  walkFromPreviousMinutes: number;
  estimatedExitTime: string;
  isMustDo: boolean;
};

export type SuggestionItem = {
  attractionId: string;
  isMustDo: boolean;
  score: number;
  reason: string;
};

export type SuggestionContext = {
  /** HH:MM — hora prevista de chegada */
  arrivalTime: string;
  /** HH:MM — horário de fechamento estimado (default "22:00") */
  parkCloseTime?: string;
  /** Alturas das crianças em cm (0 = sem crianças) */
  childrenHeightsCm: number[];
  /** Histórico de espera: attractionId → { hora → minutos } */
  waitHistory: WaitHistory;
  /** Mapa id→ { min_height_cm, avg_duration_minutes, is_must_do, experience_type } */
  attractions: {
    id: string;
    min_height_cm: number | null;
    avg_duration_minutes: number | null;
    is_must_do: boolean;
    experience_type: string;
    lightning_lane_type: string;
  }[];
};

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getExpectedWait(
  attractionId: string,
  arrivalMinutes: number,
  waitHistory: WaitHistory,
): number {
  const hour = Math.floor(arrivalMinutes / 60) % 24;
  return waitHistory[attractionId]?.[hour] ?? 30;
}

function getWalk(fromId: string | null, toId: string, walkMatrix: WalkMatrix): number {
  if (!fromId) return 0;
  return walkMatrix[fromId]?.[toId] ?? walkMatrix[toId]?.[fromId] ?? 5;
}

// ---------- buildSuggestion ----------

/**
 * Monta uma sugestão inteligente de atrações para o dia.
 *
 * Lógica:
 * 1. Filtra atrações que teriam restrição de altura para alguma criança do grupo.
 * 2. Garante todos os must-dos que não foram filtrados.
 * 3. Estima a capacidade do dia (horas disponíveis).
 * 4. Completa com atrações por score (wait_penalty × tipo de experiência).
 * 5. Retorna lista priorizada com razão de inclusão.
 */
export function buildSuggestion(ctx: SuggestionContext): SuggestionItem[] {
  const arrivalMin = timeToMinutes(ctx.arrivalTime);
  const closeMin = timeToMinutes(ctx.parkCloseTime ?? "22:00");
  const availableMin = Math.max(0, closeMin - arrivalMin);

  // Score por tipo de experiência (rides valem mais cedo, shows/paradas têm horário fixo)
  const typeScore: Record<string, number> = {
    ride: 1.0,
    meet_greet: 0.8,
    show: 0.6,
    parade: 0.5,
    fireworks: 0.4,
    other: 0.3,
  };

  const scored: SuggestionItem[] = [];

  for (const a of ctx.attractions) {
    // --- filtro de altura ---
    const blocked =
      a.min_height_cm != null &&
      ctx.childrenHeightsCm.some((h) => h < a.min_height_cm!);

    if (blocked) continue;

    // --- espera prevista na hora de chegada ---
    const expectedWait = getExpectedWait(a.id, arrivalMin, ctx.waitHistory);

    // Penalidade por espera alta: quanto mais espera, menor o score
    // Score base 100, cai 1 ponto por minuto de espera acima de 20
    const waitPenalty = Math.max(0, expectedWait - 20);
    const waitScore = Math.max(0, 100 - waitPenalty);

    // Bônus must-do: garante prioridade máxima
    const mustDoBonus = a.is_must_do ? 200 : 0;

    // Bônus Lightning Lane: vale a pena incluir porque a espera é contornável
    const llBonus = a.lightning_lane_type !== "none" ? 20 : 0;

    const score = mustDoBonus + waitScore * (typeScore[a.experience_type] ?? 0.5) + llBonus;

    let reason: string;
    if (a.is_must_do && expectedWait <= 30) {
      reason = `Imperdível com fila razoável (~${expectedWait}min)`;
    } else if (a.is_must_do) {
      reason = `Imperdível — vale mesmo com fila (~${expectedWait}min)`;
    } else if (expectedWait <= 15) {
      reason = `Fila curta prevista (~${expectedWait}min)`;
    } else if (a.lightning_lane_type !== "none") {
      reason = `Lightning Lane disponível (fila ~${expectedWait}min)`;
    } else {
      reason = `Boa relação tempo/experiência`;
    }

    scored.push({ attractionId: a.id, isMustDo: a.is_must_do, score, reason });
  }

  // Ordena por score desc
  scored.sort((a, b) => b.score - a.score);

  // Estima quantas atrações cabem no dia
  // Usa a duração média + espera prevista para cada uma, na ordem de score
  let usedMin = 0;
  const result: SuggestionItem[] = [];
  const AVG_WALK = 5; // minutos de caminhada média entre atrações (conservador)

  for (const item of scored) {
    const a = ctx.attractions.find((x) => x.id === item.attractionId);
    if (!a) continue;

    const duration = a.avg_duration_minutes ?? 10;
    const wait = getExpectedWait(a.id, arrivalMin + usedMin, ctx.waitHistory);
    const totalCost = wait + duration + AVG_WALK;

    // Garante must-dos mesmo que extrapole um pouco (tolerância de 30min)
    const fits = usedMin + totalCost <= availableMin + (item.isMustDo ? 30 : 0);

    if (fits) {
      usedMin += totalCost;
      result.push(item);
    }

    // Para quando o dia está cheio (com folga de 30min para imprevistos)
    if (usedMin >= availableMin - 30 && !item.isMustDo) break;
  }

  return result;
}

// ---------- buildDayRoute (original, mantido) ----------

export function buildDayRoute(
  arrivalTime: string,
  items: RouteInputItem[],
  waitHistory: WaitHistory,
  walkMatrix: WalkMatrix,
  _dayOfWeek: number,
): { scheduled: ScheduledItem[]; feasibilityWarning: string | null } {
  if (items.length === 0) return { scheduled: [], feasibilityWarning: null };

  const arrivalMin = timeToMinutes(arrivalTime);
  const parkCloseMin = timeToMinutes("22:00");

  const mustDos = items.filter((i) => i.isMustDo);
  let mustDoTotalMin = 0;
  let prevId: string | null = null;
  for (const item of mustDos) {
    const walk = getWalk(prevId, item.attractionId, walkMatrix);
    const wait = getExpectedWait(item.attractionId, arrivalMin + mustDoTotalMin, waitHistory);
    mustDoTotalMin += walk + wait + item.avgDurationMinutes;
    prevId = item.attractionId;
  }

  const feasibilityWarning =
    mustDos.length > 0 && arrivalMin + mustDoTotalMin > parkCloseMin
      ? `⚠️ No ritmo atual, pode não dar tempo para todas as atrações obrigatórias. Considere chegar mais cedo ou reduzir a lista.`
      : null;

  const scheduled: ScheduledItem[] = [];
  let currentMinutes = arrivalMin;
  let previousId: string | null = null;

  for (const item of items) {
    const walkMin = getWalk(previousId, item.attractionId, walkMatrix);
    const arrMin = currentMinutes + walkMin;
    const waitMin = getExpectedWait(item.attractionId, arrMin, waitHistory);
    const exitMin = arrMin + waitMin + item.avgDurationMinutes;

    scheduled.push({
      attractionId: item.attractionId,
      arrivalTime: minutesToTime(arrMin),
      estimatedWaitMinutes: waitMin,
      walkFromPreviousMinutes: walkMin,
      estimatedExitTime: minutesToTime(exitMin),
      isMustDo: item.isMustDo,
    });

    currentMinutes = exitMin;
    previousId = item.attractionId;
  }

  return { scheduled, feasibilityWarning };
}
