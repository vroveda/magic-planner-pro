export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alert_actions: {
        Row: {
          action: string
          alert_id: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          alert_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          alert_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_actions_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          attraction_id: string | null
          created_at: string
          current_wait_minutes: number | null
          deviation_percent: number | null
          expires_at: string | null
          historical_average_minutes: number | null
          id: string
          message: string
          responded_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["alert_status"]
          suggested_attraction_id: string | null
          title: string
          total_time_minutes: number | null
          trip_park_day_id: string | null
          user_id: string
          walking_time_minutes: number | null
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          attraction_id?: string | null
          created_at?: string
          current_wait_minutes?: number | null
          deviation_percent?: number | null
          expires_at?: string | null
          historical_average_minutes?: number | null
          id?: string
          message: string
          responded_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          suggested_attraction_id?: string | null
          title: string
          total_time_minutes?: number | null
          trip_park_day_id?: string | null
          user_id: string
          walking_time_minutes?: number | null
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          attraction_id?: string | null
          created_at?: string
          current_wait_minutes?: number | null
          deviation_percent?: number | null
          expires_at?: string | null
          historical_average_minutes?: number | null
          id?: string
          message?: string
          responded_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          suggested_attraction_id?: string | null
          title?: string
          total_time_minutes?: number | null
          trip_park_day_id?: string | null
          user_id?: string
          walking_time_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_attraction_id_fkey"
            columns: ["attraction_id"]
            isOneToOne: false
            referencedRelation: "attractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_suggested_attraction_id_fkey"
            columns: ["suggested_attraction_id"]
            isOneToOne: false
            referencedRelation: "attractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_trip_park_day_id_fkey"
            columns: ["trip_park_day_id"]
            isOneToOne: false
            referencedRelation: "trip_park_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attraction_condition_snapshots: {
        Row: {
          attraction_id: string
          captured_at: string
          condition: Database["public"]["Enums"]["queue_condition"] | null
          current_wait_minutes: number | null
          deviation_percent: number | null
          historical_average_minutes: number | null
          id: string
        }
        Insert: {
          attraction_id: string
          captured_at?: string
          condition?: Database["public"]["Enums"]["queue_condition"] | null
          current_wait_minutes?: number | null
          deviation_percent?: number | null
          historical_average_minutes?: number | null
          id?: string
        }
        Update: {
          attraction_id?: string
          captured_at?: string
          condition?: Database["public"]["Enums"]["queue_condition"] | null
          current_wait_minutes?: number | null
          deviation_percent?: number | null
          historical_average_minutes?: number | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attraction_condition_snapshots_attraction_id_fkey"
            columns: ["attraction_id"]
            isOneToOne: false
            referencedRelation: "attractions"
            referencedColumns: ["id"]
          },
        ]
      }
      attraction_live_status: {
        Row: {
          attraction_id: string
          captured_at: string
          current_wait_minutes: number | null
          id: string
          lightning_lane_available: boolean | null
          lightning_lane_return_time: string | null
          source: string
          status: Database["public"]["Enums"]["attraction_status"]
          virtual_queue_available: boolean | null
        }
        Insert: {
          attraction_id: string
          captured_at?: string
          current_wait_minutes?: number | null
          id?: string
          lightning_lane_available?: boolean | null
          lightning_lane_return_time?: string | null
          source?: string
          status?: Database["public"]["Enums"]["attraction_status"]
          virtual_queue_available?: boolean | null
        }
        Update: {
          attraction_id?: string
          captured_at?: string
          current_wait_minutes?: number | null
          id?: string
          lightning_lane_available?: boolean | null
          lightning_lane_return_time?: string | null
          source?: string
          status?: Database["public"]["Enums"]["attraction_status"]
          virtual_queue_available?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "attraction_live_status_attraction_id_fkey"
            columns: ["attraction_id"]
            isOneToOne: false
            referencedRelation: "attractions"
            referencedColumns: ["id"]
          },
        ]
      }
      attraction_wait_history: {
        Row: {
          attraction_id: string
          average_wait_minutes: number
          day_of_week: number
          hour_of_day: number
          id: string
          sample_count: number | null
          source: string | null
          updated_at: string
        }
        Insert: {
          attraction_id: string
          average_wait_minutes: number
          day_of_week: number
          hour_of_day: number
          id?: string
          sample_count?: number | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          attraction_id?: string
          average_wait_minutes?: number
          day_of_week?: number
          hour_of_day?: number
          id?: string
          sample_count?: number | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attraction_wait_history_attraction_id_fkey"
            columns: ["attraction_id"]
            isOneToOne: false
            referencedRelation: "attractions"
            referencedColumns: ["id"]
          },
        ]
      }
      attractions: {
        Row: {
          area: string | null
          coordinates_lat: number | null
          coordinates_lng: number | null
          created_at: string
          experience_type: Database["public"]["Enums"]["experience_type"]
          external_id: string | null
          has_show_schedule: boolean
          id: string
          is_must_do: boolean
          lightning_lane_type: Database["public"]["Enums"]["lightning_lane_type"]
          long_description: string | null
          min_height_cm: number | null
          name: string
          park_id: string
          short_description: string | null
          strategic_tip: string | null
          thrill_level: Database["public"]["Enums"]["thrill_level"] | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          experience_type: Database["public"]["Enums"]["experience_type"]
          external_id?: string | null
          has_show_schedule?: boolean
          id?: string
          is_must_do?: boolean
          lightning_lane_type?: Database["public"]["Enums"]["lightning_lane_type"]
          long_description?: string | null
          min_height_cm?: number | null
          name: string
          park_id: string
          short_description?: string | null
          strategic_tip?: string | null
          thrill_level?: Database["public"]["Enums"]["thrill_level"] | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          experience_type?: Database["public"]["Enums"]["experience_type"]
          external_id?: string | null
          has_show_schedule?: boolean
          id?: string
          is_must_do?: boolean
          lightning_lane_type?: Database["public"]["Enums"]["lightning_lane_type"]
          long_description?: string | null
          min_height_cm?: number | null
          name?: string
          park_id?: string
          short_description?: string | null
          strategic_tip?: string | null
          thrill_level?: Database["public"]["Enums"]["thrill_level"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attractions_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sync_runs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          records_processed: number | null
          source: string
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          records_processed?: number | null
          source: string
          started_at?: string
          status: string
          sync_type: string
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          records_processed?: number | null
          source?: string
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      parks: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          name: string
          resort: string
          slug: string
          timezone: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          name: string
          resort?: string
          slug: string
          timezone?: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          name?: string
          resort?: string
          slug?: string
          timezone?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          current_plan: Database["public"]["Enums"]["plan_type"]
          email: string | null
          id: string
          name: string | null
          telegram_chat_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_plan?: Database["public"]["Enums"]["plan_type"]
          email?: string | null
          id: string
          name?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_plan?: Database["public"]["Enums"]["plan_type"]
          email?: string | null
          id?: string
          name?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      route_items: {
        Row: {
          attraction_id: string
          created_at: string
          id: string
          notes: string | null
          planned_time: string | null
          position: number
          route_id: string
          skipped_at: string | null
          visited_at: string | null
        }
        Insert: {
          attraction_id: string
          created_at?: string
          id?: string
          notes?: string | null
          planned_time?: string | null
          position: number
          route_id: string
          skipped_at?: string | null
          visited_at?: string | null
        }
        Update: {
          attraction_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          planned_time?: string | null
          position?: number
          route_id?: string
          skipped_at?: string | null
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_items_attraction_id_fkey"
            columns: ["attraction_id"]
            isOneToOne: false
            referencedRelation: "attractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_items_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          id: string
          is_original: boolean
          name: string
          trip_park_day_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_original?: boolean
          name?: string
          trip_park_day_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_original?: boolean
          name?: string
          trip_park_day_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_trip_park_day_id_fkey"
            columns: ["trip_park_day_id"]
            isOneToOne: false
            referencedRelation: "trip_park_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          ends_at: string | null
          external_payment_id: string | null
          id: string
          is_active: boolean
          payment_provider: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          external_payment_id?: string | null
          id?: string
          is_active?: boolean
          payment_provider?: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          external_payment_id?: string | null
          id?: string
          is_active?: boolean
          payment_provider?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_park_days: {
        Row: {
          created_at: string
          id: string
          is_active_day: boolean
          park_id: string
          planned_arrival_time: string | null
          trip_id: string
          uses_lightning_lane: boolean
          visit_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active_day?: boolean
          park_id: string
          planned_arrival_time?: string | null
          trip_id: string
          uses_lightning_lane?: boolean
          visit_date: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active_day?: boolean
          park_id?: string
          planned_arrival_time?: string | null
          trip_id?: string
          uses_lightning_lane?: boolean
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_park_days_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_park_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          arrival_date: string | null
          created_at: string
          departure_date: string | null
          id: string
          name: string
          party_size: number | null
          status: Database["public"]["Enums"]["trip_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          arrival_date?: string | null
          created_at?: string
          departure_date?: string | null
          id?: string
          name: string
          party_size?: number | null
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          arrival_date?: string | null
          created_at?: string
          departure_date?: string | null
          id?: string
          name?: string
          party_size?: number | null
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_attraction_monitors: {
        Row: {
          attraction_id: string
          created_at: string
          current_booked_lightning_lane_time: string | null
          desired_lightning_lane_time: string | null
          id: string
          is_active: boolean
          max_wait_minutes: number | null
          monitor_type: Database["public"]["Enums"]["monitor_type"]
          trip_park_day_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attraction_id: string
          created_at?: string
          current_booked_lightning_lane_time?: string | null
          desired_lightning_lane_time?: string | null
          id?: string
          is_active?: boolean
          max_wait_minutes?: number | null
          monitor_type: Database["public"]["Enums"]["monitor_type"]
          trip_park_day_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attraction_id?: string
          created_at?: string
          current_booked_lightning_lane_time?: string | null
          desired_lightning_lane_time?: string | null
          id?: string
          is_active?: boolean
          max_wait_minutes?: number | null
          monitor_type?: Database["public"]["Enums"]["monitor_type"]
          trip_park_day_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_attraction_monitors_attraction_id_fkey"
            columns: ["attraction_id"]
            isOneToOne: false
            referencedRelation: "attractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_attraction_monitors_trip_park_day_id_fkey"
            columns: ["trip_park_day_id"]
            isOneToOne: false
            referencedRelation: "trip_park_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_attraction_monitors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          accuracy_meters: number | null
          captured_at: string
          id: string
          latitude: number
          longitude: number
          trip_park_day_id: string | null
          user_id: string
        }
        Insert: {
          accuracy_meters?: number | null
          captured_at?: string
          id?: string
          latitude: number
          longitude: number
          trip_park_day_id?: string | null
          user_id: string
        }
        Update: {
          accuracy_meters?: number | null
          captured_at?: string
          id?: string
          latitude?: number
          longitude?: number
          trip_park_day_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_trip_park_day_id_fkey"
            columns: ["trip_park_day_id"]
            isOneToOne: false
            referencedRelation: "trip_park_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      alert_status:
        | "pending"
        | "sent"
        | "accepted"
        | "rejected"
        | "ignored"
        | "expired"
      alert_type:
        | "better_lightning_lane"
        | "lightning_lane_available"
        | "route_deviation"
        | "perfect_storm"
        | "attraction_closed"
        | "attraction_reopened"
        | "show_reminder"
      attraction_status:
        | "operating"
        | "closed"
        | "down"
        | "refurbishment"
        | "unknown"
      experience_type:
        | "ride"
        | "show"
        | "meet_greet"
        | "parade"
        | "fireworks"
        | "other"
      lightning_lane_type:
        | "none"
        | "multipass"
        | "single_pass"
        | "virtual_queue"
      monitor_type: "lightning_lane" | "wait_time" | "status"
      plan_type: "free" | "day_pass" | "trip_pass"
      queue_condition: "excellent" | "good" | "normal" | "bad" | "avoid"
      thrill_level: "low" | "moderate" | "high" | "extreme"
      trip_status: "planning" | "active" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_status: [
        "pending",
        "sent",
        "accepted",
        "rejected",
        "ignored",
        "expired",
      ],
      alert_type: [
        "better_lightning_lane",
        "lightning_lane_available",
        "route_deviation",
        "perfect_storm",
        "attraction_closed",
        "attraction_reopened",
        "show_reminder",
      ],
      attraction_status: [
        "operating",
        "closed",
        "down",
        "refurbishment",
        "unknown",
      ],
      experience_type: [
        "ride",
        "show",
        "meet_greet",
        "parade",
        "fireworks",
        "other",
      ],
      lightning_lane_type: [
        "none",
        "multipass",
        "single_pass",
        "virtual_queue",
      ],
      monitor_type: ["lightning_lane", "wait_time", "status"],
      plan_type: ["free", "day_pass", "trip_pass"],
      queue_condition: ["excellent", "good", "normal", "bad", "avoid"],
      thrill_level: ["low", "moderate", "high", "extreme"],
      trip_status: ["planning", "active", "completed", "cancelled"],
    },
  },
} as const
