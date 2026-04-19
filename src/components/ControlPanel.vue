<template>
  <div class="card p-4 flex flex-col gap-4">

    <!-- ── Video Source ──────────────────────────────────────────────── -->
    <div>
      <p class="stat-label mb-2">Video Source</p>
      <div class="flex flex-col gap-2">
        <button class="btn-gold w-full justify-center"
          :disabled="isLoading || isRunning" @click="$emit('startCamera')">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          Live Camera
        </button>
        <button class="btn-outline w-full justify-center"
          :disabled="isLoading || isRunning" @click="$emit('startDemo')">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Demo Video
        </button>
        <button v-if="isRunning" class="btn-danger w-full justify-center" @click="$emit('stop')">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Stop
        </button>
      </div>
    </div>

    <div class="border-t border-horus-border" />

    <!-- ── Image Transform ──────────────────────────────────────────── -->
    <div>
      <p class="stat-label mb-2">Image Transform</p>

      <!-- Rotation -->
      <div class="mb-3">
        <p class="text-xs text-horus-text-dim mb-1.5">Rotation</p>
        <div class="grid grid-cols-4 gap-1">
          <button
            v-for="deg in [0, 90, 180, 270]" :key="deg"
            class="btn py-1.5 text-xs justify-center border transition-all"
            :class="transform.rotation === deg
              ? 'border-horus-gold bg-horus-gold/15 text-horus-gold'
              : 'border-horus-border text-horus-text-dim hover:border-horus-muted'"
            @click="$emit('setRotation', deg)"
          >
            {{ deg }}°
          </button>
        </div>
      </div>

      <!-- Quick rotate buttons -->
      <div class="flex gap-2 mb-3">
        <button class="btn-outline flex-1 justify-center py-1.5 text-xs"
          @click="$emit('rotateLeft')">
          ↺ CCW
        </button>
        <button class="btn-outline flex-1 justify-center py-1.5 text-xs"
          @click="$emit('rotateRight')">
          ↻ CW
        </button>
      </div>

      <!-- Mirror toggle -->
      <button
        class="w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-sm"
        :class="transform.mirror
          ? 'border-horus-blue bg-horus-blue/10 text-horus-blue'
          : 'border-horus-border text-horus-text-dim hover:border-horus-muted'"
        @click="$emit('toggleMirror')"
      >
        <span class="flex items-center gap-2">
          <!-- Mirror icon -->
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7l-5 5 5 5M16 7l5 5-5 5M12 3v18"/>
          </svg>
          Mirror (Horizontal Flip)
        </span>
        <span
          class="w-8 h-4 rounded-full transition-colors relative"
          :class="transform.mirror ? 'bg-horus-blue' : 'bg-horus-border'"
        >
          <span
            class="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
            :class="transform.mirror ? 'translate-x-4' : 'translate-x-0.5'"
          />
        </span>
      </button>
    </div>

    <div class="border-t border-horus-border" />

    <!-- ── Counting Line ────────────────────────────────────────────── -->
    <div>
      <p class="stat-label mb-2">Counting Line</p>

      <!-- Orientation toggle -->
      <div class="grid grid-cols-2 gap-1 mb-3">
        <button
          class="btn py-2 text-xs justify-center border flex-col gap-1 transition-all"
          :class="lineOrientation === 'horizontal'
            ? 'border-horus-gold bg-horus-gold/15 text-horus-gold'
            : 'border-horus-border text-horus-text-dim hover:border-horus-muted'"
          @click="$emit('setLineOrientation', 'horizontal')"
        >
          <!-- Horizontal line icon -->
          <svg class="w-5 h-4" viewBox="0 0 20 12" fill="none">
            <line x1="0" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="2"
              stroke-dasharray="3 2"/>
            <text x="10" y="11" text-anchor="middle" font-size="5"
              fill="currentColor" font-family="monospace">↕</text>
          </svg>
          <span>Horizontal</span>
          <span class="text-[9px] opacity-60">count top/bottom</span>
        </button>

        <button
          class="btn py-2 text-xs justify-center border flex-col gap-1 transition-all"
          :class="lineOrientation === 'vertical'
            ? 'border-horus-gold bg-horus-gold/15 text-horus-gold'
            : 'border-horus-border text-horus-text-dim hover:border-horus-muted'"
          @click="$emit('setLineOrientation', 'vertical')"
        >
          <!-- Vertical line icon -->
          <svg class="w-4 h-5" viewBox="0 0 12 20" fill="none">
            <line x1="6" y1="0" x2="6" y2="20" stroke="currentColor" stroke-width="2"
              stroke-dasharray="3 2"/>
            <text x="6" y="13" text-anchor="middle" font-size="5"
              fill="currentColor" font-family="monospace">↔</text>
          </svg>
          <span>Vertical</span>
          <span class="text-[9px] opacity-60">count left/right</span>
        </button>
      </div>

      <!-- Position slider -->
      <div v-if="isRunning">
        <div class="flex items-center gap-2 mb-2">
          <label class="text-xs text-horus-text-dim w-14 shrink-0">Position</label>
          <input
            type="range" min="5" max="95" step="1"
            :value="linePositionPct"
            class="flex-1 accent-horus-gold"
            @input="onSliderInput"
          />
          <span class="text-xs font-mono text-horus-gold w-8 text-right">
            {{ linePositionPct }}%
          </span>
        </div>

        <!-- <button class="btn-outline text-xs w-full justify-center py-1.5"
          @click="$emit('flipDirection')">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
          </svg>
          Flip IN / OUT
        </button> -->
      </div>
    </div>

    <div class="border-t border-horus-border" />

    <!-- ── Export & Reset ───────────────────────────────────────────── -->
    <div class="flex flex-col gap-2">
      <button class="btn-outline w-full justify-center"
        :disabled="!hasEvents" @click="$emit('exportZip')">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        Export ZIP
      </button>
      <button class="btn-danger text-xs w-full justify-center py-1.5"
        :disabled="!hasEvents" @click="$emit('resetCounters')">
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
import { computed } from 'vue'

const props = defineProps({
  isRunning:       { type: Boolean, default: false },
  isLoading:       { type: Boolean, default: false },
  hasEvents:       { type: Boolean, default: false },
  lineConfig:      { type: Object,  required: true },
  lineOrientation: { type: String,  default: 'horizontal' },
  transform:       { type: Object,  default: () => ({ rotation: 0, mirror: false }) }
})

const emit = defineEmits([
  'startCamera', 'startDemo', 'stop',
  'setRotation', 'rotateLeft', 'rotateRight', 'toggleMirror',
  'setLineOrientation', 'setLine', 'flipDirection',
  'exportZip', 'resetCounters'
])

// Convert line position to a percentage for the slider
const linePositionPct = computed(() => {
  if (props.lineOrientation === 'horizontal') {
    return Math.round(props.lineConfig.y1 * 100)
  } else {
    return Math.round(props.lineConfig.x1 * 100)
  }
})

function onSliderInput (e) {
  const v = Number(e.target.value) / 100
  if (props.lineOrientation === 'horizontal') {
    emit('setLine', 0, v, 1, v)
  } else {
    emit('setLine', v, 0, v, 1)
  }
}
</script>
