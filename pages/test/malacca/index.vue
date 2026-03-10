<script setup lang="ts">
import { malaccaFlowConfig } from '~/data/straits/malacca-flow'

definePageMeta({ hideFooter: true, suppressRotateOverlay: true })
if (!import.meta.dev) navigateTo('/', { replace: true })
</script>

<template>
  <StraitsParticleDebug :config="malaccaFlowConfig" />
</template>
