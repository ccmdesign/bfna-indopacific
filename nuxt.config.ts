import { publishedInfographics, draftInfographics } from './data/infographics'

// Netlify CONTEXT: 'production' for main, 'branch-deploy' for other branches, 'deploy-preview' for PRs.
// Treat anything that isn't an explicit production build as a preview environment so drafts get prerendered.
const isProductionBuild = process.env.CONTEXT === 'production'

const infographicsToPrerender = isProductionBuild
  ? publishedInfographics
  : [...publishedInfographics, ...draftInfographics]

const infographicsToExcludeFromPrerender = isProductionBuild
  ? draftInfographics
  : []

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },

  // Exclude test pages from production builds entirely (they use runtime dev-only guards,
  // but static imports would still be bundled without build-time exclusion)
  ignore: process.env.NODE_ENV === 'production' ? ['pages/test/**'] : [],

  // Force static generation for SSG deployment
  ssr: true,
  nitro: {
    preset: 'static',
    prerender: {
      routes: infographicsToPrerender.flatMap((i) => [
        `/embed/${i.slug}`,
        `/infographics/${i.slug}`
      ]),
      ignore: [/^\/test\//]
    }
  },

  // Exclude /test/* pages and draft infographics (production only) from prerendering.
  // On dev/branch/preview builds, drafts are prerendered so reviewers can see them.
  routeRules: {
    '/test/embeds': { prerender: false },
    '/test/hormuz': { prerender: false },
    '/test/hormuz/**': { prerender: false },
    ...Object.fromEntries(
      infographicsToExcludeFromPrerender.flatMap((i) => [
        [`/embed/${i.slug}`, { prerender: false }],
        [`/infographics/${i.slug}`, { prerender: false }],
        [`/infographics/${i.slug}/**`, { prerender: false }]
      ])
    )
  },

  // Auto-import: use short names for infographic components (e.g. <RenewablesInfographic />)
  // The default ~/components entry must be listed last to preserve auto-import for all other components.
  components: [
    { path: '~/components/infographics', pathPrefix: false },
    { path: '~/components/straits', pathPrefix: false },
    { path: '~/components/asean', pathPrefix: false },
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
      ],
      // ccm-feedback visual review widget — loaded on dev/branch/preview deploys only,
      // never on production. Production is a single-URL SPA-fallback heavy site and the
      // widget's DOM/URL anchoring collides across infographic routes, so keep it off prod.
      script: isProductionBuild
        ? []
        : [
            {
              src: 'https://ccm-feedback-582.netlify.app/w.js',
              'data-project': 'bfna-indopacific',
              defer: true
            }
          ]
    }
  },
  css: ['~/assets/styles.css']
})
