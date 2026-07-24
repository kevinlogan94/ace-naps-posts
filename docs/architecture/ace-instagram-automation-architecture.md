# Ace Instagram Automation Architecture

## Overview

This document defines a minimal architecture for a single-page Nuxt application that uploads Ace photos to Supabase and a Supabase backend that automatically posts one photo per day to Instagram.

The design goal is low complexity, low maintenance, and as little code as possible while preserving a reliable queue, fixed hashtags, and Ace-voice vision captions at publish time.

## Goals

- Upload one or more photos from a phone-friendly single-page interface.
- Store uploaded photos in Supabase Storage.
- Track post state in a database using `pending`, `posted`, and `failed` statuses.
- Run one scheduled job per day at 9:00 AM Eastern (`America/New_York`) to publish the oldest unprocessed image.
- Build the final Instagram caption from an Ace-voice OpenRouter vision one-liner plus the same four hashtags every time.
- Use a professional Instagram account with the official Instagram Graph API publishing flow.

## Locked product decisions

| Decision             | Value                                                           |
| -------------------- | --------------------------------------------------------------- |
| Instagram account    | `ace_naps` professional account                                 |
| Upload interface     | Single-page Nuxt app with Nuxt UI                               |
| Upload destination   | One Supabase Storage bucket                                     |
| Queue rule           | Oldest unprocessed image first                                  |
| Empty queue behavior | Log `nothing to post` and exit                                  |
| Caption behavior     | OpenRouter vision one-liner (Ace first person) + fixed hashtags |
| Hashtags             | `#naptime #sleep #dogsofinstagram #shihtzulover`                |
| Posting engine       | Supabase Edge Function on a schedule (09:00 `America/New_York`) |
| Frontend hosting     | Netlify                                                         |
| Project layout       | Nuxt app at repo root (`ace-naps-posts`)                        |
| Storage access       | Private bucket; signed URLs at publish time                     |
| RLS                  | Disabled during bootstrap; harden after end-to-end works        |

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

The first version should contain only one page. That page should support selecting one or multiple images, uploading them to Supabase Storage, creating one queue row per file, showing a basic success or failure message, and a read-only pending lineup (order, image, date) so uploaders can see what is already queued.

No authentication, dashboard filters, analytics screens, or admin tooling are required in v1 because they add code without improving the core workflow.

### Suggested UI sections

- Page title such as "Ace uploader".
- Multi-file upload input.
- Upload button.
- Small helper text explaining that one image will be posted each day at 9:00 AM Eastern.
- Read-only "Up next" lineup of pending photos (FIFO order, signed Storage thumbnails, queued date).

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

| Column               | Type                 | Notes                                        |
| -------------------- | -------------------- | -------------------------------------------- |
| `id`                 | UUID                 | Primary key                                  |
| `storage_path`       | text                 | Path to the object in Supabase Storage       |
| `status`             | text                 | `pending`, `posted`, or `failed`             |
| `created_at`         | timestamptz          | Insert timestamp                             |
| `posted_at`          | timestamptz nullable | Set after successful publish                 |
| `error_message`      | text nullable        | Last failure detail                          |
| `instagram_media_id` | text nullable        | Media id returned by Instagram after publish |

The upload page should insert one row per uploaded file with `status = 'pending'` immediately after a successful Storage upload.

### Secrets

Instagram credentials and any service-level secrets should be stored as Supabase Edge Function environment variables or secrets, not in the Nuxt client.

Recommended secret set:

- `INSTAGRAM_ACCESS_TOKEN` (long-lived IGAA token from Instagram Login in Meta for Developers)
- `OPENROUTER_API_KEY` (Edge Function only; used for vision captions)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Posting flow

The scheduled job should run once per day at 9:00 AM Eastern using Supabase Cron and invoke one Edge Function.

### Daily function algorithm

1. Query the oldest row where `status = 'pending'` ordered by `created_at` ascending.
2. If no row exists, log `nothing to post` and exit.
3. Generate a short-lived signed URL for the image object so Instagram (and OpenRouter) can fetch it.
4. Call OpenRouter chat completions (`openai/gpt-4o-mini` via plain `fetch`) with the signed image URL; Ace returns one humorous first-person sentence (no emojis, no hashtags).
5. Append the fixed hashtag string: `#naptime #sleep #dogsofinstagram #shihtzulover`. Do not store the caption in the database.
6. Call the Instagram Graph API media creation endpoint with the image URL and full caption.
7. Call the Instagram Graph API publish endpoint for the created media container.
8. On success, update the row to `posted`, set `posted_at`, and store the returned Instagram media id if available.
9. On failure (including OpenRouter errors), update the row to `failed` and save the error message for inspection. No static caption fallback.

## Instagram publishing notes

Instagram content publishing requires a professional account and uses the official content publishing flow described in Meta's Instagram Platform documentation.

The implementation should stick to single-image feed posts in v1. Avoid carousels, reels, or stories to minimize branching and reduce maintenance. Captions are generated at publish time via OpenRouter vision (AD-7).

The caption field can include hashtags directly, so a single final caption string is enough for posting.

## Caption strategy

At publish time the Edge Function sends the signed image URL to OpenRouter (`openai/gpt-4o-mini`) with a short Ace-voice prompt. Ace is a 16-year-old Shih Tzu, an old boy and a very good boy, sharing his life with family and friends on `@ace_naps`. Captions are one humorous first-person sentence grounded in a visible photo detail, with an expert-napper / sleep-specialist running joke when it fits. Tone is calm and cozy; no emojis, hashtags, em dashes, or quotation marks from the model. Code appends the fixed hashtags.

```ts
const FIXED_HASHTAGS = '#naptime #sleep #dogsofinstagram #shihtzulover'
// finalCaption = openRouterSentence + "\n\n" + FIXED_HASHTAGS
```

Captions are not stored in the database. OpenRouter failure marks the queue row `failed` with no static fallback.

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
    ace-naps-posts-instagram-function/
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
5. Build the Edge Function with OpenRouter vision captions and the fixed hashtags.
6. Verify end-to-end posting with one image.
7. Add the 9:00 AM Eastern cron schedule.
8. Enable RLS and tighten Storage policies.

## Non-goals for v1

The following features are intentionally out of scope for the first release:

- Caption DB / ops review of generated captions.
- Multiple buckets or file moves after posting.
- User accounts or role-based admin UI.
- Analytics dashboards.
- Video, reels, carousel, or stories support.
- Automatic retries and backoff systems.

## Final recommendation

The simplest maintainable architecture is a Nuxt single-page uploader backed by Supabase Storage and Postgres, with one scheduled Supabase Edge Function that posts the oldest pending image each morning using an Ace-voice OpenRouter vision caption and the same four hashtags every time.
