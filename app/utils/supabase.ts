import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function useSupabaseClient() {
  if (!client) {
    const url = useRuntimeConfig().public.supabaseUrl as string
    const key = useRuntimeConfig().public.supabaseAnonKey as string
    client = createClient(url, key)
  }
  return client
}
