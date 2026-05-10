/**
 * simulate-day.ts
 *
 * Simula um dia inteiro no Magic Kingdom, minuto a minuto (em steps de 15min),
 * com filas variando conforme o histórico real do banco, GPS movendo conforme
 * o roteiro, e marca atrações como visitadas conforme o tempo passa.
 *
 * Como rodar (no terminal do projeto):
 *   npx tsx scripts/simulate-day.ts
 *   npx tsx scripts/simulate-day.ts --scenario familia   # com criança
 *   npx tsx scripts/simulate-day.ts --scenario tarde     # chegada às 12h
 *   npx tsx scripts/simulate-day.ts --scenario vip       # só must-dos
 *
 * Saída: log colorido no terminal + JSON completo em simulate-day-result.json
 */

// ─── tipos inline (sem depender do projeto) ───────────────────────────────────

type DayPhase = "rope_drop" | "morning" | "midday" | "afternoon" | "evening" | "closing";

type RecommendationType =
  | "go_now" | "must_do_urgent" | "follow_route"
  | "route_detour" | "closed" | "day_complete";

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
  schedule_type?: string | null;
  show_next_times?: string[] | null;
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
  { id: "9d4d5229", name: "Seven Dwarfs Mine Train",       pop: 10, mustDo: true,  duration: 4,  lat: 28.42037,  lng: -81.58031, waitByHour: {9:61,10:70,11:50,12:82,13:85,14:85,15:82,16:83,17:82,18:80,19:74,20:67,21:60} },
  { id: "b2260923", name: "Space Mountain",                pop: 10, mustDo: true,  duration: 3,  lat: 28.41883,  lng: -81.57819, waitByHour: {9:30,10:46,11:58,12:60,13:60,14:60,15:58,16:59,17:58,18:60,19:57,20:51,21:44} },
  { id: "de3309ca", name: "Big Thunder Mountain Railroad", pop: 10, mustDo: true,  duration: 3,  lat: 28.41996,  lng: -81.58464, waitByHour: {9:20,10:37,11:44,12:45,13:47,14:44,15:42,16:44,17:43,18:43,19:39,20:32,21:26} },
  { id: "2551a77d", name: "Haunted Mansion",               pop: 10, mustDo: true,  duration: 9,  lat: 28.42020,  lng: -81.58288, waitByHour: {9:18,10:31,11:40,12:43,13:45,14:45,15:43,16:44,17:41,18:39,19:34,20:27,21:23} },
  { id: "352feb94", name: "Pirates of the Caribbean",      pop: 10, mustDo: false, duration: 9,  lat: 28.41797,  lng: -81.58422, waitByHour: {9:13,10:28,11:23,12:38,13:39,14:37,15:33,16:35,17:33,18:30,19:25,20:19,21:13} },
  { id: "5a43d1a7", name: "TRON Lightcycle / Run",         pop: 9,  mustDo: false, duration: 2,  lat: 28.41962,  lng: -81.57799, waitByHour: {9:67,10:65,11:41,12:68,13:66,14:65,15:66,16:70,17:72,18:80,19:73,20:72,21:77} },
  { id: "796b0a25", name: "Jungle Cruise",                 pop: 9,  mustDo: false, duration: 10, lat: 28.41797,  lng: -81.58343, waitByHour: {9:33,10:47,11:57,12:56,13:56,14:54,15:50,16:55,17:54,18:52,19:45,20:34,21:25} },
  { id: "86a41273", name: "Peter Pan's Flight",            pop: 9,  mustDo: false, duration: 3,  lat: 28.42026,  lng: -81.58189, waitByHour: {9:43,10:55,11:62,12:63,13:65,14:66,15:64,16:66,17:64,18:64,19:60,20:53,21:46} },
  { id: "890fa430", name: "Dumbo the Flying Elephant",     pop: 8,  mustDo: false, duration: 2,  lat: 28.42051,  lng: -81.57895, waitByHour: {9:9,10:16,11:13,12:25,13:25,14:26,15:22,16:23,17:22,18:20,19:17,20:14,21:10} },
  { id: "0d94ad60", name: "Winnie the Pooh",               pop: 8,  mustDo: false, duration: 5,  lat: 28.42021,  lng: -81.58027, waitByHour: {9:23,10:31,11:35,12:35,13:36,14:36,15:35,16:36,17:35,18:34,19:31,20:25,21:19} },
  { id: "e8f0b426", name: "Monsters Inc. Laugh Floor",     pop: 8,  mustDo: false, duration: 15, lat: 28.41840,  lng: -81.57974, waitByHour: {9:10,10:11,11:10,12:16,13:16,14:16,15:16,16:16,17:15,18:14,19:14,20:13,21:12} },
  { id: "3cba0cb4", name: "Little Mermaid",                pop: 8,  mustDo: false, duration: 6,  lat: 28.42112,  lng: -81.57998, waitByHour: {9:7,10:13,11:12,12:25,13:28,14:29,15:26,16:28,17:27,18:25,19:20,20:14,21:9} },
  { id: "e76c93df", name: "Enchanted Tales with Belle",    pop: 7,  mustDo: false, duration: 20, lat: 28.42099,  lng: -81.58093, waitByHour: {9:18,10:25,11:28,12:28,13:30,14:29,15:27,16:30,17:29,18:28,19:29,20:24,21:18} },
  { id: "7c5e1e02", name: "Mickey's PhilharMagic",         pop: 7,  mustDo: false, duration: 12, lat: 28.42003,  lng: -81.58148, waitByHour: {9:11,10:12,11:13,12:14,13:15,14:15,15:15,16:15,17:14,18:14,19:13,20:13,21:12} },
  { id: "f163ddcd", name: "Tomorrowland Speedway",         pop: 7,  mustDo: false, duration: 5,  lat: 28.41937,  lng: -81.57930, waitByHour: {9:16,10:21,11:14,12:25,13:25,14:25,15:23,16:24,17:23,18:23,19:22,20:20,21:16} },
];

