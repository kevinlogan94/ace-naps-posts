---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - docs/architecture/ace-instagram-automation-architecture.md
  - _bmad-output/planning-artifacts/architecture/architecture-ace-naps-posts-2026-07-03/ARCHITECTURE-SPINE.md
---

# ace-naps-posts - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for ace-naps-posts, decomposing the requirements from the Architecture into two implementable stories. Scope is limited to v1 bootstrap per `docs/architecture/ace-instagram-automation-architecture.md` and the Architecture Spine. RLS hardening and optional recent-queue UI are deferred.

## Requirements Inventory

### Functional Requirements

FR1: A phone-friendly single-page Nuxt app at repo root allows selecting and uploading one or more Ace photos.
FR2: Uploaded images are stored in a private Supabase Storage bucket named `ace-photos` using path pattern `inbox/<timestamp>-<random>-<filename>`.
FR3: After a successful Storage upload, the app inserts one `posts_queue` row per file with `status = 'pending'` and the correct `storage_path`.
FR4: On Storage upload failure, the app shows an error and does not create a queue row.
FR5: A `posts_queue` Postgres table tracks posting state with columns: `id`, `storage_path`, `status`, `created_at`, `posted_at`, `error_message`, `instagram_media_id`.
FR6: Status values are `pending`, `posted`, or `failed`.
FR7: A scheduled Supabase job runs once daily at 09:00 `America/New_York` and invokes the `post-to-instagram` Edge Function.
FR8: The Edge Function selects the oldest pending row (`ORDER BY created_at ASC LIMIT 1`).
FR9: If no pending row exists, the function logs `nothing to post` and exits successfully.
FR10: The Edge Function generates a short-lived signed URL for the private bucket object before calling Instagram.
FR11: The final caption is one random string from an in-code array (30–40 options, repeats allowed) plus fixed hashtags `#naptime #sleep #dogsofinstagram #shihtzulover`.
FR12: The Edge Function publishes a single-image Instagram feed post via Graph API (create media container → publish container) for the `ace_naps` professional account.
FR13: On publish success, the row is updated to `posted` with `posted_at` and `instagram_media_id` when available.
FR14: On publish failure, the row is updated to `failed` with `error_message`; no automatic retry.
FR15: The upload page shows basic success or failure feedback after upload attempts.

### NonFunctional Requirements

