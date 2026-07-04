import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildCaption, parseInstagramError } from './captions.ts'

const GRAPH_API_VERSION = 'v21.0'
const SIGNED_URL_TTL_SECONDS = 3600

function getEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing required secret: ${name}`)
  return value
}

function createServiceClient() {
  return createClient(
    getEnv('SUPABASE_URL'),
    getEnv('SUPABASE_SERVICE_ROLE_KEY')
  )
}

async function createInstagramMedia(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: accessToken
  })

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media?${params}`,
    { method: 'POST' }
  )

  const body = await response.json()
  if (!response.ok) {
    throw new Error(parseInstagramError(body))
  }

  const creationId = (body as { id?: string }).id
  if (!creationId) throw new Error('Instagram media creation returned no id')
  return creationId
}

async function publishInstagramMedia(
  igUserId: string,
  accessToken: string,
  creationId: string
): Promise<string> {
  const params = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken
  })

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media_publish?${params}`,
    { method: 'POST' }
  )

  const body = await response.json()
  if (!response.ok) {
    throw new Error(parseInstagramError(body))
  }

  const mediaId = (body as { id?: string }).id
  if (!mediaId) throw new Error('Instagram publish returned no media id')
  return mediaId
}

Deno.serve(async () => {
  try {
    const supabase = createServiceClient()
    const accessToken = getEnv('INSTAGRAM_ACCESS_TOKEN')
    const igUserId = getEnv('INSTAGRAM_IG_USER_ID')

    const { data: row, error: queryError } = await supabase
      .from('posts_queue')
      .select('id, storage_path')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (queryError) {
      console.error('Queue query failed:', queryError.message)
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!row) {
      console.log('nothing to post')
      return new Response(JSON.stringify({ message: 'nothing to post' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('ace-photos')
      .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS)

    if (signError || !signed?.signedUrl) {
      const message = signError?.message ?? 'Failed to create signed URL'
      await supabase
        .from('posts_queue')
        .update({ status: 'failed', error_message: message })
        .eq('id', row.id)

      console.error('Signed URL failed:', message)
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const caption = buildCaption()

    try {
      const creationId = await createInstagramMedia(
        igUserId,
        accessToken,
        signed.signedUrl,
        caption
      )
      const mediaId = await publishInstagramMedia(
        igUserId,
        accessToken,
        creationId
      )

      const { error: updateError } = await supabase
        .from('posts_queue')
        .update({
          status: 'posted',
          posted_at: new Date().toISOString(),
          instagram_media_id: mediaId,
          error_message: null
        })
        .eq('id', row.id)

      if (updateError) {
        console.error(
          'Posted to Instagram but DB update failed:',
          updateError.message
        )
        return new Response(
          JSON.stringify({
            warning: 'Posted but failed to update queue row',
            instagram_media_id: mediaId
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.log('Posted to Instagram:', mediaId)
      return new Response(
        JSON.stringify({ posted: true, instagram_media_id: mediaId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } catch (publishError) {
      const message =
        publishError instanceof Error
          ? publishError.message
          : 'Instagram publish failed'

      await supabase
        .from('posts_queue')
        .update({ status: 'failed', error_message: message })
        .eq('id', row.id)

      console.error('Instagram publish failed:', message)
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    console.error('Handler error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
