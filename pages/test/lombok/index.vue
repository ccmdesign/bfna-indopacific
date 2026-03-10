<script setup lang="ts">
import { lombokFlowConfig } from '~/data/straits/lombok-flow'

definePageMeta({ hideFooter: true, suppressRotateOverlay: true })
if (!import.meta.dev) navigateTo('/', { replace: true })
</script>

<template>
  <StraitsStraitParticles :config="lombokFlowConfig" debug />
</template>
