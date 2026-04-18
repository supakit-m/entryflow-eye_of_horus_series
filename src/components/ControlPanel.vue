<template>
  <div class="card p-4 flex flex-col gap-4">
    <!-- Section: Source -->
    <div>
      <p class="stat-label mb-2">Video Source</p>
      <div class="flex flex-col gap-2">
        <button
          class="btn-gold w-full justify-center"
          :disabled="isLoading || isRunning"
          @click="$emit('startCamera')"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          Live Camera
        </button>

        <button
          class="btn-outline w-full justify-center"
          :disabled="isLoading || isRunning"
          @click="$emit('startDemo')"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Demo Video
        </button>

        <button
          v-if="isRunning"
          class="btn-danger w-full justify-center"
          @click="$emit('stop')"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Stop
        </button>
      </div>
    </div>

    <!-- Section: Line Config -->
    <div v-if="isRunning">
      <p class="stat-label mb-2">Counting Line</p>
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <label class="text-xs text-horus-text-dim w-16 shrink-0">Position</label>
          <input
            type="range" min="5" max="95" step="1"
            :value="Math.round(lineConfig.y1 * 100)"
            class="flex-1 accent-horus-gold"
            @input="e => $emit('setLine', 0, +e.target.value/100, 1, +e.target.value/100)"
          />
          <span class="text-xs font-mono text-horus-gold w-8 text-right">
            {{ Math.round(lineConfig.y1 * 100) }}%
          </span>
        </div>

        <button class="btn-outline text-xs justify-center py-1.5" @click="$emit('flipDirection')">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
          </svg>
          Flip IN / OUT
        </button>
      </div>
    </div>

    <!-- Section: Detection Confidence -->
    <div v-if="isRunning">
      <p class="stat-label mb-2">Min Confidence</p>
      <div class="flex items-center gap-2">
        <input
          type="range" min="20" max="80" step="5"
          v-model.number="localConfidence"
          class="flex-1 accent-horus-gold"
        />
        <span class="text-xs font-mono text-horus-gold w-8 text-right">
          {{ localConfidence }}%
        </span>
      </div>
    </div>

    <!-- Divider -->
    <div class="border-t border-horus-border" />

    <!-- Section: Export & Reset -->
    <div class="flex flex-col gap-2">
      <button
        class="btn-outline w-full justify-center"
        :disabled="!hasEvents"
        @click="$emit('exportZip')"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        Export ZIP
      </button>

      <button
        class="btn-danger text-xs w-full justify-center py-1.5"
        :disabled="!hasEvents"
        @click="$emit('resetCounters')"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Reset Counters
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  isRunning:  { type: Boolean, default: false },
  isLoading:  { type: Boolean, default: false },
  hasEvents:  { type: Boolean, default: false },
  lineConfig: { type: Object,  required: true }
})

defineEmits([
  'startCamera', 'startDemo', 'stop',
  'setLine', 'flipDirection',
  'exportZip', 'resetCounters'
])

const localConfidence = ref(42)
</script>
