<script setup lang="ts">
import { babElMandebFlowConfig } from '~/data/straits/bab-el-mandeb-flow'

definePageMeta({ hideFooter: true, suppressRotateOverlay: true })
if (!import.meta.dev) navigateTo('/', { replace: true })
</script>

<template>
  <TestParticleTestPage :config="babElMandebFlowConfig" />
</template>
