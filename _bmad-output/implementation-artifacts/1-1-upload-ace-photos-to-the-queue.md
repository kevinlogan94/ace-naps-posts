---
baseline_commit: NO_VCS
---

# Story 1.1: Upload Ace Photos to the Queue

Status: done

## Story

As Kevin,
I want to upload one or more Ace photos from my phone through a simple web page,
so that they are stored safely and queued for daily Instagram posting.

## Acceptance Criteria

1. **Given** Supabase has private bucket `ace-photos` and migration `001_create_posts_queue.sql` applied, **When** inspected, **Then** `posts_queue` exists with columns `id`, `storage_path`, `status`, `created_at`, `posted_at`, `error_message`, `instagram_media_id`, **And** RLS is disabled (AD-11).
2. **Given** Nuxt 4 app at repo root with Nuxt UI, **When** opening `/` on a phone viewport, **Then** page shows title "Ace uploader", multi-file input, upload button, helper text about 9:00 AM Eastern daily posting.
3. **Given** one or more images selected, **When** upload succeeds, **Then** each file is at `inbox/<timestamp>-<random>-<filename>` in `ace-photos`, one `posts_queue` row per file with `status = 'pending'`, success message shows count queued.
4. **Given** upload fails for a file, **When** error occurs, **Then** user sees error message, **And** no queue row for that file (AD-4).
5. **Given** frontend env review, **Then** only `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_ANON_KEY` in client code (AD-5).
6. **Given** Netlify config present, **When** deployed with env vars, **Then** upload page works end-to-end.

## Tasks / Subtasks

- [x] Initialize Nuxt 4 at repo root with `@nuxt/ui` and `@supabase/supabase-js` (AC: 2, 5)
  - [x] `package.json`, `nuxt.config.ts`, `app.vue` with `<UApp>`
  - [x] `netlify.toml` for SSR/static deploy
  - [x] `.env.example` with public Supabase vars only
- [x] Supabase migration `001_create_posts_queue.sql` (AC: 1)
  - [x] Create `posts_queue` table per architecture schema
  - [x] `ALTER TABLE posts_queue DISABLE ROW LEVEL SECURITY`
  - [x] Create private `ace-photos` bucket + bootstrap Storage policies (insert/select for anon)
- [x] `utils/supabase.ts` — singleton client from public env (AC: 5)
- [x] `composables/useSupabaseUpload.ts` — upload + queue insert (AC: 3, 4)
  - [x] Path: `inbox/${Date.now()}-${random}-${sanitizedName}`
  - [x] Storage upload first; insert queue row only on success
  - [x] Return per-file success/failure for UI
- [x] `pages/index.vue` — upload UI with Nuxt UI components (AC: 2, 3, 4)
- [x] Manual verify: `npm run dev`, upload test image (AC: 6)

## Dev Notes

Greenfield repo — no existing app code. Follow structural seed in Architecture Spine exactly.

### Architecture Compliance (MUST)

| Rule | Requirement |
|------|-------------|
| AD-1 | Single route `/`, no auth, no extra pages |
| AD-2 | Bucket `ace-photos`, table `posts_queue`, status lowercase |
| AD-4 | Queue insert ONLY after Storage success |
| AD-5 | Client: `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_ANON_KEY` only |
| AD-11 | RLS disabled on `posts_queue`; open Storage policies for bootstrap |
| AD-12 | Netlify deploy target |

### Technical Stack

- Nuxt **4.4.8**, Nuxt UI **4.x**, `@supabase/supabase-js` latest stable
- Repo root layout — do NOT nest app in subdirectory

### File Structure (create these)

```text
app.vue
pages/index.vue
composables/useSupabaseUpload.ts
utils/supabase.ts
nuxt.config.ts
package.json
netlify.toml
.env.example
supabase/migrations/001_create_posts_queue.sql
```

### Database Schema

```sql
posts_queue (
  id uuid PK default gen_random_uuid(),
  storage_path text not null,
  status text not null default 'pending',  -- pending | posted | failed
  created_at timestamptz not null default now(),
  posted_at timestamptz null,
  error_message text null,
  instagram_media_id text null
)
```

### Upload Flow

1. User selects files → clicks Upload
2. For each file: build path → `storage.from('ace-photos').upload(path, file)`
3. On success: `from('posts_queue').insert({ storage_path: path, status: 'pending' })`
4. On failure: collect error, skip insert for that file
5. Show summary: "Queued N photo(s)" or error details

