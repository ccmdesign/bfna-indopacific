// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },

  // Force static generation for SSG deployment
  ssr: true,
  nitro: {
    preset: 'static'
  },

  modules: ['nuxt-gtag'],

  gtag: {
    id: 'G-F377FSB69V',
    config: {
      send_page_view: false
    }
  },

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Encode+Sans:wght@400;600&display=swap' },
        { rel: 'stylesheet', href: '/styles.css' }
      ]
    }
  },
  css: ['~/assets/styles.css']
})
