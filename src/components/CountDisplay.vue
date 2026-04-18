<template>
  <div class="grid grid-cols-3 gap-3">
    <!-- IN counter -->
    <div class="card px-4 py-4 flex flex-col items-center gap-1 border-horus-green/30">
      <span class="stat-label text-horus-green">IN</span>
      <span
        ref="inRef"
        class="stat-value text-horus-green font-mono text-4xl tabular-nums"
        :class="{ 'animate-count-pop': inPop }"
      >{{ counts.in }}</span>
      <span class="text-horus-text-dim text-[11px] font-mono">entering</span>
    </div>

    <!-- NET counter -->
    <div class="card px-4 py-4 flex flex-col items-center gap-1 border-horus-gold/30">
      <span class="stat-label text-horus-gold">NET</span>
      <span class="stat-value text-horus-gold font-mono text-4xl tabular-nums">
        {{ netDisplay }}
      </span>
      <span class="text-horus-text-dim text-[11px] font-mono">occupancy</span>
    </div>

    <!-- OUT counter -->
    <div class="card px-4 py-4 flex flex-col items-center gap-1 border-horus-red/30">
      <span class="stat-label text-horus-red">OUT</span>
      <span
        ref="outRef"
        class="stat-value text-horus-red font-mono text-4xl tabular-nums"
        :class="{ 'animate-count-pop': outPop }"
      >{{ counts.out }}</span>
      <span class="text-horus-text-dim text-[11px] font-mono">exiting</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  counts: {
    type: Object,
    default: () => ({ in: 0, out: 0 })
  }
})

const inPop  = ref(false)
const outPop = ref(false)

const netDisplay = computed(() => {
  const n = props.counts.in - props.counts.out
  return n >= 0 ? `+${n}` : `${n}`
})

function pop (flagRef) {
  flagRef.value = true
  setTimeout(() => { flagRef.value = false }, 420)
}

watch(() => props.counts.in,  () => pop(inPop))
watch(() => props.counts.out, () => pop(outPop))
</script>