NFR1: Keep implementation minimal — lowest complexity and maintenance for a reliable queue, fixed hashtags, and random caption selection.
NFR2: Frontend env exposes only `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_ANON_KEY`; no Instagram tokens or service-role key in client code.
NFR3: Instagram and service-role secrets live only in Edge Function secrets (`INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_IG_USER_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
NFR4: RLS remains disabled on `posts_queue` and Storage policies stay open during bootstrap until end-to-end posting is verified.
NFR5: Deploy the Nuxt app to Netlify.
NFR6: Use Nuxt 4, Nuxt UI, and `@supabase/supabase-js` per Architecture Spine stack table.
NFR7: v1 supports single-image feed posts only — no carousels, reels, stories, or LLM captions.
NFR8: No automatic retry or backoff on publish failure in v1.

### Additional Requirements

- Project layout: Nuxt app at repo root with `app.vue`, `pages/index.vue`, `composables/useSupabaseUpload.ts`, `utils/supabase.ts`.
- Supabase layout: `supabase/functions/post-to-instagram/index.ts`, `supabase/migrations/001_create_posts_queue.sql`.
- Create private bucket `ace-photos` before upload flow is tested.
- Edge Function caption constants: `CAPTIONS` array (30–40 strings) and `FIXED_HASHTAGS = '#naptime #sleep #dogsofinstagram #shihtzulover'`.
- Daily scheduling via Supabase `pg_cron` + `pg_net` invoking `post-to-instagram`.
- Upload page UI: title (e.g. "Ace uploader"), multi-file input, upload button, helper text about 9:00 AM Eastern daily posting.
- Empty queue behavior: log `nothing to post` and exit 0.
- Manual retry of failed rows is out-of-band (SQL); not in v1 story scope.

### UX Design Requirements

No UX design contract exists. UI requirements are defined inline in the Architecture document (Nuxt UI upload form, success/error feedback, optional recent queue list deferred to v1.1).

### FR Coverage Map

FR1: Epic 1 Story 1.1 — Single-page multi-file upload UI
FR2: Epic 1 Story 1.1 — Private `ace-photos` bucket and path convention
FR3: Epic 1 Story 1.1 — Queue row insert after Storage success
FR4: Epic 1 Story 1.1 — Upload failure handling
FR5: Epic 1 Story 1.1 — `posts_queue` migration
FR6: Epic 1 Story 1.1 — Status enum in schema
FR7: Epic 1 Story 1.2 — Daily cron schedule
FR8: Epic 1 Story 1.2 — FIFO pending selection
FR9: Epic 1 Story 1.2 — Empty queue exit
FR10: Epic 1 Story 1.2 — Signed URL generation
FR11: Epic 1 Story 1.2 — Random caption + fixed hashtags
FR12: Epic 1 Story 1.2 — Instagram Graph API publish flow
FR13: Epic 1 Story 1.2 — Success row update
FR14: Epic 1 Story 1.2 — Failure row update without retry
FR15: Epic 1 Story 1.1 — Upload feedback UI

## Epic List

### Epic 1: Ace Photo Upload & Daily Instagram Posting

Kevin can upload Ace nap photos from a phone and have the oldest pending photo published automatically each morning to the `ace_naps` Instagram account with a random caption and fixed hashtags.

**FRs covered:** FR1–FR15

## Epic 1: Ace Photo Upload & Daily Instagram Posting

Kevin can upload Ace nap photos from a phone and have the oldest pending photo published automatically each morning to the `ace_naps` Instagram account with a random caption and fixed hashtags.

### Story 1.1: Upload Ace Photos to the Queue

As Kevin,
I want to upload one or more Ace photos from my phone through a simple web page,
So that they are stored safely and queued for daily Instagram posting.

**Acceptance Criteria:**

**Given** the Supabase project has a private bucket `ace-photos` and migration `001_create_posts_queue.sql` applied with the schema from the Architecture doc
**When** the migration is inspected
**Then** table `posts_queue` exists with columns `id` (UUID PK), `storage_path`, `status`, `created_at`, `posted_at`, `error_message`, `instagram_media_id`
**And** RLS is disabled on `posts_queue` per bootstrap rule AD-11

**Given** the Nuxt 4 app is initialized at repo root with Nuxt UI and `@supabase/supabase-js`
**When** I open `/` on a phone-sized viewport
**Then** I see a page titled "Ace uploader" (or equivalent), a multi-file image input, an upload button, and helper text that one image posts daily at 9:00 AM Eastern

**Given** I select one or more image files and tap Upload
**When** Storage upload succeeds for each file
**Then** each file is stored at `inbox/<timestamp>-<random>-<filename>` in bucket `ace-photos`
**And** one `posts_queue` row is inserted per file with `status = 'pending'` and the correct `storage_path`
**And** I see a success message indicating how many photos were queued

**Given** I select files and tap Upload
**When** any Storage upload fails
**Then** I see an error message describing the failure
**And** no queue row is created for the failed file

**Given** the app is configured for deployment
**When** environment variables are reviewed
**Then** only `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_ANON_KEY` are used in frontend code
**And** no Instagram token or Supabase service-role key appears in client bundles or Netlify public env

**Given** Netlify deployment is configured
**When** the app is deployed
**Then** the upload page is reachable and can successfully upload at least one test image end-to-end (Storage object + pending queue row)

### Story 1.2: Publish Oldest Pending Photo Daily to Instagram

As Kevin,
I want the system to automatically post the oldest pending photo each morning to Instagram,
So that Ace's nap photos go live without manual publishing.

**Acceptance Criteria:**

**Given** Edge Function `post-to-instagram` exists at `supabase/functions/post-to-instagram/index.ts`
**When** required secrets are set (`INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_IG_USER_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
**Then** secrets are accessible to the function only and not exposed to the Nuxt client

**Given** one or more rows exist with `status = 'pending'`
**When** the Edge Function is invoked manually or by cron
**Then** it selects exactly one row: oldest by `created_at ASC`
**And** generates a short-lived signed URL for that row's `storage_path` in bucket `ace-photos`

**Given** a pending row is selected
**When** the function builds the caption
**Then** it chooses one random string from an in-code `CAPTIONS` array of 30–40 predefined strings (repeats allowed)
**And** appends `\n\n` plus `FIXED_HASHTAGS = '#naptime #sleep #dogsofinstagram #shihtzulover'`

**Given** a signed URL and final caption exist
**When** the function calls Instagram Graph API for the `ace_naps` professional account
**Then** it creates a single-image feed media container with the image URL and caption
**And** publishes the container via the publish endpoint
**And** on success updates the row to `status = 'posted'`, sets `posted_at`, and stores `instagram_media_id` when returned

**Given** Instagram API returns an error during create or publish
**When** the function handles the failure
**Then** the row is updated to `status = 'failed'` with a descriptive `error_message`
**And** no automatic retry is attempted

**Given** no rows have `status = 'pending'`
**When** the Edge Function runs
**Then** it logs `nothing to post`
**And** exits successfully without error

**Given** Supabase cron is configured
**When** the schedule is inspected
**Then** `post-to-instagram` is invoked once daily at 09:00 `America/New_York` via `pg_cron` + `pg_net`

**Given** at least one pending row with a valid image exists and Instagram credentials are valid
**When** the function is invoked manually before enabling cron
**Then** one image is published to the `ace_naps` Instagram feed and the corresponding queue row shows `status = 'posted'`
**And** this manual end-to-end test passes before cron is enabled in production
