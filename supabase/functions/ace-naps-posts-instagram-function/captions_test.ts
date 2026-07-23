import { assertEquals, assertRejects } from 'jsr:@std/assert@1'
import {
  buildCaption,
  FIXED_HASHTAGS,
  parseInstagramError
} from './captions.ts'

Deno.test('FIXED_HASHTAGS matches architecture', () => {
  assertEquals(FIXED_HASHTAGS, '#naptime #sleep #dogsofinstagram #shihtzulover')
})

Deno.test('buildCaption appends fixed hashtags to Ace sentence', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: 'I am a very good boy on this couch.' } }]
      }),
      { status: 200 }
    )
  try {
    const caption = await buildCaption('https://example.com/ace.jpg', 'test-key')
    assertEquals(
      caption,
      `I am a very good boy on this couch.\n\n${FIXED_HASHTAGS}`
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('buildCaption throws on OpenRouter HTTP error', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'Rate limited' } }), {
      status: 429
    })
  try {
    await assertRejects(
      () => buildCaption('https://example.com/ace.jpg', 'test-key'),
      Error,
      'Rate limited'
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('buildCaption throws on empty caption content', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: '  ' } }] }), {
      status: 200
    })
  try {
    await assertRejects(
      () => buildCaption('https://example.com/ace.jpg', 'test-key'),
      Error,
      'OpenRouter returned empty caption'
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('buildCaption throws when OPENROUTER_API_KEY missing', async () => {
  await assertRejects(
    () => buildCaption('https://example.com/ace.jpg', ''),
    Error,
    'Missing required secret: OPENROUTER_API_KEY'
  )
})

Deno.test('parseInstagramError extracts Meta error message', () => {
  assertEquals(
    parseInstagramError({ error: { message: 'Invalid OAuth access token' } }),
    'Invalid OAuth access token'
  )
})

Deno.test('parseInstagramError falls back for unknown shape', () => {
  assertEquals(parseInstagramError(null), 'Unknown Instagram API error')
})
