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

type SortKey = "avg_desc" | "avg_asc" | "samples_desc" | "updated_desc";

function OwnBaseTab() {
  const parks = useParks();
  const now = new Date();
  const [parkId, setParkId] = useState<string>("all");
  const [dow, setDow] = useState<number>(now.getDay());
  const [hour, setHour] = useState<number>(now.getHours());
  const [sort, setSort] = useState<SortKey>("avg_desc");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const summary = useQuery({
    queryKey: ["admin", "ownbase-summary", parkId],
    queryFn: async () => {
      let query = supabase
        .from("attraction_wait_history")
        .select("sample_count, updated_at, source, attractions!inner(park_id)");
      if (parkId !== "all") query = query.eq("attractions.park_id", parkId);
      const { data, error } = await query.limit(20000);
      if (error) throw error;
      const rows = data ?? [];
      const samples = rows.reduce((s: number, r: any) => s + (r.sample_count ?? 0), 0);
      const last = rows.reduce((m: string | null, r: any) => {
        if (!r.updated_at) return m;
        return !m || r.updated_at > m ? r.updated_at : m;
      }, null as string | null);
      const sourceCounts = new Map<string, number>();
      for (const r of rows as any[]) {
        const k = r.source ?? "(null)";
        sourceCounts.set(k, (sourceCounts.get(k) ?? 0) + 1);
      }
      const sources = Array.from(sourceCounts.entries()).sort((a, b) => b[1] - a[1]);
      return { count: rows.length, samples, last, sources };
    },
  });

  const sourceOptions = summary.data?.sources.map(([s]) => s).filter((s) => s !== "(null)") ?? [];

  const isOwnSource =
    sourceFilter !== "all" &&
    sourceFilter !== "queue_times" &&
    sourceFilter !== "queue-times.com";

  const evolution = useQuery({
    queryKey: ["admin", "ownbase-evolution", parkId, sourceFilter],
    enabled: isOwnSource,
    queryFn: async () => {
      let query = supabase
        .from("attraction_wait_history")
        .select("day_of_week, hour_of_day, average_wait_minutes, sample_count, updated_at, attractions!inner(name, park_id, parks(name))")
        .eq("source", sourceFilter)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (parkId !== "all") query = query.eq("attractions.park_id", parkId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const span = useQuery({
    queryKey: ["admin", "ownbase-span", parkId, sourceFilter],
    enabled: isOwnSource,
    queryFn: async () => {
      let baseFirst = supabase
        .from("attraction_wait_history")
        .select("updated_at, attractions!inner(park_id)")
        .eq("source", sourceFilter)
        .order("updated_at", { ascending: true })
        .limit(1);
      let baseLast = supabase
        .from("attraction_wait_history")
        .select("updated_at, attractions!inner(park_id)")
        .eq("source", sourceFilter)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (parkId !== "all") {
        baseFirst = baseFirst.eq("attractions.park_id", parkId);
        baseLast = baseLast.eq("attractions.park_id", parkId);
      }
      const [{ data: f }, { data: l }] = await Promise.all([baseFirst, baseLast]);
      return { first: f?.[0]?.updated_at ?? null, last: l?.[0]?.updated_at ?? null };
    },
  });

  const snapshots = useQuery({
    queryKey: ["admin", "ownbase-snapshots", parkId],
    queryFn: async () => {
      let query = supabase
        .from("attraction_condition_snapshots")
        .select("captured_at, condition, current_wait_minutes, historical_average_minutes, deviation_percent, attractions!inner(name, park_id, parks(name))")
        .order("captured_at", { ascending: false })
        .limit(200);
      if (parkId !== "all") query = query.eq("attractions.park_id", parkId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const snapshotsSummary = useQuery({
    queryKey: ["admin", "ownbase-snapshots-summary", parkId],
    queryFn: async () => {
      let query = supabase
        .from("attraction_condition_snapshots")
        .select("captured_at, condition, attractions!inner(park_id)")
        .order("captured_at", { ascending: false })
        .limit(20000);
      if (parkId !== "all") query = query.eq("attractions.park_id", parkId);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data ?? [];
      const last = rows[0]?.captured_at ?? null;
      const conditionCounts = new Map<string, number>();
      for (const r of rows as any[]) {
        const k = r.condition ?? "(null)";
        conditionCounts.set(k, (conditionCounts.get(k) ?? 0) + 1);
      }
      const conditions = Array.from(conditionCounts.entries()).sort((a, b) => b[1] - a[1]);
      return { count: rows.length, last, conditions };
    },
  });

  const q = useQuery({
    queryKey: ["admin", "ownbase", parkId, dow, hour, sort, sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from("attraction_wait_history")
        .select("day_of_week, hour_of_day, average_wait_minutes, sample_count, updated_at, source, attractions!inner(name, park_id, parks(name))")
        .eq("day_of_week", dow)
        .eq("hour_of_day", hour);
      if (parkId !== "all") query = query.eq("attractions.park_id", parkId);
      if (sourceFilter !== "all") query = query.eq("source", sourceFilter);
      const orderMap: Record<SortKey, { col: string; asc: boolean }> = {
        avg_desc: { col: "average_wait_minutes", asc: false },
        avg_asc: { col: "average_wait_minutes", asc: true },
        samples_desc: { col: "sample_count", asc: false },
        updated_desc: { col: "updated_at", asc: false },
      };
      const o = orderMap[sort];
      query = query.order(o.col, { ascending: o.asc }).limit(200);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const renderSamples = (n: number | null | undefined) => {
    if (n === null || n === undefined) {
      return <span className="text-muted-foreground">—</span>;
    }
    if (n >= 1 && n <= 4) {
      return <span className="text-amber-600">⚠ {n}</span>;
    }
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

  const s = summary.data;
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-card p-3 space-y-2">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-secondary px-3 py-1">
            {s ? `${s.count} entradas` : "…"}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1">
            {s ? `${s.samples} amostras` : "…"}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1">
            {s?.last
              ? `Atualizado: ${new Date(s.last).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
              : "Sem atualizações"}
          </span>
        </div>
        {s?.sources && s.sources.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-muted-foreground self-center">Sources:</span>
            {s.sources.map(([name, count]) => (
              <span key={name} className="rounded-full border border-border px-3 py-1">
                {name}: {count} linhas
              </span>
            ))}
          </div>
        )}
        {isOwnSource && span.data && (span.data.first || span.data.last) && (
          <div className="text-xs text-muted-foreground">
            primeira coleta: {span.data.first ? new Date(span.data.first).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
            {" — última: "}
            {span.data.last ? new Date(span.data.last).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
          </div>
        )}
        {snapshotsSummary.data && (
          <div className="flex flex-wrap gap-2 text-xs pt-1 border-t border-border">
            <span className="text-muted-foreground self-center">Snapshots de condição:</span>
            <span className="rounded-full bg-secondary px-3 py-1">
              {snapshotsSummary.data.count} registros
            </span>
            {snapshotsSummary.data.last && (
              <span className="rounded-full bg-secondary px-3 py-1">
                último: {new Date(snapshotsSummary.data.last).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {snapshotsSummary.data.conditions.map(([name, count]) => (
              <span key={name} className="rounded-full border border-border px-3 py-1">
                {name}: {count}
              </span>
            ))}
          </div>
        )}
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
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Fonte" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fontes</SelectItem>
            {sourceOptions.map((src) => (
              <SelectItem key={src} value={src}>{src}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="avg_desc">Maior média</SelectItem>
            <SelectItem value="avg_asc">Menor média</SelectItem>
            <SelectItem value="samples_desc">Mais amostras</SelectItem>
            <SelectItem value="updated_desc">Atualizado recentemente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={["Atração", "Parque", "Dia", "Hora", "Média (min)", "Amostras", "Atualizado em"]}
        rows={rows}
      />

      {isOwnSource && (
        <div className="space-y-2 pt-4">
          <h3 className="text-sm font-semibold">Evolução das amostras</h3>
          <p className="text-xs text-muted-foreground">
            Registros de <code>{sourceFilter}</code> ordenados por última atualização — para ver se sample_count cresce a cada ciclo.
          </p>
          <DataTable
            columns={["Atração", "Parque", "Dia", "Hora", "Média (min)", "Amostras", "Atualizado em"]}
            rows={(evolution.data ?? []).map((r: any) => [
              fmt(r.attractions?.name),
              fmt(r.attractions?.parks?.name),
              DOWS[r.day_of_week],
              `${r.hour_of_day}h`,
              Number(r.average_wait_minutes).toFixed(1),
              renderSamples(r.sample_count),
              fmtDate(r.updated_at),
            ])}
          />
        </div>
      )}

      <div className="space-y-2 pt-4">
        <h3 className="text-sm font-semibold">Snapshots de condição</h3>
        <p className="text-xs text-muted-foreground">
          Últimas capturas de <code>attraction_condition_snapshots</code> — comparação fila atual vs média histórica.
        </p>
        <DataTable
          columns={["Atração", "Parque", "Condição", "Fila atual", "Média hist.", "Desvio %", "Capturado"]}
          rows={(snapshots.data ?? []).map((r: any) => [
            fmt(r.attractions?.name),
            fmt(r.attractions?.parks?.name),
            fmt(r.condition),
            fmt(r.current_wait_minutes),
            r.historical_average_minutes != null ? Number(r.historical_average_minutes).toFixed(1) : fmt(null),
            r.deviation_percent != null ? `${Number(r.deviation_percent).toFixed(1)}%` : fmt(null),
            fmtDate(r.captured_at),
          ])}
        />
      </div>
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
          </TabsList>
          <TabsContent value="live"><LiveStatusTab /></TabsContent>
          <TabsContent value="history"><HistoryTab /></TabsContent>
          <TabsContent value="ownbase"><OwnBaseTab /></TabsContent>
          <TabsContent value="walk"><WalkTab /></TabsContent>
          <TabsContent value="sync"><SyncTab /></TabsContent>
          <TabsContent value="attractions"><AttractionsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
