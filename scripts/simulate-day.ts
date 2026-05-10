/**
 * simulate-day.ts v2
 *
 * Correções em relação à v1:
 * 1. Heurística de visita corrigida — consome tempo real (fila + duração)
 *    acumulando minutos gastos por atração antes de marcar como visitada.
 * 2. Cooldown de GO_NOW — mesma atração não dispara alerta por 30min.
 * 3. Estado de "em progresso" — usuário fica na fila/atração até terminar.
 *
 * Como rodar:
 *   npx tsx scripts/simulate-day.ts
 *   npx tsx scripts/simulate-day.ts --scenario=familia
 *   npx tsx scripts/simulate-day.ts --scenario=tarde
 *   npx tsx scripts/simulate-day.ts --scenario=vip
 *   npx tsx scripts/simulate-day.ts --scenario=all
 */

// ─── tipos ────────────────────────────────────────────────────────────────────

type DayPhase = "rope_drop" | "morning" | "midday" | "afternoon" | "evening" | "closing";
type RecommendationType = "go_now" | "must_do_urgent" | "follow_route" | "route_detour" | "closed" | "day_complete";

type SmartRecommendation = {
  type: RecommendationType;
  attraction_id?: string;
  title: string;
  message: string;
  reason: string;
  urgency: "low" | "medium" | "high";
  confidence: number;
  score: number;
};

type AttractionInput = {
  id: string;
  name: string;
  is_must_do: boolean;
  route_is_must_do: boolean;
  experience_type: string;
  route_position: number;
  visited: boolean;
  skipped: boolean;
  current_wait: number | null;
  live_status: "operating" | "closed" | "down" | "refurbishment" | "unknown";
  historical_avg: number | null;
  avg_duration_minutes: number | null;
  lat: number | null;
  lng: number | null;
  lightning_lane_type: string;
  popularity_score?: number | null;
};

// ─── dados reais do banco (Magic Kingdom, domingo) ────────────────────────────

