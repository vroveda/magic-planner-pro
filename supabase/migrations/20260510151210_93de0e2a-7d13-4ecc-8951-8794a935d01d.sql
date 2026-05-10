ALTER TABLE public.attraction_live_status ADD COLUMN IF NOT EXISTS show_next_times TIMESTAMPTZ[];
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS show_window_minutes INTEGER;
ALTER TYPE public.monitor_type ADD VALUE IF NOT EXISTS 'show_reminder';