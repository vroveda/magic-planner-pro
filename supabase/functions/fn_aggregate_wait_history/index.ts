import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };
const SOURCE = "live_aggregation";
const SYNC_TYPE = "wait_history";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function floorToHour(date: Date) {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  if (!token || (anonKey && token !== anonKey)) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Missing Supabase server configuration" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const startedAt = new Date().toISOString();

  try {
    const runInsert = await supabase
      .from("data_sync_runs")
      .insert({
        source: SOURCE,
        sync_type: SYNC_TYPE,
        status: "running",
        started_at: startedAt,
        records_processed: 0,
      })
      .select("id")
      .single();

    if (runInsert.error) throw runInsert.error;
    const runId = runInsert.data.id;

    const end = floorToHour(new Date());
    const start = new Date(end.getTime() - 60 * 60 * 1000);

    const { data: snapshots, error: snapshotsError } = await supabase
      .from("attraction_condition_snapshots")
      .select("attraction_id,current_wait_minutes,captured_at")
      .gte("captured_at", start.toISOString())
      .lt("captured_at", end.toISOString())
      .not("current_wait_minutes", "is", null)
      .limit(10000);

    if (snapshotsError) throw snapshotsError;

    const groups = new Map<string, { attraction_id: string; day_of_week: number; hour_of_day: number; sum: number; count: number }>();

    for (const row of snapshots ?? []) {
      const capturedAt = new Date(row.captured_at);
      const local = new Date(capturedAt.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const dayOfWeek = local.getDay();
      const hourOfDay = local.getHours();
      const key = `${row.attraction_id}:${dayOfWeek}:${hourOfDay}`;
      const existing = groups.get(key) ?? {
        attraction_id: row.attraction_id,
        day_of_week: dayOfWeek,
        hour_of_day: hourOfDay,
        sum: 0,
        count: 0,
      };
      existing.sum += Number(row.current_wait_minutes);
      existing.count += 1;
      groups.set(key, existing);
    }

    const rows = Array.from(groups.values()).map((g) => ({
      attraction_id: g.attraction_id,
      day_of_week: g.day_of_week,
      hour_of_day: g.hour_of_day,
      source: SOURCE,
      average_wait_minutes: Number((g.sum / g.count).toFixed(2)),
      sample_count: g.count,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("attraction_wait_history")
        .upsert(rows, {
          onConflict: "attraction_id,day_of_week,hour_of_day,source",
        });

      if (upsertError) throw upsertError;
    }

    const { error: updateRunError } = await supabase
      .from("data_sync_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        records_processed: rows.length,
      })
      .eq("id", runId);

    if (updateRunError) throw updateRunError;

    return jsonResponse({
      ok: true,
      records_processed: rows.length,
      message: rows.length === 0 ? "Sem snapshots recentes" : "Histórico agregado com sucesso",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await supabase
      .from("data_sync_runs")
      .insert({
        source: SOURCE,
        sync_type: SYNC_TYPE,
        status: "error",
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        records_processed: 0,
        error_message: message,
      });

    return jsonResponse({ ok: false, error: message }, 500);
  }
});
