/**
 * Aba de debug da sugestão inteligente — colar dentro de admin.tsx
 *
 * 1. Adicionar o import no topo de admin.tsx:
 *    import { SuggestionDebugTab } from "./admin.suggestion-tab";
 *    (ou copiar o componente diretamente no admin.tsx)
 *
 * 2. Adicionar na lista de TabsTrigger:
 *    <TabsTrigger value="suggestion">Sugestão</TabsTrigger>
 *
 * 3. Adicionar no final dos TabsContent:
 *    <TabsContent value="suggestion"><SuggestionDebugTab /></TabsContent>
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { buildSuggestion } from "@/lib/route-builder";

const DOWS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const HEIGHT_BANDS = [
  { value: "none", label: "Sem crianças" },
  { value: "under_97", label: "Criança < 97 cm" },
  { value: "97_107", label: "Criança 97–107 cm" },
  { value: "107_122", label: "Criança 107–122 cm" },
  { value: "above_122", label: "Criança > 122 cm" },
];

function heightBandToCm(band: string): number {
  switch (band) {
    case "under_97": return 80;
    case "97_107": return 97;
    case "107_122": return 107;
    case "above_122": return 130;
    default: return 130;
  }
}

function useParksForDebug() {
  return useQuery({
    queryKey: ["admin", "parks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parks").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useAttractionsForDebug(parkId: string) {
  return useQuery({
    queryKey: ["admin", "debug-attractions", parkId],
    enabled: !!parkId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attractions")
        .select("id, name, experience_type, is_must_do, min_height_cm, avg_duration_minutes, lightning_lane_type, popularity_score")
        .eq("park_id", parkId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useWaitHistoryForDebug(parkId: string, dow: number) {
  // Busca IDs das atrações primeiro
  const { data: attractions = [] } = useAttractionsForDebug(parkId);
  const ids = attractions.map((a) => a.id);

  return useQuery({
    queryKey: ["admin", "debug-wait-history", parkId, dow],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attraction_wait_history")
        .select("attraction_id, hour_of_day, average_wait_minutes")
        .in("attraction_id", ids)
        .eq("day_of_week", dow);
      if (error) throw error;
      const map: Record<string, Record<number, number>> = {};
      for (const row of (data ?? []) as { attraction_id: string; hour_of_day: number; average_wait_minutes: number }[]) {
        if (!map[row.attraction_id]) map[row.attraction_id] = {};
        map[row.attraction_id][row.hour_of_day] = row.average_wait_minutes;
      }
      return map;
    },
  });
}

export function SuggestionDebugTab() {
  const parks = useParksForDebug();
  const now = new Date();

  const [parkId, setParkId] = useState<string>("");
  const [dow, setDow] = useState<number>(now.getDay());
  const [arrivalTime, setArrivalTime] = useState<string>("09:00");
  const [closeTime, setCloseTime] = useState<string>("22:00");
  const [childBand, setChildBand] = useState<string>("none");

  const { data: attractions = [] } = useAttractionsForDebug(parkId);
  const { data: waitHistory = {} } = useWaitHistoryForDebug(parkId, dow);

  const childrenHeightsCm = childBand === "none" ? [] : [heightBandToCm(childBand)];

  const suggestion = useMemo(() => {
    if (!parkId || attractions.length === 0) return null;
    return buildSuggestion({
      arrivalTime,
      parkCloseTime: closeTime,
      childrenHeightsCm,
      waitHistory,
      attractions,
    });
  }, [parkId, attractions, waitHistory, arrivalTime, closeTime, childBand]);

  // Atrações excluídas (não aparecem na sugestão)
  const includedIds = new Set(suggestion?.map((s) => s.attractionId) ?? []);
  const excluded = attractions.filter((a) => !includedIds.has(a.id));

  // Calcula horas disponíveis
  const [ah, am] = arrivalTime.split(":").map(Number);
  const [ch, cm_] = closeTime.split(":").map(Number);
  const availableMin = Math.max(0, (ch * 60 + cm_) - (ah * 60 + am));

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="rounded-md border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Parâmetros da simulação</h2>
        <div className="flex flex-wrap gap-3">
          <Select value={parkId} onValueChange={setParkId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Parque" /></SelectTrigger>
            <SelectContent>
              {(parks.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(dow)} onValueChange={(v) => setDow(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOWS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Chegada</label>
            <input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)}
              className="rounded border border-input bg-background px-2 py-1 text-sm" />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Fechamento</label>
            <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)}
              className="rounded border border-input bg-background px-2 py-1 text-sm" />
          </div>

          <Select value={childBand} onValueChange={setChildBand}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {HEIGHT_BANDS.map((b) => (
                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {parkId && (
          <p className="text-xs text-muted-foreground">
            {availableMin} min disponíveis · {attractions.length} atrações no parque ·{" "}
            {Object.keys(waitHistory).length} com histórico de espera
          </p>
        )}
      </div>

      {!parkId && (
        <p className="text-sm text-muted-foreground">Selecione um parque para rodar a simulação.</p>
      )}

      {/* Resultado — incluídas */}
      {suggestion && suggestion.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">
            Sugeridas ({suggestion.length} atrações)
          </h2>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Atração</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Pop</th>
                  <th className="px-3 py-2 text-left">Score</th>
                  <th className="px-3 py-2 text-left">Razão</th>
                  <th className="px-3 py-2 text-left">Flags</th>
                </tr>
              </thead>
              <tbody>
                {suggestion.map((s, i) => {
                  const a = attractions.find((x) => x.id === s.attractionId);
                  return (
                    <tr key={s.attractionId} className={i % 2 === 0 ? "bg-secondary/30" : ""}>
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{a?.name ?? s.attractionId}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a?.experience_type}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-amber-600">{(a as any)?.popularity_score ?? "—"}</td>
                      <td className="px-3 py-2 font-mono font-semibold">{s.score.toFixed(0)}</td>
                      <td className="px-3 py-2">{s.reason}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 flex-wrap">
                          {s.isMustDo && (
                            <Badge variant="default" className="bg-amber-500 hover:bg-amber-500 text-[10px] px-1.5">must-do</Badge>
                          )}
                          {a?.lightning_lane_type !== "none" && (
                            <Badge variant="secondary" className="text-[10px] px-1.5">LL</Badge>
                          )}
                          {a?.min_height_cm && (
                            <Badge variant="outline" className="text-[10px] px-1.5">{a.min_height_cm}cm</Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Excluídas */}
      {suggestion && excluded.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Não incluídas ({excluded.length})
          </h2>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Atração</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Motivo provável</th>
                </tr>
              </thead>
              <tbody>
                {excluded.map((a, i) => {
                  // Determina motivo de exclusão
                  const heightBlocked =
                    a.min_height_cm != null &&
                    childrenHeightsCm.some((h) => h < a.min_height_cm!);

                  const reason = heightBlocked
                    ? `Restrição de altura (${a.min_height_cm}cm) — criança no grupo não atinge`
                    : "Dia cheio — score insuficiente para entrar no tempo disponível";

                  return (
                    <tr key={a.id} className={i % 2 === 0 ? "bg-secondary/30" : ""}>
                      <td className="px-3 py-2">{a.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.experience_type}</td>
                      <td className={`px-3 py-2 ${heightBlocked ? "text-destructive" : "text-muted-foreground"}`}>
                        {reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
