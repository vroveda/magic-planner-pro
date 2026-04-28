export type Priority = "imperdivel" | "recomendada";

export type Attraction = {
  id: string;
  name: string;
  priority: Priority;
  tip: string;
  baseWait: number;
  hasLightningLane: boolean;
};

export type Park = {
  id: string;
  slug: "magic-kingdom" | "epcot" | "hollywood-studios" | "animal-kingdom";
  name: string;
  shortName: string;
  emoji: string;
  hue: string;
  attractions: Attraction[];
};

export const PARKS: Park[] = [
  {
    id: "mk", slug: "magic-kingdom", name: "Magic Kingdom", shortName: "Magic Kingdom",
    emoji: "🏰", hue: "from-pink-500 to-purple-600",
    attractions: [
      { id: "mk-7dmt", name: "Seven Dwarfs Mine Train", priority: "imperdivel", tip: "Vá logo na abertura — fila dobra após 10h.", baseWait: 75, hasLightningLane: true },
      { id: "mk-tron", name: "TRON Lightcycle / Run", priority: "imperdivel", tip: "Use Virtual Queue às 7h ou 13h em ponto.", baseWait: 90, hasLightningLane: true },
      { id: "mk-spacemtn", name: "Space Mountain", priority: "imperdivel", tip: "Vale a pena no fim do dia, fila some após o show.", baseWait: 55, hasLightningLane: true },
      { id: "mk-pirates", name: "Pirates of the Caribbean", priority: "recomendada", tip: "Clássico — fila anda rápido, vá entre 12h e 14h.", baseWait: 25, hasLightningLane: true },
      { id: "mk-haunted", name: "Haunted Mansion", priority: "recomendada", tip: "Mais atmosférica à noite. Fila maior após 15h.", baseWait: 40, hasLightningLane: true },
      { id: "mk-bigthunder", name: "Big Thunder Mountain", priority: "recomendada", tip: "Excelente segunda visita — pegue antes do desfile.", baseWait: 45, hasLightningLane: true },
    ],
  },
  {
    id: "ep", slug: "epcot", name: "EPCOT", shortName: "EPCOT",
    emoji: "🌐", hue: "from-cyan-500 to-blue-600",
    attractions: [
      { id: "ep-guardians", name: "Guardians of the Galaxy: Cosmic Rewind", priority: "imperdivel", tip: "Use Virtual Queue obrigatória — 7h ou 13h.", baseWait: 80, hasLightningLane: true },
      { id: "ep-frozen", name: "Frozen Ever After", priority: "imperdivel", tip: "Lightning Lane esgota cedo. Vá direto na abertura.", baseWait: 70, hasLightningLane: true },
      { id: "ep-testtrack", name: "Test Track", priority: "imperdivel", tip: "Single Rider corta a fila pela metade.", baseWait: 60, hasLightningLane: true },
      { id: "ep-soarin", name: "Soarin' Around the World", priority: "recomendada", tip: "Sente na fileira B1 para a melhor vista.", baseWait: 35, hasLightningLane: true },
      { id: "ep-remy", name: "Remy's Ratatouille Adventure", priority: "recomendada", tip: "França — vá durante o jantar para fila menor.", baseWait: 50, hasLightningLane: true },
    ],
  },
  {
    id: "hs", slug: "hollywood-studios", name: "Hollywood Studios", shortName: "Hollywood",
    emoji: "🎬", hue: "from-amber-500 to-red-600",
    attractions: [
      { id: "hs-rotr", name: "Rise of the Resistance", priority: "imperdivel", tip: "A melhor atração de Orlando. Vá nos 30 min iniciais.", baseWait: 95, hasLightningLane: true },
      { id: "hs-mfsr", name: "Millennium Falcon: Smugglers Run", priority: "imperdivel", tip: "Single Rider economiza muito tempo.", baseWait: 55, hasLightningLane: true },
      { id: "hs-slinky", name: "Slinky Dog Dash", priority: "imperdivel", tip: "Fila explode às 9h — chegue antes da abertura.", baseWait: 70, hasLightningLane: true },
      { id: "hs-tot", name: "Tower of Terror", priority: "recomendada", tip: "Vá no fim do dia — clima fica perfeito.", baseWait: 50, hasLightningLane: true },
      { id: "hs-rrc", name: "Rock 'n' Roller Coaster", priority: "recomendada", tip: "Single Rider + Lightning Lane = matador.", baseWait: 60, hasLightningLane: true },
    ],
  },
  {
    id: "ak", slug: "animal-kingdom", name: "Animal Kingdom", shortName: "Animal Kingdom",
    emoji: "🌳", hue: "from-emerald-500 to-green-700",
    attractions: [
      { id: "ak-fop", name: "Avatar Flight of Passage", priority: "imperdivel", tip: "Fila chega a 3h — vá direto antes da abertura oficial.", baseWait: 120, hasLightningLane: true },
      { id: "ak-everest", name: "Expedition Everest", priority: "imperdivel", tip: "Single Rider quase elimina a espera.", baseWait: 45, hasLightningLane: true },
      { id: "ak-navi", name: "Na'vi River Journey", priority: "recomendada", tip: "Linda mas curta — só vale com fila < 40 min.", baseWait: 55, hasLightningLane: true },
      { id: "ak-kilimanjaro", name: "Kilimanjaro Safaris", priority: "imperdivel", tip: "Vá cedo — animais ficam ativos pela manhã.", baseWait: 40, hasLightningLane: true },
      { id: "ak-dinosaur", name: "DINOSAUR", priority: "recomendada", tip: "Fila quase sempre vazia — clássico subestimado.", baseWait: 20, hasLightningLane: true },
    ],
  },
];

export const getPark = (slug: string) => PARKS.find((p) => p.slug === slug);

export function simulateWait(base: number): number {
  const hour = new Date().getHours();
  const peak = hour >= 11 && hour <= 16 ? 1.4 : hour < 9 ? 0.4 : 0.85;
  const jitter = (Math.sin(Date.now() / 60000 + base) + 1) * 0.15 + 0.85;
  return Math.max(5, Math.round(base * peak * jitter));
}

export function trend(current: number, base: number): "up" | "down" | "stable" {
  const diff = (current - base) / base;
  if (diff > 0.15) return "up";
  if (diff < -0.15) return "down";
  return "stable";
}

export function context(current: number, base: number): "below" | "avg" | "above" {
  const diff = (current - base) / base;
  if (diff < -0.1) return "below";
  if (diff > 0.15) return "above";
  return "avg";
}

export function nextLLSlot(): string {
  const d = new Date();
  d.setHours(d.getHours() + 2 + Math.floor(Math.random() * 3));
  d.setMinutes([0, 15, 30, 45][Math.floor(Math.random() * 4)]);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
