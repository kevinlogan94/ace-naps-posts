export type QueueItem = {
  id: string
  storagePath: string
  createdAt: string
  signedUrl: string | null
  order: number
}

const SIGNED_URL_TTL_SECONDS = 3600

export async function fetchPendingQueue(): Promise<QueueItem[]> {
  const supabase = useSupabaseClient()

  const { data, error } = await supabase
    .from('posts_queue')
    .select('id, storage_path, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  if (!data?.length) {
    return []
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

  return data.map((row, index) => ({
    id: row.id,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    signedUrl: urlByPath.get(row.storage_path) ?? null,
    order: index + 1
  }))
}

export function formatQueueDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York'
  }).format(new Date(iso))
}
