// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },

  // Force static generation for SSG deployment
  ssr: true,
  nitro: {
    preset: 'static',
    prerender: {
      routes: [
        '/embed/renewables',
        '/embed/straits',
        '/infographics/renewables',
        '/infographics/straits'
      ]
    }
  },

  // Exclude /test/* pages from prerendering -- dev/preview only.
  routeRules: {
    '/test/**': { prerender: false }
  },

  // Auto-import: use short names for infographic components (e.g. <RenewablesInfographic />)
  // The default ~/components entry must be listed last to preserve auto-import for all other components.
  components: [
    { path: '~/components/infographics', pathPrefix: false },
    '~/components'
  ],

  modules: ['nuxt-gtag'],

  gtag: {
    id: 'G-5X2S1H0R18'
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
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
