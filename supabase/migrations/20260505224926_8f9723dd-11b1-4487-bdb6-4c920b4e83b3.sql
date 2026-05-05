-- Add image_url to attractions
ALTER TABLE public.attractions ADD COLUMN IF NOT EXISTS image_url text;

-- Create public storage bucket for attraction photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('attractions', 'attractions', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy for the bucket
DO $$ BEGIN
  CREATE POLICY "Public can read attraction images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'attractions');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;