// ─── cenários de simulação ────────────────────────────────────────────────────

type Scenario = {
  name: string;
  description: string;
  arrivalHour: number; // hora de chegada (ex: 9 = 9h00)
  closeHour: number;
  parkCloseTime: string;
  routeIds: string[]; // ordem do roteiro
  mustDoIds: string[]; // marcados pelo usuário como must-do
  hasChild: boolean;
  // variação artificial de filas para tornar o dia mais interessante
  queueEvents: Array<{ hour: number; attractionId: string; multiplier: number; reason: string }>;
};

const SCENARIOS: Record<string, Scenario> = {
  padrao: {
    name: "Dia Padrão",
    description: "Chegada cedo, roteiro equilibrado, sem surpresas",
    arrivalHour: 9,
    closeHour: 22,
    parkCloseTime: "22:00",
    routeIds: ["9d4d5229","b2260923","de3309ca","2551a77d","352feb94","796b0a25","86a41273","890fa430","0d94ad60","e8f0b426"],
    mustDoIds: ["9d4d5229","b2260923","de3309ca","2551a77d"],
    hasChild: false,
    queueEvents: [
      { hour: 11, attractionId: "2551a77d", multiplier: 0.6, reason: "Fila de Haunted Mansion caiu (manutenção resolvida)" },
      { hour: 14, attractionId: "b2260923", multiplier: 1.5, reason: "Space Mountain com fila alta (turno de escola)" },
      { hour: 17, attractionId: "9d4d5229", multiplier: 0.7, reason: "Seven Dwarfs com janela boa antes do show da noite" },
    ],
  },

  familia: {
    name: "Família com Criança",
    description: "Chegada às 9h, criança de 110cm, roteiro mais leve",
    arrivalHour: 9,
    closeHour: 21,
    parkCloseTime: "21:00",
    routeIds: ["890fa430","0d94ad60","3cba0cb4","7c5e1e02","e76c93df","2551a77d","352feb94","796b0a25","e8f0b426"],
    mustDoIds: ["2551a77d","352feb94"],
    hasChild: true,
    queueEvents: [
      { hour: 10, attractionId: "890fa430", multiplier: 0.5, reason: "Dumbo com fila curta cedo" },
      { hour: 13, attractionId: "2551a77d", multiplier: 0.7, reason: "Haunted Mansion: janela boa após almoço" },
      { hour: 16, attractionId: "3cba0cb4", multiplier: 1.4, reason: "Little Mermaid com fila subindo" },
    ],
  },

  tarde: {
    name: "Chegada Tarde",
    description: "Chegada ao meio-dia — dia curto, must-dos em risco",
    arrivalHour: 12,
    closeHour: 22,
    parkCloseTime: "22:00",
    routeIds: ["9d4d5229","b2260923","de3309ca","2551a77d","352feb94","796b0a25","86a41273"],
    mustDoIds: ["9d4d5229","b2260923","de3309ca","2551a77d"],
    hasChild: false,
    queueEvents: [
      { hour: 14, attractionId: "9d4d5229", multiplier: 1.3, reason: "Seven Dwarfs com fila alta no pico" },
      { hour: 18, attractionId: "de3309ca", multiplier: 0.6, reason: "Big Thunder caiu após hora do jantar" },
      { hour: 20, attractionId: "b2260923", multiplier: 0.65, reason: "Space Mountain mais acessível à noite" },
    ],
  },

  vip: {
    name: "Só Must-Dos",
    description: "Foco absoluto nas 4 must-dos, dia relaxado",
    arrivalHour: 9,
    closeHour: 22,
    parkCloseTime: "22:00",
    routeIds: ["9d4d5229","b2260923","de3309ca","2551a77d"],
    mustDoIds: ["9d4d5229","b2260923","de3309ca","2551a77d"],
    hasChild: false,
    queueEvents: [
      { hour: 10, attractionId: "9d4d5229", multiplier: 0.55, reason: "Seven Dwarfs com fila caindo" },
      { hour: 15, attractionId: "b2260923", multiplier: 0.6,  reason: "Space Mountain: janela no meio da tarde" },
    ],
  },
};

