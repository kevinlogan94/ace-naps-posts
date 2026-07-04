# Ace Instagram Automation Architecture

## Overview

This document defines a minimal architecture for a single-page Nuxt application that uploads Ace photos to Supabase and a Supabase backend that automatically posts one photo per day to Instagram.

The design goal is low complexity, low maintenance, and as little code as possible while preserving a reliable queue, fixed hashtags, and random caption selection from a predefined list.

## Goals

- Upload one or more photos from a phone-friendly single-page interface.
- Store uploaded photos in Supabase Storage.
- Track post state in a database using `pending`, `posted`, and `failed` statuses.
- Run one scheduled job per day at 9:00 AM Eastern (`America/New_York`) to publish the oldest unprocessed image.
- Build the final Instagram caption from one random predefined caption plus the same four hashtags every time.
- Use a professional Instagram account with the official Instagram Graph API publishing flow.

## Locked product decisions

| Decision | Value |
|---|---|
| Instagram account | `ace_naps` professional account |
| Upload interface | Single-page Nuxt app with Nuxt UI |
| Upload destination | One Supabase Storage bucket |
| Queue rule | Oldest unprocessed image first |
| Empty queue behavior | Log `nothing to post` and exit |
| Caption behavior | Random caption on every post, repeats allowed |
| Hashtags | `#naptime #sleep #dogsofinstagram #shihtzulover` |
| Posting engine | Supabase Edge Function on a schedule (09:00 `America/New_York`) |
| Frontend hosting | Netlify |
| Project layout | Nuxt app at repo root (`ace-naps-posts`) |
| Storage access | Private bucket; signed URLs at publish time |
| RLS | Disabled during bootstrap; harden after end-to-end works |

## High-level architecture

The system is split into two parts: a very small frontend for uploads and a Supabase backend for queue tracking and daily publishing.

```text
Phone browser
   -> Nuxt + Nuxt UI upload page
   -> Supabase Storage bucket
   -> Postgres posts_queue table
   -> Daily Supabase Cron
   -> Supabase Edge Function
   -> Instagram Graph API
```

This split keeps the user-facing experience simple while letting scheduled automation live entirely inside Supabase, which already supports scheduled Edge Function invocation and secret management.

## Frontend

### Stack

- Nuxt 4 for the single-page web app.
- Nuxt UI for the upload form and lightweight status UI.
- `@supabase/supabase-js` for file upload and row creation.

### Single page scope

The first version should contain only one page. That page should support selecting one or multiple images, uploading them to Supabase Storage, creating one queue row per file, and showing a basic success or failure message.

No authentication, dashboard filters, analytics screens, or admin tooling are required in v1 because they add code without improving the core workflow.

### Suggested UI sections

- Page title such as "Ace uploader".
- Multi-file upload input.
- Upload button.
- Small helper text explaining that one image will be posted each day at 9:00 AM Eastern.
- Optional recent queue list showing latest uploads and statuses.

## Supabase backend

### Storage

Use one bucket for all uploaded images.

Recommended shape:

- Bucket: `ace-photos` (private)
- Object path pattern: `inbox/<timestamp>-<random>-<filename>`
- Edge Function generates a short-lived signed URL when posting to Instagram

A second finished bucket is not necessary in v1 because the database status already tracks whether an image has been processed, and avoiding file moves reduces code and state coordination.

### Database

Use one queue table as the source of truth for posting state.

Suggested schema:

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `storage_path` | text | Path to the object in Supabase Storage |
| `status` | text | `pending`, `posted`, or `failed` |
| `created_at` | timestamptz | Insert timestamp |
| `posted_at` | timestamptz nullable | Set after successful publish |
| `error_message` | text nullable | Last failure detail |
| `instagram_media_id` | text nullable | Media id returned by Instagram after publish |

The upload page should insert one row per uploaded file with `status = 'pending'` immediately after a successful Storage upload.

### Secrets

Instagram credentials and any service-level secrets should be stored as Supabase Edge Function environment variables or secrets, not in the Nuxt client.

Recommended secret set:

- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_IG_USER_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Posting flow

The scheduled job should run once per day at 9:00 AM Eastern using Supabase Cron and invoke one Edge Function.

### Daily function algorithm

1. Query the oldest row where `status = 'pending'` ordered by `created_at` ascending.
2. If no row exists, log `nothing to post` and exit.
3. Generate a public or signed URL for the image object so Instagram can fetch it from a reachable URL.
4. Choose one random caption from the predefined in-code caption array, allowing repeats.
5. Append the fixed hashtag string: `#naptime #sleep #dogsofinstagram #shihtzulover`.
6. Call the Instagram Graph API media creation endpoint with the image URL and full caption.
7. Call the Instagram Graph API publish endpoint for the created media container.
8. On success, update the row to `posted`, set `posted_at`, and store the returned Instagram media id if available.
9. On failure, update the row to `failed` and save the error message for inspection.

## Instagram publishing notes

Instagram content publishing requires a professional account and uses the official content publishing flow described in Meta's Instagram Platform documentation.

The implementation should stick to single-image feed posts in v1. Avoid carousels, reels, stories, or AI-generated captions in the first version to minimize branching and reduce maintenance.

The caption field can include hashtags directly, so a single final caption string is enough for posting.

## Caption strategy

The simplest implementation is to keep the caption options inside the Edge Function as a plain array of 30 to 40 strings.

Example structure:

```ts
const CAPTIONS = [
  'Deep in nap mode.',
  'Another elite snooze session.',
  'Professional resting face.',
]

const FIXED_HASHTAGS = '#naptime #sleep #dogsofinstagram #shihtzulover'
```

This is simpler than storing captions in the database because there is no caption CRUD requirement in the current scope.

## Error handling

The first version should keep error handling intentionally simple.

Recommended rules:

- Storage upload failure: show a frontend error and do not create a queue row.
- Instagram publish failure: mark the row `failed` and save the error message.
- Empty queue: log `nothing to post` and exit normally.
- No automatic retries in v1. A failed row can be retried manually later after inspection.

This avoids retry loops and extra scheduler complexity in the first implementation.

## Minimal project structure

The Nuxt app lives at the **repo root** (`ace-naps-posts`).

### Nuxt app (repo root)

```text
ace-naps-posts/
  app.vue
  pages/
    index.vue
  composables/
    useSupabaseUpload.ts
  utils/
    supabase.ts
```

### Supabase

```text
supabase/
  functions/
    post-to-instagram/
      index.ts
  migrations/
    001_create_posts_queue.sql
```

## Security notes

The frontend should never contain Instagram access tokens or service-role credentials.

Only the Edge Function should access sensitive secrets. During bootstrap, **RLS stays disabled** on `posts_queue` and Storage policies remain open so the pipeline can be validated quickly. Harden RLS and bucket policies after end-to-end posting works.

The Edge Function creates signed URLs server-side before posting to Instagram, as Instagram requires a fetchable URL for the asset and the bucket is private.

Deploy the Nuxt app to **Netlify** with only `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_ANON_KEY`.

## Recommended implementation order

1. Create the Supabase Storage bucket.
2. Create the `posts_queue` table migration.
3. Build the single Nuxt page with multi-file upload.
4. Insert queue rows after successful uploads.
5. Build the Edge Function with one hardcoded test caption and the fixed hashtags.
6. Verify end-to-end posting with one image.
7. Add the full 30 to 40 caption array.
8. Add the 9:00 AM Eastern cron schedule.
9. Enable RLS and tighten Storage policies.

## Non-goals for v1

The following features are intentionally out of scope for the first release:

- Caption generation with an LLM.
- Multiple buckets or file moves after posting.
- User accounts or role-based admin UI.
- Analytics dashboards.
- Video, reels, carousel, or stories support.
- Automatic retries and backoff systems.

## Final recommendation

The simplest maintainable architecture is a Nuxt single-page uploader backed by Supabase Storage and Postgres, with one scheduled Supabase Edge Function that posts the oldest pending image each morning using one random predefined caption and the same four hashtags every time.
