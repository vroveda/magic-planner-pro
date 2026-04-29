import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { distanceMeters } from "@/lib/score";
import type { Database } from "@/integrations/supabase/types";

type TripParkDay = Database["public"]["Tables"]["trip_park_days"]["Row"];
type Attraction = Database["public"]["Tables"]["attractions"]["Row"];

const PARK_RADIUS_M = 250;
const SAVE_INTERVAL_MS = 60_000;

/**
 * Watches the user's geolocation. When they enter a park (within 250m of any of
 * its attractions), marks that trip_park_day as the active day and persists a
 * `user_locations` row at most once per minute.
 */
export function useGeolocationTracking({
  days,
  attractions,
  enabled = true,
}: {
  days: TripParkDay[];
  attractions: Attraction[];
  enabled?: boolean;
}) {
  const { user } = useAuth();
  const lastSavedAt = useRef(0);
  const lastActiveDayId = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !user || typeof navigator === "undefined" || !navigator.geolocation) return;
    if (days.length === 0 || attractions.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const todayDays = days.filter((d) => d.visit_date === today);
    if (todayDays.length === 0) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        // Find which park (of today's options) the user is currently inside.
        let insidePark: string | null = null;
        for (const d of todayDays) {
          const parkAttrs = attractions.filter(
            (a) => a.park_id === d.park_id && a.coordinates_lat != null && a.coordinates_lng != null,
          );
          const inside = parkAttrs.some(
            (a) => distanceMeters(me, { lat: a.coordinates_lat!, lng: a.coordinates_lng! }) <= PARK_RADIUS_M,
          );
          if (inside) {
            insidePark = d.id;
            break;
          }
        }

        // Activate the matching day if not already active.
        if (insidePark && insidePark !== lastActiveDayId.current) {
          lastActiveDayId.current = insidePark;
          await supabase.from("trip_park_days").update({ is_active_day: false }).eq("trip_id", todayDays[0].trip_id);
          await supabase.from("trip_park_days").update({ is_active_day: true }).eq("id", insidePark);
        }

        // Persist location at most once per minute.
        const now = Date.now();
        if (now - lastSavedAt.current >= SAVE_INTERVAL_MS) {
          lastSavedAt.current = now;
          await supabase.from("user_locations").insert({
            user_id: user.id,
            latitude: me.lat,
            longitude: me.lng,
            accuracy_meters: pos.coords.accuracy,
            trip_park_day_id: insidePark,
          });
        }
      },
      (err) => {
        console.warn("[geo] watchPosition error", err.message);
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 30_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, user, days, attractions]);
}
