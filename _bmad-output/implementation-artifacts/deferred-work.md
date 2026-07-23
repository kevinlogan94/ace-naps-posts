## Deferred from: code review of 1-1-upload-ace-photos-to-the-queue.md (2026-07-03)

- Orphan storage objects when queue insert fails after upload — AD-11 bootstrap; no anon delete policy by design
- Open anon storage insert/select policies — intentional per AD-11 bootstrap
- No client-side file size or MIME enforcement — out of v1 AC scope
- Serial per-file upload (no concurrency) — acceptable for v1 phone use case
- Netlify `dist` copy workaround vs publishing `.output/public` directly — current build works

## Deferred from: code review of 1-1-upload-ace-photos-to-the-queue.md (2026-07-04)

- Partial failure leaves native file input out of sync with `files.value` — minor retry UX; v1 acceptable
- HEIC or empty `file.type` stored as `image/jpeg` may fail at Instagram publish — out of v1 AC scope
- `status` column has no CHECK constraint — service-role publish path only writes valid values
- Storage policies in migration are not idempotent on re-apply — one-time bootstrap migration

## Deferred from: code review of 1-2-publish-oldest-pending-photo-daily-to-instagram.md (2026-07-04)

- FIFO selection has no row lock — concurrent manual invoke + cron could double-post; v1 assumes once-daily cron only
- No Instagram container `status_code` polling before publish — spec two-step flow; Meta async containers may flake
- Cron `pg_net.http_post` does not inspect HTTP response — publish failures invisible at DB layer; v1 ops acceptable
- Cron migration can apply before vault secrets exist — URL becomes `NULL/functions/v1/...`; example file exists
- Transient signed-URL errors permanently mark row `failed` with no retry — AD-9 no auto-retry; README manual reset documented
- `index.ts` handler untested — only `captions.ts` covered by Deno tests; v1 acceptable
- `parseInstagramError` stores message only, drops Meta error codes — minor ops detail

## Deferred from: spec-openrouter-vision-captions.md (2026-07-23)

- source_spec: `_bmad-output/implementation-artifacts/spec-openrouter-vision-captions.md`
  summary: Instagram container polling can still consume most of the Edge Function wall-clock after a successful caption, so a late platform abort may leave the row without a clean `failed` update.
  evidence: Pre-existing `waitForContainerReady` loop (up to ~60s) remains; OpenRouter now has a 30s timeout, but IG polling budget risk is unchanged.
