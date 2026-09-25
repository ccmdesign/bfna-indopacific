<!--
  BF-224: design-size render of the Straits infographic for the embed stage.
  /embed/straits loads this in an inner iframe at the canvas size from
  data/infographics.ts and scales it to fit the host frame, so the desktop
  composition (and its vw/svh type scale) never reflows inside a small iframe.
  Not meant to be embedded directly.
-->
<script setup lang="ts">
import { straits } from '~/utils/straitsData'
import type { Strait } from '~/types/strait'

definePageMeta({
  layout: 'embed',
  layoutClass: 'layout-2'
})

const route = useRoute()
const router = useRouter()

const VALID_IDS = new Set(straits.map((s: Strait) => s.id))

// Selection lives in this frame's own URL hash — it never touches the host page.
const straitId = computed(() => {
  const hash = route.hash?.replace('#', '')
  return hash && VALID_IDS.has(hash) ? hash : null
})

useStraitsHead(undefined, {
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
useEmbedCanvas()

function onSelect(id: string | null) {
  if (id) {
    document.body.dataset.strait = id
    router.replace({ hash: `#${id}`, query: route.query })
  } else {
    delete document.body.dataset.strait
    router.replace({ hash: '', query: route.query })
  }
}
</script>

<template>
  <StraitsDesktop :selected-strait-id="straitId" @select="onSelect" />
</template>
