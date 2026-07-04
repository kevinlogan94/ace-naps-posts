-- Daily 9:00 AM Eastern cron to invoke post-to-instagram Edge Function.
-- Requires vault secrets: project_url, service_role_key (see 002_setup_vault_secrets.sql.example).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('post-to-instagram-daily')
where exists (
  select 1 from cron.job where jobname = 'post-to-instagram-daily'
);

select cron.schedule_in_timezone(
  'post-to-instagram-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/post-to-instagram',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$,
  'America/New_York'
);
