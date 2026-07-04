export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  ssr: false,
  compatibilityDate: '2024-11-01',
  runtimeConfig: {
    public: {
      supabaseUrl: '',
      supabaseAnonKey: ''
    }
  }
})