const ATTRACTIONS_RAW = [
  { id: "9d4d5229", name: "Seven Dwarfs Mine Train",       pop: 10, mustDo: true,  duration: 4,  lat: 28.42037, lng: -81.58031, waitByHour: {9:61,10:70,11:50,12:82,13:85,14:85,15:82,16:83,17:82,18:80,19:74,20:67,21:60} },
  { id: "b2260923", name: "Space Mountain",                pop: 10, mustDo: true,  duration: 3,  lat: 28.41883, lng: -81.57819, waitByHour: {9:30,10:46,11:58,12:60,13:60,14:60,15:58,16:59,17:58,18:60,19:57,20:51,21:44} },
  { id: "de3309ca", name: "Big Thunder Mountain Railroad", pop: 10, mustDo: true,  duration: 3,  lat: 28.41996, lng: -81.58464, waitByHour: {9:20,10:37,11:44,12:45,13:47,14:44,15:42,16:44,17:43,18:43,19:39,20:32,21:26} },
  { id: "2551a77d", name: "Haunted Mansion",               pop: 10, mustDo: true,  duration: 9,  lat: 28.42020, lng: -81.58288, waitByHour: {9:18,10:31,11:40,12:43,13:45,14:45,15:43,16:44,17:41,18:39,19:34,20:27,21:23} },
  { id: "352feb94", name: "Pirates of the Caribbean",      pop: 10, mustDo: false, duration: 9,  lat: 28.41797, lng: -81.58422, waitByHour: {9:13,10:28,11:23,12:38,13:39,14:37,15:33,16:35,17:33,18:30,19:25,20:19,21:13} },
  { id: "5a43d1a7", name: "TRON Lightcycle / Run",         pop: 9,  mustDo: false, duration: 2,  lat: 28.41962, lng: -81.57799, waitByHour: {9:67,10:65,11:41,12:68,13:66,14:65,15:66,16:70,17:72,18:80,19:73,20:72,21:77} },
  { id: "796b0a25", name: "Jungle Cruise",                 pop: 9,  mustDo: false, duration: 10, lat: 28.41797, lng: -81.58343, waitByHour: {9:33,10:47,11:57,12:56,13:56,14:54,15:50,16:55,17:54,18:52,19:45,20:34,21:25} },
  { id: "86a41273", name: "Peter Pan's Flight",            pop: 9,  mustDo: false, duration: 3,  lat: 28.42026, lng: -81.58189, waitByHour: {9:43,10:55,11:62,12:63,13:65,14:66,15:64,16:66,17:64,18:64,19:60,20:53,21:46} },
  { id: "890fa430", name: "Dumbo the Flying Elephant",     pop: 8,  mustDo: false, duration: 2,  lat: 28.42051, lng: -81.57895, waitByHour: {9:9,10:16,11:13,12:25,13:25,14:26,15:22,16:23,17:22,18:20,19:17,20:14,21:10} },
  { id: "0d94ad60", name: "Winnie the Pooh",               pop: 8,  mustDo: false, duration: 5,  lat: 28.42021, lng: -81.58027, waitByHour: {9:23,10:31,11:35,12:35,13:36,14:36,15:35,16:36,17:35,18:34,19:31,20:25,21:19} },
  { id: "e8f0b426", name: "Monsters Inc. Laugh Floor",     pop: 8,  mustDo: false, duration: 15, lat: 28.41840, lng: -81.57974, waitByHour: {9:10,10:11,11:10,12:16,13:16,14:16,15:16,16:16,17:15,18:14,19:14,20:13,21:12} },
  { id: "3cba0cb4", name: "Little Mermaid",                pop: 8,  mustDo: false, duration: 6,  lat: 28.42112, lng: -81.57998, waitByHour: {9:7,10:13,11:12,12:25,13:28,14:29,15:26,16:28,17:27,18:25,19:20,20:14,21:9} },
  { id: "e76c93df", name: "Enchanted Tales with Belle",    pop: 7,  mustDo: false, duration: 20, lat: 28.42099, lng: -81.58093, waitByHour: {9:18,10:25,11:28,12:28,13:30,14:29,15:27,16:30,17:29,18:28,19:29,20:24,21:18} },
  { id: "7c5e1e02", name: "Mickey's PhilharMagic",         pop: 7,  mustDo: false, duration: 12, lat: 28.42003, lng: -81.58148, waitByHour: {9:11,10:12,11:13,12:14,13:15,14:15,15:15,16:15,17:14,18:14,19:13,20:13,21:12} },
  { id: "f163ddcd", name: "Tomorrowland Speedway",         pop: 7,  mustDo: false, duration: 5,  lat: 28.41937, lng: -81.57930, waitByHour: {9:16,10:21,11:14,12:25,13:25,14:25,15:23,16:24,17:23,18:23,19:22,20:20,21:16} },
];

// ─── cenários ─────────────────────────────────────────────────────────────────

type Scenario = {
  name: string;
  description: string;
  arrivalHour: number;
  closeHour: number;
  parkCloseTime: string;
  routeIds: string[];
  mustDoIds: string[];
  queueEvents: Array<{ hour: number; attractionId: string; multiplier: number; reason: string }>;
};

