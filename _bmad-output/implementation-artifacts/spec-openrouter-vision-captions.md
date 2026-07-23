---
title: 'OpenRouter vision captions for Ace posts'
type: 'feature'
created: '2026-07-23'
status: 'in-progress'
baseline_revision: 'f3bd54042bbb923a94a31c4c2ea8f4a25d7e1186'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-ace-naps-posts-2026-07-03/ARCHITECTURE-SPINE.md'
  - '{project-root}/docs/architecture/ace-instagram-automation-architecture.md'
warnings: []
---

<intent-contract>

## Intent

**Problem:** Daily Instagram captions are random strings from a hardcoded list and ignore what is in the photo.

**Approach:** At publish time, call OpenRouter with `openai/gpt-4o-mini` (vision) via plain `fetch` so Ace writes a one-sentence humorous caption from the signed image URL; code appends the fixed hashtags. Minimize code; update spine AD-7 and the solution design.

## Boundaries & Constraints

**Always:**
- OpenRouter chat completions via plain `fetch` (no SDK); model id hardcoded as `openai/gpt-4o-mini`
- Secret `OPENROUTER_API_KEY` in Edge Function only (AD-5)
- Caption voice: Ace writing in first person; Ace is a 16-year-old Shih Tzu, old boy, very good boy; humorous; one sentence max; no emojis; no hashtags from the model
- Code appends `\n\n` + `#naptime #sleep #dogsofinstagram #shihtzulover`
- Image input: signed Supabase Storage URL
- Always generate (no unsuitable-image reject path)
- OpenRouter failure → `status = 'failed'`, `error_message` set; no static fallback; no auto-retry (AD-9)
- Do not store the generated caption in the database
- Prefer the least code possible; edit existing files over adding new ones
- Update ARCHITECTURE-SPINE AD-7 (and related map/deferred/secrets) plus `docs/architecture/ace-instagram-automation-architecture.md` to match

**Block If:**
- OpenRouter cannot accept the signed image URL and a base64 fallback would be required (needs human decision)

**Never:**
- OpenAI SDK, Nuxt/client caption generation, caption DB column, reject/approve queue statuses
- Model inventing hashtags or multi-sentence captions as the accepted contract
- Storing captions for ops review
- Expanding into epics/PRODUCT/story rewrites beyond spine + solution design
- Auto-skip to next pending photo on caption failure

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Pending row + reachable signed URL + OpenRouter OK | One Ace-voice sentence + `\n\n` + fixed hashtags → Instagram publish → `posted` | No error expected |
| OpenRouter HTTP/empty | Pending row; OpenRouter non-OK or empty content | Row `failed` with error text; no Instagram publish | Mark failed; return error response |
| Missing `OPENROUTER_API_KEY` | Secret unset | Fail before publish | Error surfaces; row failed if already selected and caption attempted in fail path |
| Empty queue | No pending rows | `nothing to post` | Unchanged |

</intent-contract>

## Code Map

- `supabase/functions/ace-naps-posts-instagram-function/captions.ts` -- replace CAPTIONS/`buildCaption()` with async OpenRouter vision caption; keep FIXED_HASHTAGS + `parseInstagramError`
- `supabase/functions/ace-naps-posts-instagram-function/captions_test.ts` -- rewrite tests for async caption + hashtag append + OpenRouter error parsing/mocking
- `supabase/functions/ace-naps-posts-instagram-function/index.ts` -- await caption with signed URL inside the path that marks `failed` on throw
- `_bmad-output/planning-artifacts/architecture/architecture-ace-naps-posts-2026-07-03/ARCHITECTURE-SPINE.md` -- AD-7 (and AD-5 / capability map / Deferred as needed)
- `docs/architecture/ace-instagram-automation-architecture.md` -- caption strategy, algorithm, secrets, non-goals
- `README.md` -- mention OpenRouter secret + vision captions (ops)

## Tasks & Acceptance

**Execution:**
- [x] `_bmad-output/planning-artifacts/architecture/architecture-ace-naps-posts-2026-07-03/ARCHITECTURE-SPINE.md` -- rewrite AD-7 for OpenRouter vision Ace-voice captions; update AD-5 secrets, capability map, Deferred -- locked decision must match code
- [x] `docs/architecture/ace-instagram-automation-architecture.md` -- align caption strategy, daily algorithm, secrets, non-goals -- companion doc must not contradict spine
- [x] `supabase/functions/ace-naps-posts-instagram-function/captions.ts` -- remove CAPTIONS; add async OpenRouter vision caption builder; append fixed hashtags in code -- core behavior
- [x] `supabase/functions/ace-naps-posts-instagram-function/index.ts` -- `await` caption(signedUrl) inside fail-to-`failed` path -- OpenRouter errors must not leave row `pending`
- [x] `supabase/functions/ace-naps-posts-instagram-function/captions_test.ts` -- unit-test I/O matrix edges (hashtag append, OpenRouter failure/empty, Ace sentence without hashtags from model) -- verify contract
- [x] `README.md` -- document `OPENROUTER_API_KEY` and that captions are Ace-voice vision one-liners -- ops clarity

**Acceptance Criteria:**
- Given a pending photo and valid OpenRouter key, when the Edge Function runs, then it sends the signed image URL to OpenRouter `openai/gpt-4o-mini`, builds `sentence + "\n\n" + FIXED_HASHTAGS`, and publishes to Instagram without reading the old CAPTIONS array.
- Given OpenRouter returns an error or empty caption, when handled, then the queue row is `failed` with `error_message` and Instagram is not called.
- Given architecture docs, when inspected, then AD-7 and the solution design describe vision Ace-voice captions (not random in-code captions) and list `OPENROUTER_API_KEY`.
- Given unit tests, when Deno tests for captions run, then they pass for hashtag append and OpenRouter failure/empty handling.

## Spec Change Log

## Review Triage Log

## Design Notes

OpenRouter request shape (minimal):

```ts
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer ${OPENROUTER_API_KEY}
{ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: [
  { type: 'text', text: PROMPT },
  { type: 'image_url', image_url: { url: signedUrl } }
]}]}
```

Prompt must require: Ace first-person voice; 16yo old good boy; one humorous sentence; no emojis/hashtags; caption text only.

Critical: today's `buildCaption()` sits outside the Instagram try/catch; move caption generation into the path that updates `failed` on throw.

## Verification

**Commands:**
- `deno test supabase/functions/ace-naps-posts-instagram-function/captions_test.ts` -- expected: all tests pass

**Manual checks (if no CLI):**
- Confirm `CAPTIONS` array is gone and model id `openai/gpt-4o-mini` is hardcoded
- Confirm no caption column migration was added
