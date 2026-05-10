import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SOURCE = "external_id_sync";
const SYNC_TYPE = "attractions_external_id";
const jsonHeaders = { "Content-Type": "application/json" };

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function normalize(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Missing Supabase config" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const startedAt = new Date().toISOString();
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

  if (runInsert.error) {
    return jsonResponse({ ok: false, error: runInsert.error.message }, 500);
  }
  const runId = runInsert.data.id;

  const updated: Array<{ name: string; old: string | null; new: string; park: string }> = [];
  const unmatched: Array<{ park: string; name: string; id: string; entityType?: string }> = [];
  const skippedNonAttraction: Array<{ park: string; name: string; entityType: string }> = [];

  try {
    const { data: parks, error: parksErr } = await supabase
      .from("parks")
      .select("id,name,external_id");
    if (parksErr) throw parksErr;

    const { data: attractions, error: attrErr } = await supabase
      .from("attractions")
      .select("id,name,external_id,park_id");
    if (attrErr) throw attrErr;

    for (const park of parks ?? []) {
      if (!park.external_id) continue;
      const url = `https://api.themeparks.wiki/v1/entity/${park.external_id}/children`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Failed fetch for ${park.name}: ${res.status}`);
        continue;
      }
      const payload = await res.json();
      const children: Array<{ id: string; name: string; entityType?: string }> = payload.children ?? [];

      const parkAttractions = (attractions ?? []).filter((a) => a.park_id === park.id);
      const byName = new Map<string, typeof parkAttractions[number]>();
      for (const a of parkAttractions) byName.set(normalize(a.name), a);

      for (const item of children) {
        const et = item.entityType ?? "";
        if (et && !["ATTRACTION", "SHOW"].includes(et.toUpperCase())) {
          skippedNonAttraction.push({ park: park.name, name: item.name, entityType: et });
          continue;
        }
        const match = byName.get(normalize(item.name));
        if (!match) {
          unmatched.push({ park: park.name, name: item.name, id: item.id, entityType: et });
          continue;
        }
        if (match.external_id === item.id) continue;
        const { error: updErr } = await supabase
          .from("attractions")
          .update({ external_id: item.id })
          .eq("id", match.id);
        if (updErr) {
          console.error(`update fail ${match.name}: ${updErr.message}`);
          continue;
        }
        updated.push({ name: match.name, old: match.external_id, new: item.id, park: park.name });
      }
    }

    await supabase
      .from("data_sync_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        records_processed: updated.length,
      })
      .eq("id", runId);

    return jsonResponse({
      ok: true,
      updated_count: updated.length,
      unmatched_count: unmatched.length,
      updated,
      unmatched,
      skipped_non_attraction_count: skippedNonAttraction.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase
      .from("data_sync_runs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        error_message: message,
      })
      .eq("id", runId);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
