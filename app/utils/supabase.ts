import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function useSupabaseClient() {
  if (!client) {
    const url = useRuntimeConfig().public.supabaseUrl as string
    const key = useRuntimeConfig().public.supabaseAnonKey as string
    if (!url || !key) {
      throw new Error(
        'Missing Supabase config. Set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY.'
      )
    }
    client = createClient(url, key)
  }
  return client
}
