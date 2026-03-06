<!--
  DEV-ONLY TEST PAGE
  Per-infographic embed preview with iframe simulation and copy-code button.
  Not included in prerender routes.
-->
<script setup lang="ts">
import { infographics } from '~/data/infographics'

definePageMeta({
  layoutClass: 'layout-test',
  suppressRotateOverlay: true
})

const route = useRoute()
const entry = infographics.find(i => i.slug === route.params.slug)

if (!entry) {
  throw createError({ statusCode: 404, statusMessage: 'Infographic not found' })
}

useHead({
  title: `Embed Preview: ${entry.title} - BFNA Indo-Pacific`,
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})

const { embedCode } = useEmbedCode(() => entry.slug, () => entry.title)
</script>

<template>
  <main class="embed-preview-page">
    <header class="embed-preview-header">
      <div class="dev-badge">Dev Only</div>
      <h1>{{ entry!.title }}</h1>
      <p>Preview how this infographic looks when embedded on an external site.</p>
    </header>

    <section class="embed-preview-section">
      <div class="iframe-preview">
        <iframe
          :src="`/embed/${entry!.slug}`"
          width="1280"
          height="800"
          style="border:0;max-width:100%;aspect-ratio:16/10"
          allowfullscreen
          :title="entry!.title"
        />
      </div>

      <div class="embed-code-block">
        <h3>Embed Code</h3>
        <pre><code>{{ embedCode }}</code></pre>
        <EmbedCodeButton :slug="entry!.slug" :title="entry!.title" />
      </div>
    </section>

    <NuxtLink to="/" class="back-link">&larr; Back to Home</NuxtLink>
  </main>
</template>

<style scoped>
.embed-preview-page {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-l);
}

.embed-preview-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.embed-preview-header h1 {
  font-size: var(--size-3);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: var(--space-s) 0;
}

.embed-preview-header p {
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 var(--space-m) 0;
}

.dev-badge {
  display: inline-block;
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: rgba(245, 158, 11, 0.95);
  font-size: var(--size-0);
  font-weight: 600;
  padding: var(--space-3xs) var(--space-s);
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.embed-preview-section {
  margin-bottom: var(--space-xl);
}

.iframe-preview {
  max-height: 60vh;
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  margin-bottom: var(--space-l);
}

.iframe-preview iframe {
  display: block;
  width: 100%;
}

.embed-code-block h3 {
  font-size: var(--size-1);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 var(--space-s) 0;
}

.embed-code-block pre {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: var(--space-m);
  overflow-x: auto;
  margin: 0 0 var(--space-m) 0;
}

.embed-code-block code {
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Courier New', Courier, monospace;
  font-size: var(--size-0);
  white-space: pre-wrap;
  word-break: break-all;
}

.back-link {
  display: inline-block;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  font-size: var(--size-0);
  transition: color 0.2s ease;
}

.back-link:hover {
  color: rgba(255, 255, 255, 0.9);
}
</style>
