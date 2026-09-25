<!--
  Public embed previews for infographics available on this deployment.
-->
<script setup lang="ts">
definePageMeta({
  layoutClass: 'layout-test',
  suppressRotateOverlay: true
})

useHead({
  title: 'Embed Previews - BFNA Indo-Pacific',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})

import { infographics } from '~/data/infographics'

const { embedPreviewSlugs } = useRuntimeConfig().public

// useEmbedCode registers onScopeDispose, so create each instance synchronously in setup.
const embedCodes = infographics.filter(e => embedPreviewSlugs.includes(e.slug)).map(e => {
  const { embedCode } = useEmbedCode(() => e.slug, () => e.title)
  return { ...e, code: embedCode, aspect: embedAspectFor(e.slug) }
})
</script>

<template>
  <main class="embed-test-page">
    <header class="embed-test-header">
      <h1>Embed Previews</h1>
      <p>Preview all embeddable infographics and their iframe codes.</p>
    </header>

    <section
      v-for="embed in embedCodes"
      :key="embed.slug"
      class="embed-test-section"
      :aria-label="`Embed preview for ${embed.title}`"
    >
      <h2>
        {{ embed.title }}
        <span
          class="status-badge"
          :class="embed.status === 'draft' ? 'status-draft' : 'status-published'"
          :aria-label="`Status: ${embed.status}`"
        >
          {{ embed.status }}
        </span>
      </h2>

      <div class="iframe-preview">
        <iframe
          :src="`/embed/${embed.slug}`"
          :style="{ display: 'block', width: '100%', border: 0, aspectRatio: embed.aspect }"
          loading="lazy"
          allowfullscreen
          :title="embed.title"
        />
      </div>

      <div class="embed-code-block">
        <h3>Embed Code</h3>
        <pre><code>{{ embed.code }}</code></pre>
        <EmbedCodeButton :slug="embed.slug" :title="embed.title" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.embed-test-page {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-l);
}

.embed-test-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.embed-test-header h1 {
  font-size: var(--size-3);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: var(--space-s) 0;
}

.embed-test-header p {
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 var(--space-m) 0;
}

.embed-test-section {
  margin-bottom: var(--space-xl);
  padding-bottom: var(--space-xl);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.embed-test-section:last-child {
  border-bottom: none;
}

.embed-test-section h2 {
  font-size: var(--size-2);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 var(--space-m) 0;
}

.iframe-preview {
  overflow: hidden;
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

.status-badge {
  display: inline-block;
  font-size: var(--size-0);
  font-weight: 600;
  padding: var(--space-3xs) var(--space-s);
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  vertical-align: middle;
  margin-left: var(--space-xs);
}

.status-draft {
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: rgba(245, 158, 11, 0.95);
}

.status-published {
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.5);
  color: rgba(34, 197, 94, 0.95);
}
</style>
