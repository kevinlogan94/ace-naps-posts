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
