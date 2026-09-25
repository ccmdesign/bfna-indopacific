<!--
  BF-224: site error page. Before this, unknown URLs fell through to the hub page
  via a Netlify SPA fallback; now nuxt generate's 404.html renders this.
-->
<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const notFound = computed(() => props.error.statusCode === 404)

useHead({
  title: notFound.value ? 'Page not found — BFNA Indo-Pacific' : 'Something went wrong — BFNA Indo-Pacific',
  meta: [{ name: 'robots', content: 'noindex' }]
})
</script>

<template>
  <main class="error-page">
    <p class="error-page__code">{{ error.statusCode }}</p>
    <h1 class="error-page__title">
      {{ notFound ? 'This page doesn’t exist' : 'Something went wrong' }}
    </h1>
    <p class="error-page__text">
      {{ notFound
        ? 'The link may be out of date. The interactive infographics are all listed on the home page.'
        : 'Please try again in a moment.' }}
    </p>
    <button class="error-page__link" type="button" @click="clearError({ redirect: '/' })">
      See all infographics
    </button>
  </main>
</template>

<style scoped>
.error-page {
  min-height: 100svh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  text-align: center;
  color: #fff;
  font-family: 'Encode Sans', sans-serif;
  background: linear-gradient(to bottom, #0D0D0D 5%, #022640 105%);
}

.error-page__code {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.5);
}

.error-page__title {
  margin: 0;
  font-size: clamp(24px, 4vw, 40px);
  font-weight: 600;
  line-height: 1.1;
}

.error-page__text {
  margin: 0;
  max-width: 40ch;
  color: rgba(255, 255, 255, 0.7);
}

.error-page__link {
  margin-top: 0.75rem;
  padding: 10px 16px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #04111f;
  background: #fff;
  border: 0;
  cursor: pointer;
}

.error-page__link:hover,
.error-page__link:focus-visible {
  background: #cfe4ff;
}
</style>
