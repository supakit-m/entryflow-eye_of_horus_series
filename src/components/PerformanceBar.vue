<template>
  <div class="card px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1.5">
    <!-- FPS -->
    <div class="flex items-center gap-2">
      <span class="stat-label">FPS</span>
      <span class="stat-value font-mono text-sm" :class="fpsColor">
        {{ metrics.fps.toFixed(1) }}
      </span>
      <!-- mini bar -->
      <div class="w-16 h-1.5 bg-horus-border rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="fpsBarColor"
          :style="{ width: fpsBarWidth }"
        />
      </div>
    </div>

    <!-- Latency -->
    <div class="flex items-center gap-2">
      <span class="stat-label">Latency</span>
      <span class="stat-value font-mono text-sm" :class="latencyColor">
        {{ metrics.latency }}ms
      </span>
    </div>

    <!-- Tracks -->
    <div class="flex items-center gap-2">
      <span class="stat-label">Tracks</span>
      <span class="stat-value font-mono text-sm text-horus-blue">
        {{ metrics.trackCount }}
      </span>
    </div>

    <!-- Status dot -->
    <div class="ml-auto flex items-center gap-2">
      <span
        class="w-2 h-2 rounded-full"
        :class="running ? 'bg-horus-green animate-pulse-gold' : 'bg-horus-muted'"
      />
      <span class="text-xs font-mono text-horus-text-dim uppercase tracking-widest">
        {{ running ? 'LIVE' : 'IDLE' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  metrics: {
    type: Object,
    default: () => ({ fps: 0, latency: 0, trackCount: 0 })
  },
  running: { type: Boolean, default: false }
})

const fpsColor = computed(() => {
  const f = props.metrics.fps
  if (f >= 20) return 'text-horus-green'
  if (f >= 10) return 'text-yellow-400'
  return 'text-horus-red'
})

const fpsBarColor = computed(() => {
  const f = props.metrics.fps
  if (f >= 20) return 'bg-horus-green'
  if (f >= 10) return 'bg-yellow-400'
  return 'bg-horus-red'
})

const fpsBarWidth = computed(() => {
  const pct = Math.min(100, (props.metrics.fps / 30) * 100)
  return `${pct}%`
})

const latencyColor = computed(() => {
  const l = props.metrics.latency
  if (l <= 80)  return 'text-horus-green'
  if (l <= 150) return 'text-yellow-400'
  return 'text-horus-red'
})
</script>
