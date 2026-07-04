export const CAPTIONS = [
  'Deep in nap mode.',
  'Another elite snooze session.',
  'Professional resting face.',
  'Ace has entered the nap dimension.',
  'Currently accepting zero responsibilities.',
  'Snooze mode: activated.',
  'The art of doing absolutely nothing.',
  'Champion napper reporting for duty.',
  'Dreaming of treats and belly rubs.',
  'Out of office. Indefinitely.',
  'This is my happy place.',
  'Maximum coziness achieved.',
  'Not now. Napping.',
  'Living the dream, one nap at a time.',
  'Soft fur, softer schedule.',
  'Ace is offline until further notice.',
  'Peak relaxation energy.',
  'The floor is lava. The bed is heaven.',
  'Certified nap enthusiast.',
  'Too cute to function today.',
  'Shih tzu siesta in progress.',
  'Do not disturb the royalty.',
  'Blanket burrito mode engaged.',
  'Sunbeam acquired. Nap commencing.',
  'Zero thoughts, just zzz.',
  'Master of the midday snooze.',
  'Fluff level: maximum.',
  'Currently recharging cuteness.',
  'The nap gods have spoken.',
  'Ace approves this resting spot.',
  'Sleeping beauty, shih tzu edition.',
  'All systems down for maintenance.',
  'Tiny dog, big nap energy.',
  'Paws up, world off.',
  'Nap first. Everything else later.',
  'Soft boy, hard nap.',
  'Ace is busy being adorable.',
  'Closed for nap business.',
  'Dreaming in HD fluff.',
  'The snooze is strong with this one.'
] as const

export const FIXED_HASHTAGS = '#naptime #sleep #dogsofinstagram #shihtzulover'

export function buildCaption(): string {
  const index = Math.floor(Math.random() * CAPTIONS.length)
  return `${CAPTIONS[index]}\n\n${FIXED_HASHTAGS}`
}

export function parseInstagramError(body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as { error?: { message?: string } }).error
    if (error?.message) return error.message
  }
  return 'Unknown Instagram API error'
}
