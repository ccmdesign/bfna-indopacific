import { publishedInfographics, draftInfographics } from './data/infographics'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },

  // Force static generation for SSG deployment
  ssr: true,
  nitro: {
    preset: 'static',
    prerender: {
      routes: publishedInfographics.flatMap((i) => [
        `/embed/${i.slug}`,
        `/infographics/${i.slug}`
      ])
    }
  },

  // Exclude /test/* pages and draft infographics from prerendering -- dev/preview only.
  routeRules: {
    '/test/**': { prerender: false },
    ...Object.fromEntries(
      draftInfographics.flatMap((i) => [
        [`/embed/${i.slug}`, { prerender: false }],
        [`/infographics/${i.slug}`, { prerender: false }]
      ])
    )
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
