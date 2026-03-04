<script setup lang="ts">
defineProps<{
  slug: string
  title: string
  description: string
  thumbnail?: string
  embedTitle: string
}>()
</script>

<template>
  <article class="infographic-card">
    <div class="card-thumbnail">
      <img
        v-if="thumbnail"
        :src="thumbnail"
        :alt="`Preview of ${title}`"
        width="600"
        height="375"
        loading="lazy"
      />
      <div v-else class="card-thumbnail-placeholder">
        <span class="card-thumbnail-label">{{ title }}</span>
      </div>
    </div>
    <div class="card-content">
      <h2 class="card-title">{{ title }}</h2>
      <p class="card-description">{{ description }}</p>
      <div class="card-actions">
        <EmbedCodeButton :slug="slug" :title="embedTitle" />
        <NuxtLink :to="`/infographics/${slug}`" class="view-link">
          View Infographic
        </NuxtLink>
      </div>
    </div>
  </article>
</template>

<style scoped>
.infographic-card {
  background: rgba(2, 38, 64, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.infographic-card:hover {
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  transform: translateY(-2px);
}

.card-thumbnail img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  display: block;
}

.card-thumbnail-placeholder {
  width: 100%;
  aspect-ratio: 16 / 10;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-thumbnail-label {
  font-size: var(--size-1);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.2);
  text-align: center;
  padding: var(--space-m);
}

.card-content {
  padding: var(--space-m);
}

.card-title {
  font-size: var(--size-2);
  font-weight: 600;
  margin: 0 0 var(--space-xs) 0;
  color: rgba(255, 255, 255, 0.95);
}

.card-description {
  font-size: var(--size-0);
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 var(--space-m) 0;
  line-height: 1.5;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: var(--space-s);
  flex-wrap: wrap;
}

.view-link {
  font-family: 'Encode Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.5rem 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.view-link:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.35);
}

.view-link:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

/* Accessibility: respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .infographic-card {
    transition: none;
  }
  .infographic-card:hover {
    transform: none;
  }
  .view-link {
    transition: none;
  }
}
</style>
