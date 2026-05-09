import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SuggestionDebugTab } from "./admin.suggestion-tab";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const DOWS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function fmt(v: unknown) {
  if (v === null || v === undefined || v === "") return <span className="text-muted-foreground">—</span>;
  if (typeof v === "boolean") return v ? "✓" : "—";
  return String(v);
}

function fmtDate(v: string | null | undefined) {
  if (!v) return <span className="text-muted-foreground">—</span>;
  try {
    return new Date(v).toLocaleString("pt-BR");
  } catch {
    return v;
  }
}

function DataTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-xs">
        <thead className="bg-secondary">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-2 py-2 text-left font-semibold">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-2 py-6 text-center text-muted-foreground">
                Sem dados
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-secondary/30" : ""}>
              {r.map((cell, j) => (
                <td key={j} className="px-2 py-1.5 align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function useParks() {
  return useQuery({
    queryKey: ["admin", "parks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parks").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });
}

function useAttractions() {
  return useQuery({
    queryKey: ["admin", "attractions-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attractions")
        .select("id, name, park_id")
        .order("name")
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });
}

function LiveStatusTab() {
  const q = useQuery({
    queryKey: ["admin", "live"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attraction_live_status")
        .select("*, attractions(name, parks(name))")
        .order("captured_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
  const rows = (q.data ?? []).map((r: any) => [
    fmt(r.attractions?.name),
    fmt(r.attractions?.parks?.name),
    fmt(r.current_wait_minutes),
    fmt(r.status),
    fmt(r.lightning_lane_available),
    fmtDate(r.captured_at),
  ]);
  return <DataTable columns={["Atração", "Parque", "Fila (min)", "Status", "LL", "Capturado"]} rows={rows} />;
}

function HistoryTab() {
  const parks = useParks();
  const now = new Date();
  const [parkId, setParkId] = useState<string>("all");
  const [dow, setDow] = useState<number>(now.getDay());
  const [hour, setHour] = useState<number>(now.getHours());

  const q = useQuery({
    queryKey: ["admin", "history", parkId, dow, hour],
    queryFn: async () => {
      let query = supabase
        .from("attraction_wait_history")
        .select("*, attractions!inner(name, park_id, parks(name))")
        .eq("day_of_week", dow)
        .eq("hour_of_day", hour)
        .order("average_wait_minutes", { ascending: false })
        .limit(200);
      if (parkId !== "all") query = query.eq("attractions.park_id", parkId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const rows = (q.data ?? []).map((r: any) => [
    fmt(r.attractions?.name),
    fmt(r.attractions?.parks?.name),
    DOWS[r.day_of_week],
    `${r.hour_of_day}h`,
    Number(r.average_wait_minutes).toFixed(1),
    fmt(r.sample_count),
  ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={parkId} onValueChange={setParkId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Parque" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os parques</SelectItem>
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
        <Select value={String(hour)} onValueChange={(v) => setHour(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 24 }, (_, i) => (
              <SelectItem key={i} value={String(i)}>{i}h</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={["Atração", "Parque", "Dia", "Hora", "Média (min)", "Amostras"]}
        rows={rows}
      />
    </div>
  );
}

function WalkTab() {
  const attractions = useAttractions();
  const [originId, setOriginId] = useState<string>("");

  useEffect(() => {
    if (!originId && attractions.data?.[0]) setOriginId(attractions.data[0].id);
  }, [attractions.data, originId]);

  const q = useQuery({
    queryKey: ["admin", "walk", originId],
    enabled: !!originId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attraction_walk_minutes")
        .select("*, origin:attractions!attraction_walk_minutes_origin_id_fkey(name), dest:attractions!attraction_walk_minutes_dest_id_fkey(name)")
        .eq("origin_id", originId)
        .order("walk_minutes")
        .limit(200);
      if (error) {
        // Fallback if FK names aren't set up — query without joins
        const { data: raw, error: e2 } = await supabase
          .from("attraction_walk_minutes")
          .select("*")
          .eq("origin_id", originId)
          .order("walk_minutes")
          .limit(200);
        if (e2) throw e2;
        return raw;
      }
      return data;
    },
  });

  const attrMap = useMemo(() => {
    const m = new Map<string, string>();
    (attractions.data ?? []).forEach((a) => m.set(a.id, a.name));
    return m;
  }, [attractions.data]);

  const rows = (q.data ?? []).map((r: any) => [
    fmt(r.origin?.name ?? attrMap.get(r.origin_id) ?? r.origin_id),
    fmt(r.dest?.name ?? attrMap.get(r.dest_id) ?? r.dest_id),
    fmt(r.walk_minutes),
  ]);

  return (
    <div className="space-y-3">
      <Select value={originId} onValueChange={setOriginId}>
        <SelectTrigger className="w-72"><SelectValue placeholder="Atração de origem" /></SelectTrigger>
        <SelectContent>
          {(attractions.data ?? []).map((a) => (
            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DataTable columns={["Origem", "Destino", "Caminhada (min)"]} rows={rows} />
    </div>
  );
}

function SyncTab() {
  const q = useQuery({
    queryKey: ["admin", "sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sync_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
  const rows = (q.data ?? []).map((r: any) => [
    fmt(r.source),
    fmt(r.sync_type),
    <Badge
      key="s"
      variant={r.status === "success" ? "default" : r.status === "error" ? "destructive" : "secondary"}
      className={r.status === "success" ? "bg-green-600 hover:bg-green-600" : ""}
    >
      {r.status}
    </Badge>,
    fmtDate(r.started_at),
    fmtDate(r.finished_at),
    fmt(r.records_processed),
    fmt(r.error_message),
  ]);
  return <DataTable columns={["Source", "Tipo", "Status", "Início", "Fim", "Registros", "Erro"]} rows={rows} />;
}

function AttractionsTab() {
  const parks = useParks();
  const [parkId, setParkId] = useState<string>("");
  useEffect(() => {
    if (!parkId && parks.data?.[0]) setParkId(parks.data[0].id);
  }, [parks.data, parkId]);

  const q = useQuery({
    queryKey: ["admin", "attractions", parkId],
    enabled: !!parkId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attractions")
        .select("name, experience_type, avg_duration_minutes, is_must_do, min_height_cm, lightning_lane_type, queue_times_id, external_id")
        .eq("park_id", parkId)
        .order("name")
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const rows = (q.data ?? []).map((r: any) => [
    fmt(r.name),
    fmt(r.experience_type),
    fmt(r.avg_duration_minutes),
    fmt(r.is_must_do),
    fmt(r.min_height_cm),
    fmt(r.lightning_lane_type),
    fmt(r.queue_times_id),
    fmt(r.external_id),
  ]);

  return (
    <div className="space-y-3">
      <Select value={parkId} onValueChange={setParkId}>
        <SelectTrigger className="w-64"><SelectValue placeholder="Parque" /></SelectTrigger>
        <SelectContent>
          {(parks.data ?? []).map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DataTable
        columns={["Nome", "Tipo", "Duração", "Must-do", "Altura mín", "LL", "QT ID", "External ID"]}
        rows={rows}
      />
    </div>
  );
}

type SortKey = "samples_desc" | "avg_desc" | "avg_asc" | "updated_desc";

function PipelineHealth() {
  const collection = useQuery({
    queryKey: ["admin", "ownbase", "pipeline", "collection"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sync_runs")
        .select("status, started_at, records_processed")
        .eq("source", "themeparks.wiki")
        .order("started_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const aggregation = useQuery({
    queryKey: ["admin", "ownbase", "pipeline", "aggregation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sync_runs")
        .select("status, started_at, records_processed")
        .eq("source", "live_aggregation")
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const snapshots = useQuery({
    queryKey: ["admin", "ownbase", "pipeline", "snapshots-summary"],
    queryFn: async () => {
      const { count } = await supabase
        .from("attraction_condition_snapshots")
        .select("*", { count: "exact", head: true });
      const { data: first } = await supabase
        .from("attraction_condition_snapshots")
        .select("captured_at")
        .order("captured_at", { ascending: true })
        .limit(1);
      const { data: last } = await supabase
        .from("attraction_condition_snapshots")
        .select("captured_at")
        .order("captured_at", { ascending: false })
        .limit(1);
      const { data: distinctRows } = await supabase
        .from("attraction_condition_snapshots")
        .select("attraction_id")
        .limit(20000);
      const distinct = new Set((distinctRows ?? []).map((r: any) => r.attraction_id)).size;
      return {
        count: count ?? 0,
        first: first?.[0]?.captured_at ?? null,
        last: last?.[0]?.captured_at ?? null,
        distinct,
      };
    },
  });

  const collLast = collection.data?.[0];
  const aggLast = aggregation.data?.[0];
  const aggSuccess = (aggregation.data ?? []).filter((r) => r.status === "success").length;
  const aggTotal = aggregation.data?.length ?? 0;
  const aggLastSuccess = (aggregation.data ?? []).find((r) => r.status === "success");

  const collIndicator = !collLast
    ? { label: "Sem execuções", className: "text-muted-foreground" }
    : collLast.status === "success"
      ? { label: "✅ Operacional", className: "text-emerald-600" }
      : { label: "🔴 Com falha", className: "text-destructive" };

  const aggIndicator = !aggLast
    ? { label: "Sem execuções", className: "text-muted-foreground" }
    : aggLast.status !== "success"
      ? { label: "🔴 Com falha", className: "text-destructive" }
      : aggSuccess < 8
        ? { label: "⚠️ Instável", className: "text-amber-600" }
        : { label: "✅ Operacional", className: "text-emerald-600" };

  const StatusBadge = ({ status }: { status?: string }) => (
    <Badge
      variant={status === "success" ? "default" : status === "error" ? "destructive" : "secondary"}
      className={status === "success" ? "bg-green-600 hover:bg-green-600" : ""}
    >
      {status ?? "—"}
    </Badge>
  );

  const fmtSpan = (a: string | null, b: string | null) => {
    if (!a || !b) return "—";
    const ms = new Date(b).getTime() - new Date(a).getTime();
    const days = Math.floor(ms / 86_400_000);
    const hours = Math.floor((ms % 86_400_000) / 3_600_000);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Saúde do Pipeline</h2>
        <p className="text-xs text-muted-foreground">Jobs de coleta e agregação</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Coleta (a cada 5 min)</h3>
            <StatusBadge status={collLast?.status} />
          </div>
          <div className={`text-sm font-medium ${collIndicator.className}`}>{collIndicator.label}</div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Última execução: {collLast ? new Date(collLast.started_at).toLocaleString("pt-BR") : "—"}</div>
            <div>Registros processados: {collLast?.records_processed ?? "—"}</div>
          </div>
        </div>
        <div className="rounded-md border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Agregação (a cada 1h)</h3>
            <StatusBadge status={aggLast?.status} />
          </div>
          <div className={`text-sm font-medium ${aggIndicator.className}`}>{aggIndicator.label}</div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Última execução: {aggLast ? new Date(aggLast.started_at).toLocaleString("pt-BR") : "—"}</div>
            <div>{aggTotal > 0 ? `${aggSuccess}/${aggTotal} com sucesso` : "Sem execuções"}</div>
            <div>Último sucesso (registros): {aggLastSuccess?.records_processed ?? "—"}</div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-secondary px-3 py-1">
          {snapshots.data ? `${snapshots.data.count.toLocaleString("pt-BR")} snapshots` : "…"}
        </span>
        <span className="rounded-full bg-secondary px-3 py-1">
          {snapshots.data ? `${snapshots.data.distinct} atrações coletadas` : "…"}
        </span>
        <span className="rounded-full bg-secondary px-3 py-1">
          {snapshots.data
            ? `Span: ${fmtSpan(snapshots.data.first, snapshots.data.last)}`
            : "…"}
        </span>
      </div>
    </section>
  );
}

function BaseGrowth() {
  const parks = useParks();
  const now = new Date();
  const [parkId, setParkId] = useState<string>("all");
  const [dow, setDow] = useState<number>(now.getDay());
  const [hour, setHour] = useState<number>(now.getHours());
  const [sort, setSort] = useState<SortKey>("samples_desc");

  const q = useQuery({
    queryKey: ["admin", "ownbase", "growth", parkId, dow, hour, sort],
    queryFn: async () => {
      let query = supabase
        .from("attraction_wait_history")
        .select("day_of_week, hour_of_day, average_wait_minutes, sample_count, updated_at, attractions!inner(name, park_id, parks(name))")
        .eq("source", "live_aggregation")
        .eq("day_of_week", dow)
        .eq("hour_of_day", hour);
      if (parkId !== "all") query = query.eq("attractions.park_id", parkId);
      const orderMap: Record<SortKey, { col: string; asc: boolean }> = {
        samples_desc: { col: "sample_count", asc: false },
        avg_desc: { col: "average_wait_minutes", asc: false },
        avg_asc: { col: "average_wait_minutes", asc: true },
        updated_desc: { col: "updated_at", asc: false },
      };
      const o = orderMap[sort];
      const { data, error } = await query.order(o.col, { ascending: o.asc }).limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const renderSamples = (n: number | null | undefined) => {
    if (n === null || n === undefined) return <span className="text-muted-foreground">—</span>;
    if (n >= 1 && n <= 4) return <span className="text-amber-600">⚠️ {n}</span>;
    return <span>{n}</span>;
  };

  const rows = (q.data ?? []).map((r: any) => [
    fmt(r.attractions?.name),
    fmt(r.attractions?.parks?.name),
    DOWS[r.day_of_week],
    `${r.hour_of_day}h`,
    Number(r.average_wait_minutes).toFixed(1),
    renderSamples(r.sample_count),
    fmtDate(r.updated_at),
  ]);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Crescimento da Base</h2>
        <p className="text-xs text-muted-foreground">
          Médias construídas pela nossa coleta real (source = live_aggregation)
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={parkId} onValueChange={setParkId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Parque" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os parques</SelectItem>
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
        <Select value={String(hour)} onValueChange={(v) => setHour(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 24 }, (_, i) => (
              <SelectItem key={i} value={String(i)}>{i}h</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="samples_desc">Mais amostras</SelectItem>
            <SelectItem value="avg_desc">Maior média</SelectItem>
            <SelectItem value="avg_asc">Menor média</SelectItem>
            <SelectItem value="updated_desc">Atualizado recentemente</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={["Atração", "Parque", "Dia", "Hora", "Média (min)", "Amostras", "Atualizado em"]}
        rows={rows}
      />
    </section>
  );
}

function OwnBaseTab() {
  return (
    <div className="space-y-8">
      <PipelineHealth />
      <BaseGrowth />
    </div>
  );
}

function AdminPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-lg font-bold">Admin · Inspeção de dados</h1>
          <Link to="/hoje" className="text-xs text-muted-foreground hover:underline">← Voltar</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4">
        <Tabs defaultValue="live">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="live">Filas ao vivo</TabsTrigger>
            <TabsTrigger value="history">Médias históricas</TabsTrigger>
            <TabsTrigger value="ownbase">Nossa base</TabsTrigger>
            <TabsTrigger value="walk">Caminhadas</TabsTrigger>
            <TabsTrigger value="sync">Sincronizações</TabsTrigger>
            <TabsTrigger value="attractions">Atrações</TabsTrigger>
            <TabsTrigger value="suggestion">Sugestão</TabsTrigger>
          </TabsList>
          <TabsContent value="live"><LiveStatusTab /></TabsContent>
          <TabsContent value="history"><HistoryTab /></TabsContent>
          <TabsContent value="ownbase"><OwnBaseTab /></TabsContent>
          <TabsContent value="walk"><WalkTab /></TabsContent>
          <TabsContent value="sync"><SyncTab /></TabsContent>
            <TabsContent value="attractions"><AttractionsTab /></TabsContent>
            <TabsContent value="suggestion"><SuggestionDebugTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
