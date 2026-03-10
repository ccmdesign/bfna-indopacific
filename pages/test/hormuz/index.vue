<script setup lang="ts">
import { hormuzFlowConfig } from '~/data/straits/hormuz-flow'

definePageMeta({ hideFooter: true, suppressRotateOverlay: true })
if (!import.meta.dev) navigateTo('/', { replace: true })
</script>

<template>
  <TestParticleTestPage :config="hormuzFlowConfig" />
</template>
