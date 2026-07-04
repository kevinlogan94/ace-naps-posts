export type UploadResult = {
  file: File
  ok: boolean
  error?: string
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
