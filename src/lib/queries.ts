import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];

export type Park = Tables["parks"]["Row"];
export type Attraction = Tables["attractions"]["Row"];
export type Trip = Tables["trips"]["Row"];
export type TripParkDay = Tables["trip_park_days"]["Row"];
export type Route = Tables["routes"]["Row"];
export type RouteItem = Tables["route_items"]["Row"];
export type Alert = Tables["alerts"]["Row"];
export type LiveStatus = Tables["attraction_live_status"]["Row"];
export type Monitor = Tables["user_attraction_monitors"]["Row"];
export type MonitorType = Database["public"]["Enums"]["monitor_type"];

export type TripPrefs = {
  is_disney_hotel?: boolean;
  ticket_type?: "park_hopper" | "single_park";
  adults?: number;
  children?: { id: string; height: "under_97" | "97_107" | "107_122" | "above_122" }[];
};

const PREFS_KEY = (tripId: string) => `gh:trip-prefs:${tripId}`;
export function readTripPrefs(tripId: string): TripPrefs {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(PREFS_KEY(tripId)) ?? "{}"); } catch { return {}; }
}
export function writeTripPrefs(tripId: string, prefs: TripPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY(tripId), JSON.stringify(prefs));
}

// ============ PARKS / ATTRACTIONS ============

