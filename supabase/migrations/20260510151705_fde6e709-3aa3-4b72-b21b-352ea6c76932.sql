CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('fn_check_show_reminders_every_minute')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fn_check_show_reminders_every_minute');

SELECT cron.schedule(
  'fn_check_show_reminders_every_minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://umskqfmqcudqudughlev.supabase.co/functions/v1/fn_check_show_reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtc2txZm1xY3VkcXVkdWdobGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDU4NjcsImV4cCI6MjA5Mjk4MTg2N30.Ec2zjzmCSRoE303m532kxSlEZojMIxnXPhhuXBkbwbs", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtc2txZm1xY3VkcXVkdWdobGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDU4NjcsImV4cCI6MjA5Mjk4MTg2N30.Ec2zjzmCSRoE303m52kxSlEZojMIxnXPhhuXBkbwbs"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);