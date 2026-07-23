export const FIXED_HASHTAGS = '#naptime #sleep #dogsofinstagram #shihtzulover'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'openai/gpt-4o-mini'
const OPENROUTER_TIMEOUT_MS = 30_000
const PROMPT =
  'You are Ace, a 16-year-old Shih Tzu, an old boy and a very good boy. Write one humorous first-person caption about what you see in this photo. One sentence only. No emojis. No hashtags. Caption text only.'

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
