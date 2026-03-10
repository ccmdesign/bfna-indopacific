<script setup lang="ts">
import { luzonFlowConfig } from '~/data/straits/luzon-flow'

definePageMeta({ hideFooter: true, suppressRotateOverlay: true })
if (!import.meta.dev) navigateTo('/', { replace: true })
</script>

<template>
  <StraitsStraitParticles :config="luzonFlowConfig" debug />
</template>