### Anti-Patterns (DO NOT)

- Do NOT put service-role key or Instagram token in Nuxt code or `nuxt.config` public runtimeConfig
- Do NOT insert queue row before Storage confirms upload
- Do NOT add auth, dashboard, or recent-queue list (deferred v1.1)
- Do NOT create second bucket or move files after upload

### Netlify

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Use `NUXT_PUBLIC_*` env vars in Netlify dashboard.

### Testing

No automated test suite required for v1. Manual: select 2 images, verify Storage objects + 2 pending rows in Supabase table.

### References

- [Source: docs/architecture/ace-instagram-automation-architecture.md#Frontend]
- [Source: docs/architecture/ace-instagram-automation-architecture.md#Supabase-backend]
- [Source: ARCHITECTURE-SPINE.md — AD-1 through AD-5, AD-11, AD-12]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Migration applied via `supabase db push` to portfolio project `swdrcvirhtbxlooklceu`
- E2E upload/insert verified programmatically with anon key; test row/object cleaned up

### Completion Notes List

- Minimal static SPA: `ssr: false`, `nuxt generate` → `dist` for Netlify
- Upload page uses native multi-file input + Nuxt UI button/alerts
- Sequential per-file upload with storage-first, queue insert only on success

### File List

- .gitignore
- app.vue
- composables/useSupabaseUpload.ts
- netlify.toml
- nuxt.config.ts
- package.json
- package-lock.json
- pages/index.vue
- supabase/config.toml
- supabase/migrations/001_create_posts_queue.sql
- utils/supabase.ts
- .env.example

## Change Log

- 2026-07-03: Story 1.1 implemented — Nuxt upload page, Supabase migration applied, Netlify static build config
- 2026-07-03: Code review patches applied — runtimeConfig, partial-upload dedup, migration grant, content-type fallback

### Review Findings

- [x] [Review][Patch] Declare `runtimeConfig.public` Supabase keys in `nuxt.config.ts` [nuxt.config.ts:1]
- [x] [Review][Patch] Clear file input after partial upload success to prevent duplicate re-uploads [app/pages/index.vue:36]
- [x] [Review][Patch] Add explicit `GRANT INSERT, SELECT ON posts_queue TO anon` in migration [supabase/migrations/001_create_posts_queue.sql:11]
- [x] [Review][Patch] Fallback when `file.type` is empty on storage upload [app/composables/useSupabaseUpload.ts:24]
- [x] [Review][Defer] Orphan storage objects when queue insert fails after upload — deferred, AD-11 bootstrap; no anon delete policy by design
- [x] [Review][Defer] Open anon storage insert/select policies — deferred, intentional per AD-11 bootstrap
- [x] [Review][Defer] No client-side file size or MIME enforcement — deferred, out of v1 AC scope
- [x] [Review][Defer] Serial per-file upload (no concurrency) — deferred, acceptable for v1 phone use case
- [x] [Review][Defer] Netlify `dist` copy workaround vs publishing `.output/public` directly — deferred, current build works

### Review Findings (2026-07-04)

- [x] [Review][Patch] Wrap `onUpload` in try/finally so `uploading` resets if `uploadPhotos` throws [app/pages/index.vue:39]
- [x] [Review][Patch] Disable Upload button while `uploading` is true to prevent double-submit [app/pages/index.vue:94]
- [x] [Review][Patch] Fail fast when Supabase URL or anon key is missing at client init [app/utils/supabase.ts:6]
- [x] [Review][Defer] Partial failure leaves native file input out of sync with `files.value` [app/pages/index.vue:57] — deferred, minor retry UX; v1 acceptable
- [x] [Review][Defer] HEIC or empty `file.type` stored as `image/jpeg` may fail at Instagram publish [app/composables/useSupabaseUpload.ts:25] — deferred, out of v1 AC scope
- [x] [Review][Defer] `status` column has no CHECK constraint [supabase/migrations/001_create_posts_queue.sql:4] — deferred, service-role publish path only writes valid values
- [x] [Review][Defer] Storage policies in migration are not idempotent on re-apply [supabase/migrations/001_create_posts_queue.sql:19] — deferred, one-time bootstrap migration
