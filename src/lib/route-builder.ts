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
  /** Alturas das crianças em cm */
  childrenHeightsCm: number[];
  /** Histórico de espera: attractionId → { hora → minutos } */
  waitHistory: WaitHistory;
  /** Lista de atrações do parque */
  attractions: {
    id: string;
    min_height_cm: number | null;
    avg_duration_minutes: number | null;
    is_must_do: boolean;
    experience_type: string;
    lightning_lane_type: string;
    popularity_score?: number | null;
  }[];
};

// ---------- helpers ----------

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
 * Hierarquia de score (da mais para a menos importante):
 *
 * 1. popularity_score (1–10) — peso principal. Define quais atrações
 *    são icônicas do parque, independente de fila.
 *    Contribui com até 700 pontos (pop 10 = 700, pop 1 = 70).
 *
 * 2. is_must_do do usuário — override pessoal sobre a sugestão.
 *    Adiciona +200 pontos para garantir que entrem antes de qualquer outra.
 *
 * 3. Fila prevista — desempate entre atrações de mesma popularidade.
 *    Fila zero = +100pts, fila 60min = +40pts (penalidade suave).
 *    Não supera a diferença de um nível de popularidade.
 *
 * 4. Lightning Lane disponível — +20pts como bônus menor.
 */
export function buildSuggestion(ctx: SuggestionContext): SuggestionItem[] {
  const arrivalMin = timeToMinutes(ctx.arrivalTime);
  const closeMin = timeToMinutes(ctx.parkCloseTime ?? "22:00");
  const availableMin = Math.max(0, closeMin - arrivalMin);

  const scored: SuggestionItem[] = [];

  for (const a of ctx.attractions) {
    // Filtro de altura — exclui se alguma criança não atinge o mínimo
    const heightBlocked =
      a.min_height_cm != null &&
      ctx.childrenHeightsCm.some((h) => h < a.min_height_cm!);
    if (heightBlocked) continue;

    const pop = a.popularity_score ?? 5;
    const expectedWait = getExpectedWait(a.id, arrivalMin, ctx.waitHistory);

    // Score por popularidade — peso principal
    const popularityScore = pop * 70;

    // Override do usuário
    const mustDoBonus = a.is_must_do ? 200 : 0;

    // Fila como desempate suave entre atrações de mesma popularidade
    const waitScore = Math.max(40, 100 - Math.max(0, expectedWait));

    // Lightning Lane
    const llBonus = a.lightning_lane_type !== "none" ? 20 : 0;

    const score = popularityScore + mustDoBonus + waitScore + llBonus;

    let reason: string;
    if (a.is_must_do) {
      reason = `Marcada como obrigatória por você`;
    } else if (pop >= 9) {
      reason = `Ícone do parque — não pode perder`;
    } else if (pop >= 7) {
      reason = `Muito recomendada — fila prevista ~${expectedWait}min`;
    } else if (pop >= 5) {
      reason = `Boa atração — fila prevista ~${expectedWait}min`;
    } else {
      reason = `Complementar — fila curta (~${expectedWait}min)`;
    }

    scored.push({ attractionId: a.id, isMustDo: a.is_must_do, score, reason });
  }

  // Icônicas primeiro, fila como desempate
  scored.sort((a, b) => b.score - a.score);

  // Filtra o que cabe no dia acumulando tempo real
  const AVG_WALK = 5;
  let usedMin = 0;
  const result: SuggestionItem[] = [];

  for (const item of scored) {
    const a = ctx.attractions.find((x) => x.id === item.attractionId);
    if (!a) continue;

    const duration = a.avg_duration_minutes ?? 10;
    const wait = getExpectedWait(a.id, arrivalMin + usedMin, ctx.waitHistory);
    const totalCost = wait + duration + AVG_WALK;

    // Must-do e icônicas (pop >= 8) têm tolerância de 45min além do horário
    const tolerance = item.isMustDo || (a.popularity_score ?? 5) >= 8 ? 45 : 0;
    const fits = usedMin + totalCost <= availableMin + tolerance;

    if (fits) {
      usedMin += totalCost;
      result.push(item);
    }
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
