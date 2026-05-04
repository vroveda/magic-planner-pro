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
