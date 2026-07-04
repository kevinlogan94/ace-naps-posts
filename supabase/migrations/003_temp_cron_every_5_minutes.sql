-- TEMPORARY: run every 5 minutes while testing the publish pipeline.
-- Revert with 004_schedule_daily_cron_9am_eastern.sql.example before relying on prod schedule.

select cron.unschedule('ace-naps-posts-instagram-daily')
where exists (
  select 1 from cron.job where jobname = 'ace-naps-posts-instagram-daily'
);

select cron.schedule(
  'ace-naps-posts-instagram-daily',
  '*/5 * * * *',
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
