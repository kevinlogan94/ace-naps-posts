export type QueueItem = {
  id: string
  storagePath: string
  createdAt: string
  signedUrl: string | null
  order: number
}

export type PendingQueue = {
  items: QueueItem[]
  total: number
}

const SIGNED_URL_TTL_SECONDS = 3600
const POST_HOUR_EASTERN = 10
const EASTERN_TZ = 'America/New_York'

export async function fetchPendingQueue(): Promise<PendingQueue> {
  const supabase = useSupabaseClient()

  const { data, error, count } = await supabase
    .from('posts_queue')
    .select('id, storage_path, created_at', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5)

  if (error) {
    throw error
  }

  if (!data?.length) {
    return { items: [], total: count ?? 0 }
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('ace-photos')
    .createSignedUrls(
      data.map((row) => row.storage_path),
      SIGNED_URL_TTL_SECONDS
    )

  if (signError) {
    throw signError
  }

  const urlByPath = new Map(
    (signed ?? [])
      .filter((entry) => entry.path && entry.signedUrl)
      .map((entry) => [entry.path!, entry.signedUrl!])
  )

  return {
    items: data.map((row, index) => ({
      id: row.id,
      storagePath: row.storage_path,
      createdAt: row.created_at,
      signedUrl: urlByPath.get(row.storage_path) ?? null,
      order: index + 1
    })),
    total: count ?? data.length
  }
}

function easternCalendarParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now)

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour')
  }
}

/** YYYY-MM-DD for the next 10 AM Eastern publish slot. */
export function nextReleaseDateKey(now = new Date()) {
  const { year, month, day, hour } = easternCalendarParts(now)
  const offsetDays = hour < POST_HOUR_EASTERN ? 0 : 1
  const release = new Date(Date.UTC(year, month - 1, day + offsetDays))
  return release.toISOString().slice(0, 10)
}

/** Release calendar day for queue position (1 = next slot). */
export function releaseDateKeyForOrder(order: number, now = new Date()) {
  const [year, month, day] = nextReleaseDateKey(now).split('-').map(Number)
  const release = new Date(Date.UTC(year, month - 1, day + (order - 1)))
  return release.toISOString().slice(0, 10)
}

export function formatReleaseDate(order: number, now = new Date()) {
  const [year, month, day] = releaseDateKeyForOrder(order, now)
    .split('-')
    .map(Number)

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}
