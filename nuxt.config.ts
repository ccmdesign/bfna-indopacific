import { publishedInfographics, draftInfographics } from './data/infographics'
import { COUNTRY_URL_SLUGS } from './data/asean/country-profiles'

// Netlify CONTEXT: 'production' for main, 'branch-deploy' for other branches, 'deploy-preview' for PRs.
// Treat anything that isn't an explicit production build as a preview environment so drafts get prerendered.
const isProductionBuild = process.env.CONTEXT === 'production'

// The ccm-feedback review FAB loads on every non-production deploy, but stays hidden on the
// canonical dev deploy (dev--…netlify.app) that the client sees during review — shown on all
// other branch/preview deploys so internal reviewers can drop pins. (Replaced the blanket
// display:none that lived in assets/styles.css.)
const isMainDevDeploy = process.env.CONTEXT === 'branch-deploy' && process.env.BRANCH === 'dev'

// Cloud sync (Supabase) is opt-in via env vars: set both on a non-production Netlify context to
// switch the widget from per-browser localStorage to shared multi-reviewer mode. ANON/publishable
// key ONLY — never the service-role key. Absent → widget stays in localStorage mode.
const ccmFeedbackSupabaseUrl = process.env.CCM_FEEDBACK_SUPABASE_URL || ''
const ccmFeedbackSupabaseKey = process.env.CCM_FEEDBACK_SUPABASE_ANON_KEY || ''
const ccmFeedbackScript = {
  src: 'https://ccm-feedback-582.netlify.app/w.js',
  'data-project': 'bfna-indopacific',
  defer: true,
  ...(ccmFeedbackSupabaseUrl && ccmFeedbackSupabaseKey
    ? { 'data-supabase-url': ccmFeedbackSupabaseUrl, 'data-supabase-key': ccmFeedbackSupabaseKey }
    : {})
}

const infographicsToPrerender = isProductionBuild
  ? publishedInfographics
  : [...publishedInfographics, ...draftInfographics]

const infographicsToExcludeFromPrerender = isProductionBuild
  ? draftInfographics
  : []

// BF-130: per-country ASEAN detail routes (/infographics/asean/<c>, /embed/asean/<c>).
// Only prerender them when `asean` itself is being prerendered — it's a draft, so
// that's dev/branch/preview today and (future-proof) production once it's published.
const aseanIsPrerendered = infographicsToPrerender.some((i) => i.slug === 'asean')
const aseanCountryRoutes = aseanIsPrerendered
  ? COUNTRY_URL_SLUGS.flatMap((c) => [
      `/infographics/asean/${c}`,
      `/embed/asean/${c}`
    ])
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
      routes: [
        ...infographicsToPrerender.flatMap((i) => [
          `/embed/${i.slug}`,
          `/infographics/${i.slug}`
        ]),
        ...aseanCountryRoutes
      ],
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
        [`/embed/${i.slug}/**`, { prerender: false }],
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
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Encode+Sans+Condensed:wght@100;300;400&display=swap' },
        { rel: 'stylesheet', href: '/styles.css' }
      ],
      // ccm-feedback visual review widget — loaded on dev/branch/preview deploys only,
      // never on production. Production is a single-URL SPA-fallback heavy site and the
      // widget's DOM/URL anchoring collides across infographic routes, so keep it off prod.
      script: isProductionBuild ? [] : [ccmFeedbackScript],
      // Hide the FAB only on the canonical dev deploy the client reviews; visible elsewhere.
      style: isMainDevDeploy
        ? [{ innerHTML: 'ccm-feedback-widget{display:none!important}' }]
        : []
    }
  },
  css: ['~/assets/styles.css']
})
