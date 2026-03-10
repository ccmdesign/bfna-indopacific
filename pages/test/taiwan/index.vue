<script setup lang="ts">
import { taiwanFlowConfig } from '~/data/straits/taiwan-flow'

definePageMeta({ hideFooter: true, suppressRotateOverlay: true })
if (!import.meta.dev) navigateTo('/', { replace: true })
</script>

<template>
  <TestParticleTestPage :config="taiwanFlowConfig" />
</template>
