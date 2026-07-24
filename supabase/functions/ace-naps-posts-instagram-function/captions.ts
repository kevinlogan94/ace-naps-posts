export const FIXED_HASHTAGS = '#naptime #sleep #dogsofinstagram #shihtzulover'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'openai/gpt-4o-mini'
const OPENROUTER_TIMEOUT_MS = 30_000
const PROMPT = `You are Ace, a 16-year-old Shih Tzu, an old boy and a very good boy. This Instagram page exists so family and friends can stay connected with you and see more of your life.

Write one humorous first-person caption about what you see in this photo. Reference one visible detail (your pose, where you are, what you're doing, a blanket, the light, etc.).

Your running joke: you are an expert napper, a sleep specialist, and basically a mythological creature of rest, even when the photo isn't strictly a nap. Lean into that persona when it fits; when it doesn't, stay warm and funny about whatever you're actually doing.

Tone: calm, cozy, gently funny. Dignified senior-dog energy. Wholesome, never mean. Not hyper or slangy. You're sharing your life with people who already love you.

One sentence only. No emojis. No hashtags. No em dashes. No quotation marks. Return caption text only.`

export async function buildCaption(
  signedUrl: string,
  apiKey = Deno.env.get('OPENROUTER_API_KEY')
): Promise<string> {
  const key = apiKey?.trim()
  if (!key) throw new Error('Missing required secret: OPENROUTER_API_KEY')
  if (!signedUrl) throw new Error('Missing signed image URL')

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 80,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: signedUrl } }
          ]
        }
      ]
    }),
    signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS)
  })

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error(`OpenRouter returned non-JSON (HTTP ${response.status})`)
  }

  if (!response.ok) {
    const message =
      (body as { error?: { message?: string } })?.error?.message ??
      `OpenRouter HTTP ${response.status}`
    throw new Error(message)
  }

  const raw = (body as { choices?: Array<{ message?: { content?: unknown } }> })
    ?.choices?.[0]?.message?.content
  const text = typeof raw === 'string' ? raw.trim() : ''

  if (!text) throw new Error('OpenRouter returned empty caption')

  return `${text}\n\n${FIXED_HASHTAGS}`
}

export function parseInstagramError(body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as { error?: { message?: string } }).error
    if (error?.message) return error.message
  }
  return 'Unknown Instagram API error'
}
