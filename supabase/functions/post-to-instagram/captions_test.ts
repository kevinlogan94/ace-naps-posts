import { assert, assertEquals, assertMatch } from 'jsr:@std/assert@1'
import {
  buildCaption,
  CAPTIONS,
  FIXED_HASHTAGS,
  parseInstagramError
} from './captions.ts'

Deno.test('CAPTIONS has 30-40 entries', () => {
  assert(CAPTIONS.length >= 30)
  assert(CAPTIONS.length <= 40)
})

Deno.test('FIXED_HASHTAGS matches architecture', () => {
  assertEquals(FIXED_HASHTAGS, '#naptime #sleep #dogsofinstagram #shihtzulover')
})

Deno.test('buildCaption appends fixed hashtags', () => {
  const originalRandom = Math.random
  Math.random = () => 0
  try {
    const caption = buildCaption()
    assertEquals(caption, `${CAPTIONS[0]}\n\n${FIXED_HASHTAGS}`)
  } finally {
    Math.random = originalRandom
  }
})

Deno.test('buildCaption uses random caption from array', () => {
  const originalRandom = Math.random
  Math.random = () => (CAPTIONS.length - 1) / CAPTIONS.length
  try {
    const caption = buildCaption()
    assertMatch(
      caption,
      new RegExp(`${CAPTIONS.at(-1)}\\n\\n${FIXED_HASHTAGS}`)
    )
  } finally {
    Math.random = originalRandom
  }
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
