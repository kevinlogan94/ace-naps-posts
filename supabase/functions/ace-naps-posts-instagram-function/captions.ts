export const FIXED_HASHTAGS = '#naptime #sleep #dogsofinstagram #shihtzulover'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'openai/gpt-4o-mini'
const PROMPT =
  'You are Ace, a 16-year-old Shih Tzu, an old boy and a very good boy. Write one humorous first-person caption about what you see in this photo. One sentence only. No emojis. No hashtags. Caption text only.'

export async function buildCaption(
  signedUrl: string,
  apiKey = Deno.env.get('OPENROUTER_API_KEY')
): Promise<string> {
  if (!apiKey) throw new Error('Missing required secret: OPENROUTER_API_KEY')

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: signedUrl } }
          ]
        }
      ]
    })
  })

  const body = await response.json()
  if (!response.ok) {
    const message =
      (body as { error?: { message?: string } })?.error?.message ??
      `OpenRouter HTTP ${response.status}`
    throw new Error(message)
  }

  const text = (
    body as {
      choices?: Array<{ message?: { content?: string } }>
    }
  )?.choices?.[0]?.message?.content?.trim()

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
