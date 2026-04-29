import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Park = {
  id: string;
  slug: string;
  name: string;
  external_id: string | null;
  timezone: string;
  resort: string;
};

export type Attraction = {
  id: string;
  park_id: string;
  external_id: string | null;
  name: string;
  area: string | null;
  experience_type: "ride" | "show" | "meet_greet" | string;
  thrill_level: "low" | "moderate" | "high" | "extreme" | null;
  min_height_cm: number | null;
  lightning_lane_type: "multipass" | "single_pass" | "none";
  has_show_schedule: boolean;
  is_must_do: boolean;
  short_description: string | null;
  long_description: string | null;
  strategic_tip: string | null;
  coordinates_lat: number | null;
  coordinates_lng: number | null;
};

export type Trip = {
  id: string;
  user_id: string;
  name: string;
  arrival_date: string | null;
  departure_date: string | null;
  party_size: number | null;
  status: "planning" | "active" | "completed" | string;
};

export type TripPrefs = {
  is_disney_hotel?: boolean;
  ticket_type?: "park_hopper" | "single_park";
  adults?: number;
  children?: { id: string; height: "under_97" | "97_107" | "107_122" | "above_122" }[];
};

export type TripParkDay = {
  id: string;
  trip_id: string;
  park_id: string;
  visit_date: string;
  is_active_day: boolean;
};

export type Route = {
  id: string;
  trip_park_day_id: string;
  user_id: string;
  name: string;
  is_original: boolean;
};

export type RouteItem = {
  id: string;
  route_id: string;
  attraction_id: string;
  position: number;
  planned_time: string | null;
  visited_at: string | null;
  skipped_at: string | null;
  notes: string | null;
};

const PREFS_KEY = (tripId: string) => `gh:trip-prefs:${tripId}`;
export function readTripPrefs(tripId: string): TripPrefs {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY(tripId)) ?? "{}"); } catch { return {}; }
}
export function writeTripPrefs(tripId: string, prefs: TripPrefs) {
  localStorage.setItem(PREFS_KEY(tripId), JSON.stringify(prefs));
}

export function useParks() {
  return useQuery({
    queryKey: ["parks"],
    queryFn: async (): Promise<Park[]> => {
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
    queryFn: async (): Promise<Attraction[]> => {
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
    queryFn: async (): Promise<Attraction[]> => {
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
    queryFn: async (): Promise<Attraction | null> => {
      const { data, error } = await supabase.from("attractions").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return (data as Attraction | null) ?? null;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export type LiveStatus = {
  attraction_id: string;
  status: string;
  current_wait_minutes: number | null;
  lightning_lane_available: boolean | null;
  virtual_queue_available: boolean | null;
  lightning_lane_return_time: string | null;
  captured_at: string;
};

export function useLiveStatusForAttractions(ids: string[]) {
  return useQuery({
    queryKey: ["live-status", [...ids].sort()],
    enabled: ids.length > 0,
    refetchInterval: 60_000,
    queryFn: async (): Promise<Record<string, LiveStatus>> => {
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

export function useWaitHistoryForAttractions(ids: string[]) {
  return useQuery({
    queryKey: ["wait-history", [...ids].sort()],
    enabled: ids.length > 0,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<Record<string, number | null>> => {
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

export function useActiveTrip() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["active-trip", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Trip | null> => {
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
  return useMutation({
    mutationFn: async (name = "Minha viagem"): Promise<Trip> => {
      if (!user) throw new Error("Sem usuário");
      const { data, error } = await supabase
        .from("trips")
        .insert({ user_id: user.id, name, status: "planning" })
        .select("*")
        .single();
      if (error) throw error;
      return data as Trip;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["active-trip"] }),
  });
}

export function useUpdateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Trip> }) => {
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
      localStorage.removeItem(PREFS_KEY(id));
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useTripParkDays(tripId: string | undefined) {
  return useQuery({
    queryKey: ["trip-park-days", tripId],
    enabled: !!tripId,
    queryFn: async (): Promise<TripParkDay[]> => {
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
      if (days.length === 0) return [];
      const { data, error } = await supabase
        .from("trip_park_days")
        .insert(days.map((d) => ({ trip_id: tripId, ...d })))
        .select("*");
      if (error) throw error;
      return data as TripParkDay[];
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["trip-park-days", vars.tripId] });
      qc.invalidateQueries({ queryKey: ["routes"] });
    },
  });
}

export function useRouteForDay(tripParkDayId: string | undefined) {
  return useQuery({
    queryKey: ["route", tripParkDayId],
    enabled: !!tripParkDayId,
    queryFn: async (): Promise<Route | null> => {
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
    queryFn: async (): Promise<RouteItem[]> => {
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
        const { data, error } = await supabase
          .from("routes")
          .insert({ trip_park_day_id: tripParkDayId, user_id: user.id, name: "Roteiro principal", is_original: true })
          .select("id")
          .single();
        if (error) throw error;
        routeId = data.id;
      }
      const { error: delErr } = await supabase.from("route_items").delete().eq("route_id", routeId);
      if (delErr) throw delErr;
      if (attractionIds.length > 0) {
        const rows = attractionIds.map((id, i) => ({ route_id: routeId!, attraction_id: id, position: i + 1 }));
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

export type Alert = {
  id: string;
  user_id: string;
  alert_type: string;
  status: string;
  title: string;
  message: string;
  attraction_id: string | null;
  current_wait_minutes: number | null;
  historical_average_minutes: number | null;
  deviation_percent: number | null;
  total_time_minutes: number | null;
  walking_time_minutes: number | null;
  created_at: string;
  sent_at: string | null;
  responded_at: string | null;
};

export function useAlerts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["alerts", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async (): Promise<Alert[]> => {
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
    mutationFn: async ({ alertId, action }: { alertId: string; action: "accepted" | "declined" | "viewed" }) => {
      if (!user) throw new Error("Sem usuário");
      const status = action === "accepted" ? "accepted" : action === "declined" ? "declined" : "sent";
      await supabase.from("alert_actions").insert({ alert_id: alertId, user_id: user.id, action });
      await supabase.from("alerts").update({ status, responded_at: new Date().toISOString() }).eq("id", alertId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

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
      return data ?? [];
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
      monitorType: "wait_drop" | "ll_earlier" | "ll_available";
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
          .update({ is_active: !existing.is_active, max_wait_minutes, desired_lightning_lane_time, trip_park_day_id: tripParkDayId })
          .eq("id", existing.id);
        return !existing.is_active;
      }
      await supabase.from("user_attraction_monitors").insert({
        user_id: user.id,
        attraction_id: attractionId,
        trip_park_day_id: tripParkDayId,
        monitor_type: monitorType,
        max_wait_minutes,
        desired_lightning_lane_time,
        is_active: true,
      });
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["monitors"] }),
  });
}

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