const SCENARIOS: Record<string, Scenario> = {
  padrao: {
    name: "Dia Padrão",
    description: "Chegada cedo, roteiro equilibrado",
    arrivalHour: 9, closeHour: 22, parkCloseTime: "22:00",
    routeIds: ["9d4d5229","b2260923","de3309ca","2551a77d","352feb94","796b0a25","86a41273","890fa430","0d94ad60","e8f0b426"],
    mustDoIds: ["9d4d5229","b2260923","de3309ca","2551a77d"],
    queueEvents: [
      { hour: 11, attractionId: "2551a77d", multiplier: 0.6, reason: "Haunted Mansion: fila caiu após manutenção" },
      { hour: 14, attractionId: "b2260923", multiplier: 1.5, reason: "Space Mountain: fila alta (turno de escola)" },
      { hour: 17, attractionId: "9d4d5229", multiplier: 0.7, reason: "Seven Dwarfs: janela boa antes do show da noite" },
    ],
  },
  familia: {
    name: "Família com Criança",
    description: "Chegada às 9h, roteiro mais leve, fechamento às 21h",
    arrivalHour: 9, closeHour: 21, parkCloseTime: "21:00",
    routeIds: ["890fa430","0d94ad60","3cba0cb4","7c5e1e02","e76c93df","2551a77d","352feb94","796b0a25","e8f0b426"],
    mustDoIds: ["2551a77d","352feb94"],
    queueEvents: [
      { hour: 10, attractionId: "890fa430", multiplier: 0.5, reason: "Dumbo com fila curta cedo" },
      { hour: 13, attractionId: "2551a77d", multiplier: 0.7, reason: "Haunted Mansion: janela boa após almoço" },
      { hour: 16, attractionId: "3cba0cb4", multiplier: 1.4, reason: "Little Mermaid: fila subindo" },
    ],
  },
  tarde: {
    name: "Chegada Tarde",
    description: "Chegada ao meio-dia — must-dos em risco real",
    arrivalHour: 12, closeHour: 22, parkCloseTime: "22:00",
    routeIds: ["9d4d5229","b2260923","de3309ca","2551a77d","352feb94","796b0a25","86a41273"],
    mustDoIds: ["9d4d5229","b2260923","de3309ca","2551a77d"],
    queueEvents: [
      { hour: 14, attractionId: "9d4d5229", multiplier: 1.3, reason: "Seven Dwarfs: fila alta no pico" },
      { hour: 18, attractionId: "de3309ca", multiplier: 0.6, reason: "Big Thunder: caiu após jantar" },
      { hour: 20, attractionId: "b2260923", multiplier: 0.65, reason: "Space Mountain: mais acessível à noite" },
    ],
  },
  vip: {
    name: "Só Must-Dos",
    description: "Foco absoluto nas 4 must-dos",
    arrivalHour: 9, closeHour: 22, parkCloseTime: "22:00",
    routeIds: ["9d4d5229","b2260923","de3309ca","2551a77d"],
    mustDoIds: ["9d4d5229","b2260923","de3309ca","2551a77d"],
    queueEvents: [
      { hour: 10, attractionId: "9d4d5229", multiplier: 0.55, reason: "Seven Dwarfs: janela boa" },
      { hour: 15, attractionId: "b2260923", multiplier: 0.6,  reason: "Space Mountain: janela no meio da tarde" },
    ],
  },
};

// ─── motor de recomendações (inline) ─────────────────────────────────────────

function getDayPhase(h: number, closeHour: number): DayPhase {
  const minutesToClose = (closeHour - h) * 60;
  if (h < 9)  return "rope_drop";
  if (h < 11) return "morning";
  if (h < 13) return "midday";
  if (h < 16) return "afternoon";
  if (minutesToClose <= 90) return "closing";
  return "evening";
}

function phaseLabel(phase: DayPhase): string {
  return { rope_drop: "ainda estamos na abertura", morning: "ainda estamos de manhã", midday: "já é meio-dia", afternoon: "já é meio da tarde", evening: "o dia está chegando ao fim", closing: "o parque está prestes a fechar" }[phase];
}

function dev(current: number, avg: number): number {
  return avg <= 0 ? 0 : (current - avg) / avg;
}

function availMin(h: number, closeHour: number): number {
  return Math.max(0, (closeHour - h) * 60 - 30);
}

function cost(a: AttractionInput): number {
  return (a.current_wait ?? a.historical_avg ?? 20) + (a.avg_duration_minutes ?? 10) + 5;
}