// ─── motor de recomendações (inline, sem import) ──────────────────────────────

function getDayPhase(h: number, closeHour: number): DayPhase {
  const minutesToClose = (closeHour - h) * 60;
  if (h < 9) return "rope_drop";
  if (h < 11) return "morning";
  if (h < 13) return "midday";
  if (h < 16) return "afternoon";
  if (minutesToClose <= 90) return "closing";
  return "evening";
}

function deviation(current: number, avg: number): number {
  if (avg <= 0) return 0;
  return (current - avg) / avg;
}

function availableMinutes(h: number, closeHour: number): number {
  return Math.max(0, (closeHour - h) * 60 - 30);
}

function attractionCost(a: AttractionInput): number {
  const wait = a.current_wait ?? a.historical_avg ?? 20;
  const duration = a.avg_duration_minutes ?? 10;
  return wait + duration + 5;
}

function generateRecs(
  now: { h: number; m: number },
  closeHour: number,
  attractions: AttractionInput[],
): SmartRecommendation[] {
  const h = now.h + now.m / 60;
  const phase = getDayPhase(h, closeHour);
  const phaseLabel = {
    rope_drop: "ainda estamos na abertura",
    morning: "ainda estamos de manhã",
    midday: "já é meio-dia",
    afternoon: "já é meio da tarde",
    evening: "o dia está chegando ao fim",
    closing: "o parque está prestes a fechar",
  }[phase];

  const availMin = availableMinutes(h, closeHour);
  const pending = attractions
    .filter((a) => !a.visited && !a.skipped)
    .sort((a, b) => a.route_position - b.route_position);

  if (pending.length === 0 && attractions.some((a) => a.visited)) {
    return [{ type: "day_complete", title: "Roteiro concluído! 🎉", message: "Dia completo.", reason: "Todas as atrações visitadas.", urgency: "low", confidence: 1, score: 1000 }];
  }
  if (pending.length === 0) return [];

  const nextInRoute = pending[0];
  const result: SmartRecommendation[] = [];

  const mustDosPending = pending.filter((a) => a.route_is_must_do || a.is_must_do);
  const mustDoTotalCost = mustDosPending.reduce((acc, a) => acc + attractionCost(a), 0);
  const mustDoAtRisk = mustDosPending.length > 0 && mustDoTotalCost > availMin && availMin < 180;

  if (mustDoAtRisk) {
    const names = mustDosPending.slice(0, 2).map((a) => a.name).join(" e ");
    const extra = mustDosPending.length > 2 ? ` (+${mustDosPending.length - 2})` : "";
    result.push({ type: "must_do_urgent", attraction_id: mustDosPending[0].id, title: "⚠️ Must-dos em risco", message: `Ainda faltam: ${names}${extra}. Pode não dar tempo.`, reason: `Como ${phaseLabel}, priorize agora.`, urgency: "high", confidence: 0.9, score: 1000 });
  }

  if (result.length === 0) {
    const mustDoWindow = mustDosPending.find((a) => {
      if (a.live_status !== "operating") return false;
      if (a.current_wait == null || a.historical_avg == null) return false;
      return deviation(a.current_wait, a.historical_avg) <= -0.2;
    });
    if (mustDoWindow) {
      const dev = deviation(mustDoWindow.current_wait!, mustDoWindow.historical_avg!);
      const pct = Math.round(Math.abs(dev) * 100);
      result.push({ type: "go_now", attraction_id: mustDoWindow.id, title: `Hora de ir: ${mustDoWindow.name}`, message: `Fila ${pct}% abaixo da média — ${mustDoWindow.current_wait}min agora vs ${Math.round(mustDoWindow.historical_avg!)}min histórico.`, reason: "Must-do com janela boa. Aproveite agora.", urgency: pct >= 40 ? "high" : "medium", confidence: 0.85, score: 950 });
    }
  }

  if (result.length === 0) {
    const nextClosed = ["closed","down","refurbishment"].includes(nextInRoute.live_status);
    if (nextClosed) {
      const nextAvailable = pending.find((a) => a.id !== nextInRoute.id && a.live_status === "operating");
      result.push({ type: "closed", attraction_id: nextAvailable?.id ?? nextInRoute.id, title: `${nextInRoute.name} está fechada`, message: nextAvailable ? `Vá para ${nextAvailable.name}.` : "Aguarde reabertura.", reason: `Como ${phaseLabel}, não vale esperar.`, urgency: nextInRoute.route_is_must_do ? "medium" : "low", confidence: 0.95, score: 800 });
    }
  }

  if (result.length === 0) {
    const nextOp = nextInRoute.live_status === "operating";
    const nextDev = nextOp && nextInRoute.current_wait != null && nextInRoute.historical_avg != null
      ? deviation(nextInRoute.current_wait, nextInRoute.historical_avg) : 0;

    if (nextDev >= 0.3) {
      const alt = pending
        .filter((a) => a.id !== nextInRoute.id && a.live_status === "operating" && a.current_wait != null && a.historical_avg != null && deviation(a.current_wait, a.historical_avg) < nextDev - 0.25)
        .sort((a, b) => deviation(a.current_wait!, a.historical_avg!) - deviation(b.current_wait!, b.historical_avg!))[0];
      if (alt) {
        const pct = Math.round(nextDev * 100);
        result.push({ type: "route_detour", attraction_id: alt.id, title: "Desvio recomendado", message: `Fila de ${nextInRoute.name} está ${pct}% acima do normal (${nextInRoute.current_wait}min). Vá antes para ${alt.name} (${alt.current_wait}min).`, reason: `Como ${phaseLabel}, vale reorganizar.`, urgency: pct >= 50 ? "high" : "medium", confidence: 0.75, score: 700 });
      }
    }
  }

  if (result.length === 0) {
    const waitInfo = nextInRoute.current_wait != null ? ` — fila: ${nextInRoute.current_wait}min` : "";
    result.push({ type: "follow_route", attraction_id: nextInRoute.id, title: `Próxima: ${nextInRoute.name}`, message: `Continue conforme o roteiro${waitInfo}.`, reason: `Como ${phaseLabel}, seguir o plano é a melhor estratégia.`, urgency: "low", confidence: 0.8, score: 500 });
  }

  return result.slice(0, 3);
}

