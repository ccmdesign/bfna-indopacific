<!--
  BF-224: cover card the embed stage shows when the host frame is too small for
  the desktop composition (phones, narrow columns). The whole card links to the
  full infographic page in a new tab, which has its own mobile layout where one
  exists. Sized with container queries so one component serves a 343×193 strip,
  a 343×564 portrait frame and anything in between.
-->
<script setup lang="ts">
import type { InfographicEntry } from '~/data/infographics'
import bfnaLogo from '~/assets/images/bfna.svg'

const props = defineProps<{
  entry: InfographicEntry
  href: string
}>()

const headline = computed(() => props.entry.cover?.headline ?? props.entry.title)
const visual = computed(() => `/thumbnails/${props.entry.slug}-visual.jpg`)
</script>

<template>
  <a class="cover-card" :href="href" target="_blank" rel="noopener">
    <span class="cover-card__inner">
      <span class="cover-card__media">
        <img
          class="cover-card__visual"
          :src="visual"
          alt=""
          :style="{ objectPosition: entry.cover?.focal ?? '50% 50%' }"
        />
        <span class="cover-card__scrim" aria-hidden="true" />
      </span>
      <img class="cover-card__logo" :src="bfnaLogo" alt="Bertelsmann Foundation" />

      <span class="cover-card__body">
        <span class="cover-card__kicker">Interactive infographic</span>
        <span class="cover-card__title">{{ headline }}</span>
        <span class="cover-card__desc">{{ entry.description }}</span>
        <span class="cover-card__cta">
          Explore the interactive
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M3 1h6v6M9 1 1 9" stroke="currentColor" stroke-width="1.3" />
          </svg>
        </span>
      </span>
    </span>
  </a>
</template>

<style scoped>
/* The link is the size container; everything inside is laid out by container
   queries against it (a container can't query itself, hence __inner). */
.cover-card {
  position: absolute;
  inset: 0;
  display: block;
  overflow: hidden;
  container-type: size;
  color: #fff;
  text-decoration: none;
  font-family: 'Encode Sans', sans-serif;
  background: #061223;
}

.cover-card__inner {
  position: absolute;
  inset: 0;
  display: block;
}

.cover-card__media {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.cover-card__visual {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.2, 0, 0, 1);
}

.cover-card:hover .cover-card__visual,
.cover-card:focus-visible .cover-card__visual {
  transform: scale(1.03);
}

.cover-card__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(3, 10, 22, 0.94) 0%, rgba(3, 10, 22, 0.72) 42%, rgba(3, 10, 22, 0) 78%);
}

.cover-card__logo {
  position: absolute;
  top: clamp(10px, 4cqmin, 20px);
  right: clamp(10px, 4cqmin, 20px);
  width: clamp(64px, 22cqi, 110px);
  height: auto;
}

.cover-card__body {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: clamp(6px, 2.4cqmin, 12px);
  padding: clamp(14px, 6cqi, 32px);
}

.cover-card__kicker {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
}

.cover-card__title {
  font-size: clamp(18px, 7.5cqi, 40px);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.01em;
  text-wrap: balance;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.cover-card__desc {
  max-width: 46ch;
  font-size: clamp(12px, 3.6cqi, 15px);
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.75);
}

.cover-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  padding: 9px 14px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #04111f;
  background: #fff;
  transition: background 0.2s ease;
}

.cover-card:hover .cover-card__cta,
.cover-card:focus-visible .cover-card__cta {
  background: #cfe4ff;
}

.cover-card:focus-visible {
  outline: 2px solid #fff;
  outline-offset: -4px;
}

/* Portrait frames: a full-bleed crop of a landscape infographic shows a third of
   it, so stack instead — the visual fills the space above, copy sits below. */
@container (max-aspect-ratio: 1 / 1) {
  .cover-card__inner {
    display: flex;
    flex-direction: column;
  }

  .cover-card__media {
    position: relative;
    inset: auto;
    flex: 1 1 auto;
    min-height: 0;
  }

  .cover-card__scrim {
    background: linear-gradient(to top, #061223 0%, rgba(6, 18, 35, 0) 35%);
  }

  .cover-card__body {
    position: relative;
    flex: 0 0 auto;
  }
}

/* Short strips (a 16:9 frame on a phone): drop the description and the logo. */
@container (max-height: 300px) {
  .cover-card__desc { display: none; }
}

@container (max-height: 220px) {
  .cover-card__logo { display: none; }
  .cover-card__kicker { display: none; }
  .cover-card__title { font-size: clamp(16px, 5.5cqi, 28px); }
  .cover-card__cta { padding: 7px 11px; }
}

/* Wide, short frames (phone landscape): text on the left, visual reads on the right. */
@container (min-aspect-ratio: 16 / 9) {
  .cover-card__scrim {
    background: linear-gradient(to right, rgba(3, 10, 22, 0.94) 0%, rgba(3, 10, 22, 0.7) 40%, rgba(3, 10, 22, 0) 75%);
  }

  .cover-card__body {
    right: auto;
    top: 0;
    width: min(60%, 520px);
    justify-content: center;
  }

  .cover-card__title { font-size: clamp(16px, 4.8cqi, 40px); }
}

@media (prefers-reduced-motion: reduce) {
  .cover-card__visual,
  .cover-card__cta {
    transition: none;
  }
}
</style>
