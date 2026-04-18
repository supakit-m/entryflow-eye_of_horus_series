<template>
  <div class="video-wrapper" :class="{ 'scanline': status === 'idle' }" ref="wrapperRef">
    <!-- Aspect-ratio sizer (16:9 default until video loads) -->
    <div class="aspect-ratio-sizer" :style="aspectStyle" />

    <!-- Video element -->
    <video
      ref="videoRef"
      class="absolute inset-0 w-full h-full object-contain"
      playsinline
      muted
      :style="{ display: status === 'running' ? 'block' : 'none' }"
    />

    <!-- Canvas overlay — drawn on by usePipeline -->
    <canvas
      ref="canvasRef"
      class="overlay absolute inset-0 w-full h-full"
      :style="{ display: status === 'running' ? 'block' : 'none' }"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @touchstart.prevent="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend.prevent="onMouseUp"
    />

    <!-- Idle / loading overlay -->
    <Transition name="fade">
      <div
        v-if="status !== 'running'"
        class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80"
      >
        <!-- Eye of Horus emblem -->
        <div class="horus-eye-emblem" :class="{ 'animate-pulse': status === 'loading' }">
          <svg viewBox="0 0 100 80" class="w-24 h-20" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="50" cy="38" rx="38" ry="20"
              fill="none" stroke="#D4AF37" stroke-width="2.5" opacity="0.8"/>
            <circle cx="50" cy="38" r="12" fill="#D4AF37" opacity="0.85"/>
            <circle cx="50" cy="38" r="5.5" fill="#09090F"/>
            <path d="M50 56 Q40 66 37 76 Q48 69 50 63 Q52 69 63 76 Q60 66 50 56Z"
                  fill="#D4AF37" opacity="0.75"/>
            <line x1="12" y1="38" x2="4"  y2="38" stroke="#D4AF37" stroke-width="1.5" opacity="0.5"/>
            <line x1="88" y1="38" x2="96" y2="38" stroke="#D4AF37" stroke-width="1.5" opacity="0.5"/>
          </svg>
        </div>

        <div v-if="status === 'idle'" class="text-center px-6">
          <p class="text-horus-gold font-mono text-sm font-bold tracking-widest uppercase mb-1">
            EntryFlow Ready
          </p>
          <p class="text-horus-text-dim text-xs">
            Select a source below to begin counting
          </p>
        </div>

        <div v-else-if="status === 'loading'" class="text-center px-6">
          <p class="text-horus-gold font-mono text-sm font-bold tracking-widest uppercase mb-1">
            Initialising Vision Model
          </p>
          <div class="flex items-center gap-2 justify-center mt-2">
            <span class="block w-1.5 h-1.5 rounded-full bg-horus-gold animate-bounce [animation-delay:0ms]"/>
            <span class="block w-1.5 h-1.5 rounded-full bg-horus-gold animate-bounce [animation-delay:150ms]"/>
            <span class="block w-1.5 h-1.5 rounded-full bg-horus-gold animate-bounce [animation-delay:300ms]"/>
          </div>
        </div>

        <div v-else-if="status === 'error'" class="text-center px-6">
          <p class="text-horus-red font-mono text-sm font-bold tracking-widest uppercase mb-1">
            Error
          </p>
          <p class="text-horus-text-dim text-xs max-w-xs">{{ errorMsg }}</p>
        </div>
      </div>
    </Transition>

    <!-- Line-drag hint -->
    <Transition name="fade">
      <div
        v-if="showDragHint && status === 'running'"
        class="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-horus-text-dim
               text-[11px] font-mono px-3 py-1 rounded-full pointer-events-none"
      >
        Drag the line to reposition · Double-click to flip IN/OUT
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  status:    { type: String,  default: 'idle' },
  errorMsg:  { type: String,  default: '' },
  lineConfig: { type: Object, required: true }
})

const emit = defineEmits(['ready', 'setLine', 'flipDirection'])

const wrapperRef = ref(null)
const videoRef   = ref(null)
const canvasRef  = ref(null)

// Drag state for the counting line
const isDragging   = ref(false)
const showDragHint = ref(true)

// ── Expose elements to parent on mount ──────────────────────────────────────
onMounted(() => {
  emit('ready', { video: videoRef.value, canvas: canvasRef.value })
  // Hide hint after 5s
  setTimeout(() => { showDragHint.value = false }, 5000)
})

// ── Aspect ratio ─────────────────────────────────────────────────────────────
const aspectStyle = computed(() => ({ paddingTop: '56.25%' })) // 16:9

// ── Line dragging ─────────────────────────────────────────────────────────────
// We only move the Y position of a horizontal line for simplicity
// (full arbitrary-angle drag is handled via a double-drag in future)

function _getNormY (clientY) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return null
  return Math.max(0.05, Math.min(0.95, (clientY - rect.top) / rect.height))
}

function onMouseDown (e) {
  const normY = _getNormY(e.clientY)
  if (!normY) return
  const lineNormY = props.lineConfig.y1
  if (Math.abs(normY - lineNormY) < 0.06) {
    isDragging.value = true
  }
}

function onMouseMove (e) {
  if (!isDragging.value) return
  const normY = _getNormY(e.clientY)
  if (normY !== null) {
    emit('setLine', 0, normY, 1, normY)
  }
}

function onMouseUp () {
  isDragging.value = false
}

// ── Touch support ──────────────────────────────────────────────────────────
function onTouchStart (e) {
  onMouseDown({ clientY: e.touches[0].clientY })
}
function onTouchMove (e) {
  onMouseMove({ clientY: e.touches[0].clientY })
}

// Expose refs for parent (VideoCanvas is mounted first, parent gets refs via 'ready' event)
defineExpose({ videoRef, canvasRef })
</script>

<style scoped>
.aspect-ratio-sizer { width: 100%; pointer-events: none; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }

.horus-eye-emblem {
  filter: drop-shadow(0 0 16px rgba(212,175,55,0.5));
}
</style>
