import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'node', // pure computation tests don't need DOM
    include: ['tests/**/*.test.ts'],
  },
})
