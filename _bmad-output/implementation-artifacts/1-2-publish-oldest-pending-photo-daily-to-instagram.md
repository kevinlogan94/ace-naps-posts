# Story 1.2: Publish Oldest Pending Photo Daily to Instagram

Status: ready-for-dev

## Story

As Kevin,
I want the system to automatically post the oldest pending photo each morning to Instagram,
so that Ace's nap photos go live without manual publishing.

## Acceptance Criteria

1. **Given** Edge Function at `supabase/functions/post-to-instagram/index.ts`, **When** secrets set, **Then** `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_IG_USER_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` available to function only (AD-5).
2. **Given** pending rows exist, **When** function invoked, **Then** selects oldest by `created_at ASC`, generates signed URL for `storage_path` in `ace-photos` (AD-3, AD-10).
3. **Given** row selected, **When** caption built, **Then** random string from 30–40 in-code `CAPTIONS` + `\n\n` + `FIXED_HASHTAGS` (AD-7).
4. **Given** signed URL + caption, **When** Instagram Graph API called, **Then** create media container → publish → update row to `posted` with `posted_at` and `instagram_media_id` (AD-8).
5. **Given** Instagram error, **When** handled, **Then** row set to `failed` with `error_message`, no retry (AD-9).
6. **Given** no pending rows, **When** function runs, **Then** logs `nothing to post`, exits 0 (AD-6).
7. **Given** cron configured, **When** inspected, **Then** invokes function daily at 09:00 `America/New_York` via pg_cron + pg_net (AD-6).
8. **Given** valid pending row + credentials, **When** manual invoke before cron, **Then** one image posts to `ace_naps` feed, row shows `posted`.

## Tasks / Subtasks

- [ ] Create `supabase/functions/post-to-instagram/index.ts` (AC: 1–6)
  - [ ] Service-role Supabase client for DB + signed URLs
  - [ ] FIFO query: `.eq('status','pending').order('created_at').limit(1).single()`
  - [ ] `createSignedUrl` on `ace-photos` bucket (short TTL, e.g. 3600s)
  - [ ] Caption: `random(CAPTIONS) + '\n\n' + FIXED_HASHTAGS`
  - [ ] Instagram: POST `/{ig-user-id}/media` then `/{ig-user-id}/media_publish`
  - [ ] Success/failure row updates
- [ ] Create `supabase/functions/post-to-instagram/captions.ts` — 30–40 strings (AC: 3)
- [ ] Migration `002_schedule_daily_cron.sql` (AC: 7)
  - [ ] Enable `pg_net`, `pg_cron` if not present
  - [ ] Schedule with `cron.schedule_in_timezone` at `0 9 * * *` America/New_York
  - [ ] Use vault or env placeholder pattern for URL + service role key
- [ ] Document manual invoke: `supabase functions invoke post-to-instagram`
- [ ] Manual E2E test before enabling cron in prod (AC: 8)

## Dev Notes

Depends on Story 1.1: `posts_queue` table, `ace-photos` bucket, and at least one pending row with valid image.

### Architecture Compliance (MUST)

| Rule | Requirement |
|------|-------------|
| AD-3 | FIFO: `status = 'pending' ORDER BY created_at ASC LIMIT 1` |
| AD-5 | Secrets in Edge Function env only |
| AD-6 | pg_cron + pg_net, 09:00 America/New_York, empty queue → log + exit 0 |
| AD-7 | In-code CAPTIONS array; FIXED_HASHTAGS constant |
| AD-8 | Single-image feed: create container → publish |
| AD-9 | Failed → `status='failed'`, save error, NO auto-retry |
| AD-10 | Private bucket; signed URL at publish time |

### Instagram Graph API Flow

```
POST https://graph.facebook.com/v21.0/{IG_USER_ID}/media
  ?image_url={signedUrl}&caption={encodedCaption}&access_token={TOKEN}

POST https://graph.facebook.com/v21.0/{IG_USER_ID}/media_publish
  ?creation_id={containerId}&access_token={TOKEN}
```

Response from publish includes `id` → store as `instagram_media_id`.

Use `fetch` in Deno Edge Function. On non-2xx, parse error JSON for `error_message`.

### Edge Function Structure

```text
supabase/functions/post-to-instagram/
  index.ts      # handler
  captions.ts   # CAPTIONS array + FIXED_HASHTAGS export
```

Use `@supabase/supabase-js` via `npm:@supabase/supabase-js@2` import map or deno.land.

### Signed URL

```ts
const { data, error } = await supabase.storage
  .from('ace-photos')
  .createSignedUrl(storage_path, 3600)
```

Pass `data.signedUrl` to Instagram as `image_url`.

### Cron Migration Pattern

Store project URL and service role key in Supabase Vault (recommended) or use migration with placeholder comment for manual secret setup:

```sql
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
```

Include separate `002_setup_vault_secrets.sql.example` if vault secrets must be created manually post-deploy.

### Anti-Patterns (DO NOT)

- Do NOT call Instagram from Nuxt client
- Do NOT auto-retry failed publishes
- Do NOT use public bucket URLs — signed URLs only
- Do NOT add carousel/reels/stories support
- Do NOT store captions in database

### Previous Story Intelligence (1.1)

- Bucket name: `ace-photos` (private)
- `storage_path` is relative to bucket root (e.g. `inbox/1734567890-abc123-photo.jpg`)
- Upload page inserts `pending` rows; this function is the ONLY writer of `posted`/`failed` status

### Testing

1. Upload image via Story 1.1 flow
2. Set Edge Function secrets in Supabase dashboard
3. `supabase functions serve post-to-instagram` or deploy + invoke
4. Verify Instagram post + row updated to `posted`
5. Invoke again with empty queue → logs `nothing to post`
6. Apply cron migration after manual test passes

### References

- [Source: docs/architecture/ace-instagram-automation-architecture.md#Posting-flow]
- [Source: docs/architecture/ace-instagram-automation-architecture.md#Instagram-publishing-notes]
- [Source: ARCHITECTURE-SPINE.md — AD-3, AD-5 through AD-10]
- [Source: README.md — token refresh and manual retry SQL]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
