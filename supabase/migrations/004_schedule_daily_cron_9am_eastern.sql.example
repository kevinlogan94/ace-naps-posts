-- Apply when done with 5-minute testing (migration 003).
-- Run in SQL editor or save as 004_schedule_daily_cron_9am_eastern.sql and `supabase db push`.
-- Supabase pg_cron uses UTC. 0 14 * * * ≈ 9:00 AM US Eastern (EST); runs 10 AM during EDT.

select cron.unschedule('ace-naps-posts-instagram-daily')
where exists (
  select 1 from cron.job where jobname = 'ace-naps-posts-instagram-daily'
);

select cron.schedule(
  'ace-naps-posts-instagram-daily',
  '0 14 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/ace-naps-posts-instagram-function',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