export function useParks() {
  return useQuery({
    queryKey: ["parks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parks").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Park[];
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useAttractionsByPark(parkId: string | null | undefined) {
  return useQuery({
    queryKey: ["attractions", parkId],
    enabled: !!parkId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attractions")
        .select("*")
        .eq("park_id", parkId!)
        .order("is_must_do", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as Attraction[];
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useAttractionsByIds(ids: string[]) {
  return useQuery({
    queryKey: ["attractions-by-ids", [...ids].sort()],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("attractions").select("*").in("id", ids);
      if (error) throw error;
      return (data ?? []) as Attraction[];
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useAttraction(id: string | undefined) {
  return useQuery({
    queryKey: ["attraction", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("attractions").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return (data as Attraction | null) ?? null;
    },
    staleTime: 30 * 60 * 1000,
  });
}

// ============ LIVE STATUS / WAIT HISTORY ============

export function useLiveStatusForAttractions(ids: string[]) {
  return useQuery({
    queryKey: ["live-status", [...ids].sort()],
    enabled: ids.length > 0,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attraction_live_status")
        .select("*")
        .in("attraction_id", ids)
        .order("captured_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, LiveStatus> = {};
      for (const row of (data ?? []) as LiveStatus[]) {
        if (!map[row.attraction_id]) map[row.attraction_id] = row;
      }
      return map;
    },
  });
}

export function useLiveStatusRealtime(ids: string[]) {
  const qc = useQueryClient();
  const key = [...ids].sort().join(",");
  useEffect(() => {
    if (ids.length === 0) return;
    const channel = supabase
      .channel(`live-status:${key}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attraction_live_status" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { attraction_id?: string } | null;
          if (row?.attraction_id && ids.includes(row.attraction_id)) {
            qc.invalidateQueries({ queryKey: ["live-status"] });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function useWaitHistoryForAttractions(ids: string[]) {
  return useQuery({
    queryKey: ["wait-history", [...ids].sort()],
    enabled: ids.length > 0,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const now = new Date();
      const dow = now.getDay();
      const hour = now.getHours();
      const { data, error } = await supabase
        .from("attraction_wait_history")
        .select("attraction_id, average_wait_minutes")
        .in("attraction_id", ids)
        .eq("day_of_week", dow)
        .eq("hour_of_day", hour);
      if (error) throw error;
      const map: Record<string, number | null> = {};
      for (const row of (data ?? []) as { attraction_id: string; average_wait_minutes: number }[]) {
        map[row.attraction_id] = row.average_wait_minutes;
      }
      return map;
    },
  });
}

// ============ TRIPS ============

export function useActiveTrip() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["active-trip", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("user_id", user!.id)
        .in("status", ["planning", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Trip | null) ?? null;
    },
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation<Trip, Error, string | undefined>({
    mutationFn: async (name) => {
      if (!user) throw new Error("Sem usuário");
      const insert: Tables["trips"]["Insert"] = { user_id: user.id, name: name ?? "Minha viagem", status: "planning" };
      const { data, error } = await supabase.from("trips").insert(insert).select("*").single();
      if (error) throw error;
      return data as Trip;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["active-trip"] }),
  });
}

export function useUpdateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Tables["trips"]["Update"] }) => {
      const { error } = await supabase.from("trips").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-trip"] });
      qc.invalidateQueries({ queryKey: ["trip-park-days"] });
    },
  });
}

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trips").delete().eq("id", id);
      if (error) throw error;
      if (typeof window !== "undefined") localStorage.removeItem(PREFS_KEY(id));
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ============ TRIP PARK DAYS ============

export function useTripParkDays(tripId: string | undefined) {
  return useQuery({
    queryKey: ["trip-park-days", tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_park_days")
        .select("*")
        .eq("trip_id", tripId!)
        .order("visit_date");
      if (error) throw error;
      return (data ?? []) as TripParkDay[];
    },
  });
}

export function useUpsertTripParkDays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tripId, days }: { tripId: string; days: { park_id: string; visit_date: string }[] }) => {
      const { error: delErr } = await supabase.from("trip_park_days").delete().eq("trip_id", tripId);
      if (delErr) throw delErr;
      if (days.length === 0) return [] as TripParkDay[];
      const rows: Tables["trip_park_days"]["Insert"][] = days.map((d) => ({ trip_id: tripId, park_id: d.park_id, visit_date: d.visit_date }));
      const { data, error } = await supabase.from("trip_park_days").insert(rows).select("*");
      if (error) throw error;
      return (data ?? []) as TripParkDay[];
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["trip-park-days", vars.tripId] });
      qc.invalidateQueries({ queryKey: ["routes"] });
    },
  });
}

// ============ ROUTES + ITEMS ============

export function useRouteForDay(tripParkDayId: string | undefined) {
  return useQuery({
    queryKey: ["route", tripParkDayId],
    enabled: !!tripParkDayId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("trip_park_day_id", tripParkDayId!)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Route | null) ?? null;
    },
  });
}

export function useRouteItems(routeId: string | undefined) {
  return useQuery({
    queryKey: ["route-items", routeId],
    enabled: !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_items")
        .select("*")
        .eq("route_id", routeId!)
        .order("position");
      if (error) throw error;
      return (data ?? []) as RouteItem[];
    },
  });
}

export function useReplaceRoute() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ tripParkDayId, attractionIds }: { tripParkDayId: string; attractionIds: string[] }) => {
      if (!user) throw new Error("Sem usuário");
      const { data: existing, error: e1 } = await supabase
        .from("routes")
        .select("id")
        .eq("trip_park_day_id", tripParkDayId)
        .limit(1)
        .maybeSingle();
      if (e1) throw e1;
      let routeId = existing?.id;
      if (!routeId) {
        const insert: Tables["routes"]["Insert"] = {
          trip_park_day_id: tripParkDayId, user_id: user.id, name: "Roteiro principal", is_original: true,
        };
        const { data, error } = await supabase.from("routes").insert(insert).select("id").single();
        if (error) throw error;
        routeId = data.id;
      }
      const { error: delErr } = await supabase.from("route_items").delete().eq("route_id", routeId);
      if (delErr) throw delErr;
      if (attractionIds.length > 0) {
        const rows: Tables["route_items"]["Insert"][] = attractionIds.map((id, i) => ({
          route_id: routeId!, attraction_id: id, position: i + 1,
        }));
        const { error: insErr } = await supabase.from("route_items").insert(rows);
        if (insErr) throw insErr;
      }
      return routeId!;
    },
    onSuccess: (routeId, vars) => {
      qc.invalidateQueries({ queryKey: ["route", vars.tripParkDayId] });
      qc.invalidateQueries({ queryKey: ["route-items", routeId] });
    },
  });
}

export function useMarkVisited() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, visited }: { itemId: string; visited: boolean }) => {
      const { error } = await supabase
        .from("route_items")
        .update({ visited_at: visited ? new Date().toISOString() : null, skipped_at: null })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["route-items"] }),
  });
}

export function useMarkSkipped() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      const { error } = await supabase
        .from("route_items")
        .update({ skipped_at: new Date().toISOString() })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["route-items"] }),
  });
}

// ============ ALERTS ============

export function useAlerts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["alerts", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Alert[];
    },
  });
}

export function useRespondAlert() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ alertId, action }: { alertId: string; action: "accepted" | "rejected" | "viewed" }) => {
      if (!user) throw new Error("Sem usuário");
      await supabase.from("alert_actions").insert({ alert_id: alertId, user_id: user.id, action });
      const status: Database["public"]["Enums"]["alert_status"] =
        action === "accepted" ? "accepted" : action === "rejected" ? "rejected" : "sent";
      await supabase.from("alerts").update({ status, responded_at: new Date().toISOString() }).eq("id", alertId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

// ============ MONITORS ============

export function useMonitors(tripParkDayId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["monitors", user?.id, tripParkDayId],
    enabled: !!user,
    queryFn: async () => {
      const q = supabase
        .from("user_attraction_monitors")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true);
      if (tripParkDayId) q.eq("trip_park_day_id", tripParkDayId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Monitor[];
    },
  });
}

export function useToggleMonitor() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      attractionId, tripParkDayId, monitorType, max_wait_minutes, desired_lightning_lane_time,
    }: {
      attractionId: string;
      tripParkDayId: string | null;
      monitorType: MonitorType;
      max_wait_minutes?: number;
      desired_lightning_lane_time?: string | null;
    }) => {
      if (!user) throw new Error("Sem usuário");
      const { data: existing } = await supabase
        .from("user_attraction_monitors")
        .select("id, is_active")
        .eq("user_id", user.id)
        .eq("attraction_id", attractionId)
        .eq("monitor_type", monitorType)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("user_attraction_monitors")
          .update({
            is_active: !existing.is_active,
            max_wait_minutes,
            desired_lightning_lane_time,
            trip_park_day_id: tripParkDayId,
          })
          .eq("id", existing.id);
        return !existing.is_active;
      }
      const insert: Tables["user_attraction_monitors"]["Insert"] = {
        user_id: user.id,
        attraction_id: attractionId,
        trip_park_day_id: tripParkDayId,
        monitor_type: monitorType,
        max_wait_minutes,
        desired_lightning_lane_time,
        is_active: true,
      };
      await supabase.from("user_attraction_monitors").insert(insert);
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["monitors"] }),
  });
}

// ============ PROFILE ============

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: { telegram_chat_id?: string | null; name?: string | null }) => {
      if (!user) throw new Error("Sem usuário");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...patch }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}