function generateRecs(
  h: number,
  closeHour: number,
  attractions: AttractionInput[],
  goNowCooldown: Map<string, number>, // attractionId → última vez que disparou go_now (em min)
  nowMin: number,
): SmartRecommendation[] {
  const phase = getDayPhase(h, closeHour);
  const label = phaseLabel(phase);
  const avail = availMin(h, closeHour);
  const pending = attractions.filter(a => !a.visited && !a.skipped).sort((a,b) => a.route_position - b.route_position);

  if (pending.length === 0 && attractions.some(a => a.visited)) {
    return [{ type: "day_complete", title: "Roteiro concluído! 🎉", message: "Dia completo.", reason: "Todas as atrações visitadas.", urgency: "low", confidence: 1, score: 1000 }];
  }
  if (pending.length === 0) return [];

  const next = pending[0];
  const result: SmartRecommendation[] = [];
  const mustDos = pending.filter(a => a.route_is_must_do || a.is_must_do);
  const mustDosCost = mustDos.reduce((acc, a) => acc + cost(a), 0);
  const atRisk = mustDos.length > 0 && mustDosCost > avail && avail < 180;

  // Camada 1 — must-do em risco
  if (atRisk) {
    const names = mustDos.slice(0,2).map(a => a.name).join(" e ");
    const extra = mustDos.length > 2 ? ` (+${mustDos.length - 2})` : "";
    result.push({ type: "must_do_urgent", attraction_id: mustDos[0].id, title: "⚠️ Must-dos em risco", message: `Ainda faltam: ${names}${extra}. Pode não dar tempo.`, reason: `Como ${label}, priorize agora.`, urgency: "high", confidence: 0.9, score: 1000 });
  }

  // Camada 2 — must-do com janela boa (com cooldown)
  if (result.length === 0) {
    const window = mustDos.find(a => {
      if (a.live_status !== "operating") return false;
      if (a.current_wait == null || a.historical_avg == null) return false;
      if (dev(a.current_wait, a.historical_avg) > -0.2) return false;
      const lastAlert = goNowCooldown.get(a.id) ?? -999;
      return nowMin - lastAlert >= 30; // cooldown de 30min
    });
    if (window) {
      const d = dev(window.current_wait!, window.historical_avg!);
      const pct = Math.round(Math.abs(d) * 100);
      goNowCooldown.set(window.id, nowMin);
      result.push({ type: "go_now", attraction_id: window.id, title: `Hora de ir: ${window.name}`, message: `Fila ${pct}% abaixo da média — ${window.current_wait}min agora vs ${Math.round(window.historical_avg!)}min histórico.`, reason: "Must-do com janela boa. Aproveite agora.", urgency: pct >= 40 ? "high" : "medium", confidence: 0.85, score: 950 });
    }
  }

  // Camada 3 — próxima fechada
  if (result.length === 0 && ["closed","down","refurbishment"].includes(next.live_status)) {
    const alt = pending.find(a => a.id !== next.id && a.live_status === "operating");
    result.push({ type: "closed", attraction_id: alt?.id ?? next.id, title: `${next.name} está fechada`, message: alt ? `Vá para ${alt.name}.` : "Aguarde reabertura.", reason: `Como ${label}, não vale esperar.`, urgency: next.route_is_must_do ? "medium" : "low", confidence: 0.95, score: 800 });
  }

  // Camada 4 — desvio justificado
  if (result.length === 0 && next.live_status === "operating" && next.current_wait != null && next.historical_avg != null) {
    const nextDev = dev(next.current_wait, next.historical_avg);
    if (nextDev >= 0.3) {
      const alt = pending
        .filter(a => a.id !== next.id && a.live_status === "operating" && a.current_wait != null && a.historical_avg != null && dev(a.current_wait, a.historical_avg) < nextDev - 0.25)
        .sort((a,b) => dev(a.current_wait!, a.historical_avg!) - dev(b.current_wait!, b.historical_avg!))[0];
      if (alt) {
        const pct = Math.round(nextDev * 100);
        result.push({ type: "route_detour", attraction_id: alt.id, title: "Desvio recomendado", message: `Fila de ${next.name} está ${pct}% acima do normal (${next.current_wait}min). Vá antes para ${alt.name} (${alt.current_wait}min).`, reason: `Como ${label}, vale reorganizar.`, urgency: pct >= 50 ? "high" : "medium", confidence: 0.75, score: 700 });
      }
    }
  }

  // Camada 5 — segue o plano
  if (result.length === 0) {
    const waitInfo = next.current_wait != null ? ` — fila: ${next.current_wait}min` : "";
    result.push({ type: "follow_route", attraction_id: next.id, title: `Próxima: ${next.name}`, message: `Continue conforme o roteiro${waitInfo}.`, reason: `Como ${label}, seguir o plano é a melhor estratégia.`, urgency: "low", confidence: 0.8, score: 500 });
  }

  return result.slice(0, 3);
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getWait(waitByHour: Record<number, number>, h: number, mult = 1): number {
  const keys = Object.keys(waitByHour).map(Number).filter(k => k <= h);
  const base = keys.length > 0 ? waitByHour[Math.max(...keys)] : 20;
  const jitter = 1 + Math.sin(h * 7.3 + base) * 0.12;
  return Math.max(1, Math.round(base * mult * jitter));
}

// ─── simulação principal ──────────────────────────────────────────────────────

type StepLog = {
  time: string;
  phase: DayPhase;
  inProgress: string | null;
  minutesLeftInCurrent: number;
  event?: string;
  visitedThisStep?: string;
  recommendations: SmartRecommendation[];
  pendingCount: number;
  visitedCount: number;
};

async function run(scenarioKey: string) {
  const scenario = SCENARIOS[scenarioKey];
  if (!scenario) { console.error(`Cenário "${scenarioKey}" não encontrado.`); process.exit(1); }

  console.log(`\n${"═".repeat(70)}`);
  console.log(`🎢  SIMULAÇÃO: ${scenario.name}`);
  console.log(`📋  ${scenario.description}`);
  console.log(`⏰  Chegada: ${scenario.arrivalHour}h00 | Fechamento: ${scenario.parkCloseTime}`);
  console.log(`🗺️   Roteiro: ${scenario.routeIds.length} atrações | Must-dos: ${scenario.mustDoIds.length}`);
  console.log(`${"═".repeat(70)}\n`);

  // Estado
  const visitedIds = new Set<string>();
  const goNowCooldown = new Map<string, number>(); // cooldown de alertas por atração
  const steps: StepLog[] = [];

  const summary = {
    visitedCount: 0, mustDosCompleted: 0,
    recCounts: {} as Record<string, number>,
    detourCount: 0, urgentAlerts: 0, goNowCount: 0, totalSteps: 0,
  };

  const STEP = 15; // minutos por step
  const startMin = scenario.arrivalHour * 60;
  const endMin = scenario.closeHour * 60;

  // Estado de "em fila/atração agora"
  let inProgressId: string | null = null;      // ID da atração em progresso
  let minutesLeftInCurrent = 0;                // minutos até terminar a atual

  for (let nowMin = startMin; nowMin <= endMin; nowMin += STEP) {
    const h = nowMin / 60;
    const hInt = Math.floor(h);
    const m = nowMin % 60;
    const timeStr = `${String(hInt).padStart(2,"0")}:${String(m).padStart(2,"0")}`;

    const activeEvents = scenario.queueEvents.filter(e => e.hour === hInt);

    // Constrói estado das atrações
    const attrStates: AttractionInput[] = ATTRACTIONS_RAW
      .filter(a => scenario.routeIds.includes(a.id))
      .map(raw => {
        const mult = activeEvents.find(e => e.attractionId === raw.id)?.multiplier ?? 1;
        return {
          id: raw.id,
          name: raw.name,
          is_must_do: raw.mustDo,
          route_is_must_do: scenario.mustDoIds.includes(raw.id),
          experience_type: "ride",
          route_position: scenario.routeIds.indexOf(raw.id) + 1,
          visited: visitedIds.has(raw.id),
          skipped: false,
          current_wait: getWait(raw.waitByHour as any, hInt, mult),
          live_status: "operating" as const,
          historical_avg: getWait(raw.waitByHour as any, hInt, 1),
          avg_duration_minutes: raw.duration,
          lat: raw.lat, lng: raw.lng,
          lightning_lane_type: "none",
          popularity_score: raw.pop,
        };
      });

    // ── Consome tempo da atração em progresso ──
    let visitedThisStep: string | undefined;
    if (inProgressId) {
      minutesLeftInCurrent -= STEP;
      if (minutesLeftInCurrent <= 0) {
        // Concluiu!
        visitedIds.add(inProgressId);
        const name = ATTRACTIONS_RAW.find(a => a.id === inProgressId)?.name ?? inProgressId;
        visitedThisStep = name;
        summary.visitedCount++;
        if (scenario.mustDoIds.includes(inProgressId)) summary.mustDosCompleted++;
        inProgressId = null;
        minutesLeftInCurrent = 0;

        // Marca como visitada no estado local também
        const idx = attrStates.findIndex(a => a.id === inProgressId);
        // (já está em visitedIds, o map acima vai pegar na próxima iteração)
      }
    }

    // Atualiza visited no estado atual (para o motor ver corretamente)
    attrStates.forEach(a => { a.visited = visitedIds.has(a.id); });

    // ── Gera recomendações ──
    const recs = generateRecs(h, scenario.closeHour, attrStates, goNowCooldown, nowMin);
    const mainRec = recs[0];

    // ── Se não está em nenhuma atração, decide começar a próxima ──
    if (!inProgressId && mainRec?.attraction_id) {
      const target = attrStates.find(a => a.id === mainRec.attraction_id && !a.visited);
      if (target && (mainRec.type === "follow_route" || mainRec.type === "go_now" || mainRec.type === "route_detour")) {
        const wait = target.current_wait ?? 20;
        const duration = target.avg_duration_minutes ?? 10;
        inProgressId = target.id;
        minutesLeftInCurrent = wait + duration; // tempo total até sair da atração
      }
    }

    // ── Log de eventos ──
    const eventText = activeEvents.length > 0 ? activeEvents.map(e => `📊 ${e.reason}`).join(" | ") : undefined;

    const step: StepLog = {
      time: timeStr,
      phase: getDayPhase(h, scenario.closeHour),
      inProgress: inProgressId ? (ATTRACTIONS_RAW.find(a => a.id === inProgressId)?.name ?? null) : null,
      minutesLeftInCurrent,
      event: eventText,
      visitedThisStep,
      recommendations: recs,
      pendingCount: attrStates.filter(a => !a.visited).length,
      visitedCount: visitedIds.size,
    };
    steps.push(step);
    summary.totalSteps++;

    if (mainRec) {
      summary.recCounts[mainRec.type] = (summary.recCounts[mainRec.type] ?? 0) + 1;
      if (mainRec.urgency === "high") summary.urgentAlerts++;
      if (mainRec.type === "route_detour") summary.detourCount++;
      if (mainRec.type === "go_now") summary.goNowCount++;
    }

    // ── Terminal output ──
    const phaseEmoji: Record<DayPhase, string> = { rope_drop:"🌅", morning:"☀️", midday:"🌞", afternoon:"🌤️", evening:"🌆", closing:"🌙" };
    const R = "\x1b[0m", DIM = "\x1b[2m", B = "\x1b[1m";
    const RED = "\x1b[31m", YEL = "\x1b[33m", GRN = "\x1b[32m", CYN = "\x1b[36m";

    console.log(`${B}${timeStr}${R} ${phaseEmoji[step.phase]} ${DIM}[${step.phase}]${R}`);
    if (eventText) console.log(`  ${eventText}`);
    if (visitedThisStep) console.log(`  ✅ ${B}CONCLUIU: ${visitedThisStep}${R}`);
    if (step.inProgress && !visitedThisStep) {
      console.log(`  ${CYN}⏳ Em progresso: ${step.inProgress} (${Math.max(0, minutesLeftInCurrent)}min restantes)${R}`);
    }
    console.log(`  📍 Pendentes: ${step.pendingCount} | Visitadas: ${step.visitedCount}/${scenario.routeIds.length}`);

    recs.forEach((rec, i) => {
      const color = rec.urgency === "high" ? RED : rec.urgency === "medium" ? YEL : GRN;
      const prefix = i === 0 ? `${B}→ [PRINCIPAL]${R}` : `  [secundário]`;
      console.log(`  ${prefix} ${color}${rec.type.toUpperCase()}${R} — ${rec.title}`);
      if (i === 0) console.log(`    ${DIM}${rec.message}${R}`);
    });
    console.log();

    if (mainRec?.type === "day_complete") break;
  }

  // ── Relatório final ──
  console.log(`${"═".repeat(70)}`);
  console.log(`📊  RELATÓRIO FINAL — ${scenario.name}`);
  console.log(`${"═".repeat(70)}`);
  console.log(`⏱️   Steps: ${summary.totalSteps} × 15min = ${(summary.totalSteps * 15 / 60).toFixed(1)}h simuladas`);
  console.log(`🎢  Atrações visitadas: ${summary.visitedCount}/${scenario.routeIds.length}`);
  console.log(`⭐  Must-dos concluídos: ${summary.mustDosCompleted}/${scenario.mustDoIds.length}`);
  console.log(`\n📋  Recomendações por tipo:`);
  Object.entries(summary.recCounts).sort((a,b) => b[1]-a[1]).forEach(([type, count]) => {
    const bar = "█".repeat(Math.round(count / summary.totalSteps * 40));
    const pct = Math.round(count / summary.totalSteps * 100);
    console.log(`    ${type.padEnd(20)} ${String(count).padStart(3)}x  ${pct}%  ${bar}`);
  });
  console.log(`\n⚠️   Alertas urgentes: ${summary.urgentAlerts}`);
  console.log(`🔀  Desvios sugeridos: ${summary.detourCount}`);
  console.log(`🟢  Go-now disparados: ${summary.goNowCount}`);

  const notVisited = ATTRACTIONS_RAW.filter(a => scenario.routeIds.includes(a.id) && !visitedIds.has(a.id)).map(a => a.name);
  if (notVisited.length > 0) console.log(`\n❌  Não visitadas: ${notVisited.join(", ")}`);

  const mustDosNot = scenario.mustDoIds.filter(id => !visitedIds.has(id)).map(id => ATTRACTIONS_RAW.find(a => a.id === id)?.name ?? id);
  if (mustDosNot.length > 0) console.log(`\n🚨  MUST-DOS NÃO CONCLUÍDOS: ${mustDosNot.join(", ")}`);
  else console.log(`\n✅  Todos os must-dos concluídos!`);
  console.log(`${"═".repeat(70)}\n`);

  const { writeFileSync } = await import("node:fs");
  const outPath = `simulate-day-result-${scenarioKey}.json`;
  writeFileSync(outPath, JSON.stringify({ scenario: scenario.name, summary, steps }, null, 2));
  console.log(`💾  Log salvo em: ${outPath}\n`);
}

// ─── entry point ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const scenarioArg = args.find(a => a.startsWith("--scenario="))?.split("=")[1]
  ?? args[args.indexOf("--scenario") + 1]
  ?? "padrao";

(async () => {
  if (scenarioArg === "all") { for (const key of Object.keys(SCENARIOS)) await run(key); }
  else await run(scenarioArg);
})();
