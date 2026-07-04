export type UploadResult = {
  file: File
  ok: boolean
  error?: string
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export function getUploadSizeError(file: File): string | undefined {
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'Must be 8 MB or smaller.'
  }
  return undefined
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function buildStoragePath(filename: string) {
  const random = crypto.randomUUID().slice(0, 8)
  return `inbox/${Date.now()}-${random}-${sanitizeFilename(filename)}`
}

export async function uploadPhotos(files: File[]): Promise<UploadResult[]> {
  const supabase = useSupabaseClient()
  const results: UploadResult[] = []

  for (const file of files) {
    const sizeError = getUploadSizeError(file)
    if (sizeError) {
      results.push({ file, ok: false, error: sizeError })
      continue
    }

    const path = buildStoragePath(file.name)
    const { error: uploadError } = await supabase.storage
      .from('ace-photos')
      .upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false
      })

    if (uploadError) {
      results.push({ file, ok: false, error: uploadError.message })
      continue
    }

    const { error: insertError } = await supabase
      .from('posts_queue')
      .insert({ storage_path: path, status: 'pending' })

    if (insertError) {
      results.push({ file, ok: false, error: insertError.message })
      continue
    }

    results.push({ file, ok: true })
  }

  return results
}