// ─── simulação ────────────────────────────────────────────────────────────────

type SimStep = {
  time: string;
  phase: DayPhase;
  userLat: number;
  userLng: number;
  event?: string;
  attractions: Array<{ name: string; wait: number | null; status: string; visited: boolean; position: number }>;
  recommendations: SmartRecommendation[];
  visitedThisStep?: string;
};

function getWaitForHour(waitByHour: Record<number, number>, h: number, multiplier = 1): number {
  const base = waitByHour[h] ?? waitByHour[Math.max(...Object.keys(waitByHour).map(Number).filter((k) => k <= h))] ?? 20;
  // Adiciona variação aleatória determinística (±15%)
  const jitter = 1 + (Math.sin(h * 7.3 + base) * 0.15);
  return Math.max(1, Math.round(base * multiplier * jitter));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

async function run(scenarioKey: string) {
  const scenario = SCENARIOS[scenarioKey];
  if (!scenario) {
    console.error(`Cenário "${scenarioKey}" não encontrado. Opções: ${Object.keys(SCENARIOS).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n${"═".repeat(70)}`);
  console.log(`🎢  SIMULAÇÃO: ${scenario.name}`);
  console.log(`📋  ${scenario.description}`);
  console.log(`⏰  Chegada: ${scenario.arrivalHour}h00 | Fechamento: ${scenario.parkCloseTime}`);
  console.log(`🗺️   Roteiro: ${scenario.routeIds.length} atrações | Must-dos: ${scenario.mustDoIds.length}`);
  console.log(`${"═".repeat(70)}\n`);

  // Estado da simulação
  const visitedIds = new Set<string>();
  const steps: SimStep[] = [];
  const summary = {
    totalSteps: 0,
    visitedCount: 0,
    mustDosCompleted: 0,
    mustDosTotal: scenario.mustDoIds.length,
    recCounts: {} as Record<string, number>,
    detourCount: 0,
    urgentAlerts: 0,
    go_now_count: 0,
  };

  // Park entrance coords (Magic Kingdom main gate)
  const PARK_ENTRANCE = { lat: 28.4177, lng: -81.5812 };

  // Itera de 15 em 15 minutos
  const STEP_MINUTES = 15;
  const startMin = scenario.arrivalHour * 60;
  const endMin = scenario.closeHour * 60;

  let currentPositionIdx = 0; // qual atração do roteiro o usuário está "indo"

  for (let totalMin = startMin; totalMin <= endMin; totalMin += STEP_MINUTES) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    // Eventos de fila programados
    const activeEvents = scenario.queueEvents.filter((e) => e.hour === h);

    // Constrói estado atual das atrações
    const attractionStates: AttractionInput[] = ATTRACTIONS_RAW
      .filter((a) => scenario.routeIds.includes(a.id))
      .map((raw, idx) => {
        const routePos = scenario.routeIds.indexOf(raw.id) + 1;
        const event = activeEvents.find((e) => e.attractionId === raw.id);
        const multiplier = event?.multiplier ?? 1;
        const wait = getWaitForHour(raw.waitByHour as any, h, multiplier);

        return {
          id: raw.id,
          name: raw.name,
          is_must_do: raw.mustDo,
          route_is_must_do: scenario.mustDoIds.includes(raw.id),
          experience_type: "ride",
          schedule_type: "queue",
          show_next_times: null,
          route_position: routePos,
          visited: visitedIds.has(raw.id),
          skipped: false,
          current_wait: wait,
          live_status: "operating",
          historical_avg: getWaitForHour(raw.waitByHour as any, h, 1),
          avg_duration_minutes: raw.duration,
          lat: raw.lat,
          lng: raw.lng,
          lightning_lane_type: "none",
          popularity_score: raw.pop,
        } as AttractionInput;
      });

    // Posição GPS: interpola entre atrações conforme progresso
    const pending = attractionStates.filter((a) => !a.visited).sort((a, b) => a.route_position - b.route_position);
    const currentTarget = pending[0];
    const userLat = currentTarget?.lat ?? PARK_ENTRANCE.lat;
    const userLng = currentTarget?.lng ?? PARK_ENTRANCE.lng;

    // Gera recomendações
    const recs = generateRecs({ h, m }, scenario.closeHour, attractionStates);
    const mainRec = recs[0];

    // Determina evento de texto para o log
    let eventText: string | undefined;
    if (activeEvents.length > 0) {
      eventText = activeEvents.map((e) => `📊 ${e.reason}`).join(" | ");
    }

    // Simula visita: se a recomendação é follow_route ou go_now para uma atração,
    // e passou tempo suficiente desde a última visita, marca como visitada
    let visitedThisStep: string | undefined;
    if (mainRec?.attraction_id && (mainRec.type === "follow_route" || mainRec.type === "go_now")) {
      const target = attractionStates.find((a) => a.id === mainRec.attraction_id);
      if (target && !target.visited) {
        const cost = attractionCost(target);
        // Visita se passaram steps suficientes desde o início ou última visita
        const stepsSinceVisit = (totalMin - startMin) / STEP_MINUTES;
        const expectedStepsForCost = Math.ceil(cost / STEP_MINUTES);

        // Heurística: visita a cada ~(custo/STEP) steps da atração atual
        const visitKey = `visit_${target.id}`;
        const lastVisitMin = (global as any)[visitKey] ?? startMin - cost;
        if (totalMin - lastVisitMin >= cost) {
          visitedIds.add(target.id);
          (global as any)[visitKey] = totalMin;
          visitedThisStep = target.name;
          summary.visitedCount++;
          if (scenario.mustDoIds.includes(target.id)) summary.mustDosCompleted++;
        }
      }
    }

    // Registra step
    const step: SimStep = {
      time: timeStr,
      phase: getDayPhase(h + m / 60, scenario.closeHour),
      userLat,
      userLng,
      event: eventText,
      attractions: attractionStates.map((a) => ({
        name: a.name,
        wait: a.current_wait,
        status: a.live_status,
        visited: a.visited,
        position: a.route_position,
      })),
      recommendations: recs,
      visitedThisStep,
    };
    steps.push(step);
    summary.totalSteps++;

    // Contagens
    if (mainRec) {
      summary.recCounts[mainRec.type] = (summary.recCounts[mainRec.type] ?? 0) + 1;
      if (mainRec.urgency === "high") summary.urgentAlerts++;
      if (mainRec.type === "route_detour") summary.detourCount++;
      if (mainRec.type === "go_now") summary.go_now_count++;
    }

    // Log no terminal
    const phaseEmoji: Record<DayPhase, string> = {
      rope_drop: "🌅", morning: "☀️", midday: "🌞", afternoon: "🌤️", evening: "🌆", closing: "🌙",
    };
    const urgencyColor = { high: "\x1b[31m", medium: "\x1b[33m", low: "\x1b[32m" };
    const reset = "\x1b[0m";
    const dim = "\x1b[2m";
    const bold = "\x1b[1m";

    console.log(`${bold}${timeStr}${reset} ${phaseEmoji[step.phase]} ${dim}[${step.phase}]${reset}`);
    if (eventText) console.log(`  ${eventText}`);
    if (visitedThisStep) console.log(`  ✅ ${bold}VISITOU: ${visitedThisStep}${reset}`);

    const pending2 = attractionStates.filter((a) => !a.visited);
    console.log(`  📍 Pendentes: ${pending2.length} | Visitadas: ${visitedIds.size}/${scenario.routeIds.length}`);

    recs.forEach((rec, i) => {
      const color = rec.urgency === "high" ? urgencyColor.high : rec.urgency === "medium" ? urgencyColor.medium : urgencyColor.low;
      const prefix = i === 0 ? `${bold}→ [PRINCIPAL]${reset}` : `  [secundário]`;
      console.log(`  ${prefix} ${color}${rec.type.toUpperCase()}${reset} — ${rec.title}`);
      if (i === 0) console.log(`    ${dim}${rec.message}${reset}`);
    });
    console.log();

    if (mainRec?.type === "day_complete") break;
  }

  // ─── Relatório final ────────────────────────────────────────────────────────

  console.log(`${"═".repeat(70)}`);
  console.log(`📊  RELATÓRIO FINAL — ${scenario.name}`);
  console.log(`${"═".repeat(70)}`);
  console.log(`⏱️   Steps simulados: ${summary.totalSteps} (${summary.totalSteps * STEP_MINUTES}min = ${(summary.totalSteps * STEP_MINUTES / 60).toFixed(1)}h)`);
  console.log(`🎢  Atrações visitadas: ${summary.visitedCount}/${scenario.routeIds.length}`);
  console.log(`⭐  Must-dos concluídos: ${summary.mustDosCompleted}/${summary.mustDosTotal}`);
  console.log(`\n📋  Recomendações geradas por tipo:`);
  Object.entries(summary.recCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const bar = "█".repeat(Math.round(count / summary.totalSteps * 40));
      const pct = Math.round(count / summary.totalSteps * 100);
      console.log(`    ${type.padEnd(20)} ${String(count).padStart(3)}x  ${pct}%  ${bar}`);
    });
  console.log(`\n⚠️   Alertas urgentes: ${summary.urgentAlerts}`);
  console.log(`🔀  Desvios de rota sugeridos: ${summary.detourCount}`);
  console.log(`🟢  Go-now disparados: ${summary.go_now_count}`);

  // Atrações não visitadas
  const notVisited = ATTRACTIONS_RAW
    .filter((a) => scenario.routeIds.includes(a.id) && !visitedIds.has(a.id))
    .map((a) => a.name);
  if (notVisited.length > 0) {
    console.log(`\n❌  Não visitadas: ${notVisited.join(", ")}`);
  }

  const mustDosNotDone = scenario.mustDoIds.filter((id) => !visitedIds.has(id))
    .map((id) => ATTRACTIONS_RAW.find((a) => a.id === id)?.name ?? id);
  if (mustDosNotDone.length > 0) {
    console.log(`\n🚨  MUST-DOS NÃO CONCLUÍDOS: ${mustDosNotDone.join(", ")}`);
  } else {
    console.log(`\n✅  Todos os must-dos concluídos!`);
  }

  console.log(`${"═".repeat(70)}\n`);

  // Salva JSON completo
  const output = { scenario: scenario.name, summary, steps };
  const { writeFileSync } = await import("node:fs");
  const outPath = `simulate-day-result-${scenarioKey}.json`;
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`💾  Log completo salvo em: ${outPath}\n`);
}

// ─── entry point ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const scenarioArg = args.find((a) => a.startsWith("--scenario="))?.split("=")[1]
  ?? args[args.indexOf("--scenario") + 1]
  ?? "padrao";

// Roda todos os cenários se --all
if (scenarioArg === "all") {
  for (const key of Object.keys(SCENARIOS)) run(key);
} else {
  run(scenarioArg);
}
