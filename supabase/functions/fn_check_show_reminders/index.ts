import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };
const SOURCE = "show_reminders";
const SYNC_TYPE = "show_reminder_check";
const WINDOWS = [60, 30, 5] as const;
const TOLERANCE_MIN = 1; // ±1 min

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/New_York",
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405);

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.replace(/^Bearer\s+/i, "").trim()) {
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
  let alertsInserted = 0;

  try {
    // 1. Active show monitors
    const { data: monitors, error: monErr } = await supabase
      .from("user_attraction_monitors")
      .select("id,user_id,attraction_id,trip_park_day_id")
      .eq("is_active", true)
      .eq("monitor_type", "show_reminder");
    if (monErr) throw monErr;

    if (!monitors || monitors.length === 0) {
      return jsonResponse({ ok: true, alerts_inserted: 0, message: "No active show monitors" });
    }

    const attractionIds = [...new Set(monitors.map((m) => m.attraction_id))];

    // 2. Latest live status per attraction
    const { data: liveRows, error: liveErr } = await supabase
      .from("attraction_live_status")
      .select("attraction_id,show_next_times,captured_at")
      .in("attraction_id", attractionIds)
      .order("captured_at", { ascending: false });
    if (liveErr) throw liveErr;

    const latestByAttr = new Map<string, string[]>();
    for (const row of liveRows ?? []) {
      if (!latestByAttr.has(row.attraction_id)) {
        latestByAttr.set(row.attraction_id, (row.show_next_times as string[] | null) ?? []);
      }
    }

    // 3. Attraction names (for alert message)
    const { data: attrs } = await supabase
      .from("attractions")
      .select("id,name")
      .in("id", attractionIds);
    const nameById = new Map((attrs ?? []).map((a) => [a.id as string, a.name as string]));

    const now = Date.now();

    for (const mon of monitors) {
      const times = latestByAttr.get(mon.attraction_id) ?? [];
      const name = nameById.get(mon.attraction_id) ?? "Show";

      for (const iso of times) {
        const ts = new Date(iso).getTime();
        const deltaMin = (ts - now) / 60000;
        if (deltaMin < 0) continue;

        for (const w of WINDOWS) {
          if (Math.abs(deltaMin - w) > TOLERANCE_MIN) continue;

          // Dedupe: same user/attraction/window with target time within ±2 min
          const winStart = new Date(ts - 2 * 60_000).toISOString();
          const winEnd = new Date(ts + 2 * 60_000).toISOString();
          const { data: existing } = await supabase
            .from("alerts")
            .select("id")
            .eq("user_id", mon.user_id)
            .eq("attraction_id", mon.attraction_id)
            .eq("alert_type", "show_reminder")
            .eq("show_window_minutes", w)
            .gte("expires_at", winStart)
            .lte("expires_at", winEnd)
            .limit(1)
            .maybeSingle();
          if (existing) continue;

          const title =
            w === 60 ? `${name} em 1h` :
            w === 30 ? `${name} em 30 min` :
            `${name} começa em 5 min!`;
          const message = `Próxima apresentação às ${fmtTime(iso)} (horário do parque).`;

          const { error: insErr } = await supabase.from("alerts").insert({
            user_id: mon.user_id,
            attraction_id: mon.attraction_id,
            trip_park_day_id: mon.trip_park_day_id,
            alert_type: "show_reminder",
            status: "sent",
            title,
            message,
            sent_at: new Date().toISOString(),
            expires_at: iso,
            show_window_minutes: w,
          });
          if (!insErr) alertsInserted += 1;
        }
      }
    }

    await supabase.from("data_sync_runs").insert({
      source: SOURCE,
      sync_type: SYNC_TYPE,
      status: "success",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      records_processed: alertsInserted,
    });

    return jsonResponse({ ok: true, alerts_inserted: alertsInserted });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.from("data_sync_runs").insert({
      source: SOURCE,
      sync_type: SYNC_TYPE,
      status: "error",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      records_processed: alertsInserted,
      error_message: message,
    });
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
