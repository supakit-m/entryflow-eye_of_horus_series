<template>
  <div class="video-wrapper" ref="wrapperRef" :style="wrapperStyle">
    <!-- Aspect-ratio sizer — adjusts when rotation swaps W/H -->
    <div class="aspect-ratio-sizer" :style="aspectStyle" />

    <!-- Hidden video element — provides raw frames to the pipeline -->
    <video
      ref="videoRef"
      class="absolute opacity-0 pointer-events-none"
      style="width:1px;height:1px;top:0;left:0;"
      playsinline
      muted
    />

    <!-- Single display canvas — pipeline draws video frame + overlay here -->
    <canvas
      ref="canvasRef"
      class="absolute inset-0 w-full h-full object-contain"
      :style="{ display: status === 'running' ? 'block' : 'none', cursor: dragCursor }"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="stopDrag"
      @mouseleave="stopDrag"
      @touchstart.prevent="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend.prevent="stopDrag"
      @dblclick="$emit('flipDirection')"
    />

    <!-- Idle / loading / error overlay -->
    <Transition name="fade">
      <div
        v-if="status !== 'running'"
        class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80"
      >
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
          <p class="text-horus-text-dim text-xs">Select a source below to begin counting</p>
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
          <p class="text-horus-red font-mono text-sm font-bold tracking-widest uppercase mb-1">Error</p>
          <p class="text-horus-text-dim text-xs max-w-xs">{{ errorMsg }}</p>
        </div>
      </div>
    </Transition>

    <!-- Drag hint (fades out) -->
    <Transition name="fade">
      <div
        v-if="showHint && status === 'running'"
        class="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-horus-text-dim
               text-[11px] font-mono px-3 py-1 rounded-full pointer-events-none whitespace-nowrap"
      >
        {{ hintText }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  status:          { type: String,  default: 'idle' },
  errorMsg:        { type: String,  default: '' },
  lineConfig:      { type: Object,  required: true },
  lineOrientation: { type: String,  default: 'horizontal' }, // 'horizontal' | 'vertical'
  transform:       { type: Object,  default: () => ({ rotation: 0, mirror: false }) }
})

const emit = defineEmits(['ready', 'setLine', 'flipDirection'])

const wrapperRef = ref(null)
const videoRef   = ref(null)
const canvasRef  = ref(null)

// ── Hint ──────────────────────────────────────────────────────────────────────
const showHint = ref(true)
onMounted(() => {
  emit('ready', { video: videoRef.value, canvas: canvasRef.value })
  setTimeout(() => { showHint.value = false }, 5000)
})

const hintText = computed(() =>
  props.lineOrientation === 'horizontal'
    ? 'Drag line ↕ to reposition · Double-click to flip IN/OUT'
    : 'Drag line ↔ to reposition · Double-click to flip IN/OUT'
)

// ── Aspect ratio ──────────────────────────────────────────────────────────────
// When rotated 90/270 the displayed content is portrait-ish, adjust sizer
const aspectStyle = computed(() => {
  const rot90 = props.transform.rotation === 90 || props.transform.rotation === 270
  return { paddingTop: rot90 ? '177.78%' : '56.25%' }
})

// ── Drag the counting line ────────────────────────────────────────────────────
const isDragging  = ref(false)
const dragCursor  = computed(() => {
  if (!isDragging.value) {
    return props.lineOrientation === 'horizontal' ? 'ns-resize' : 'ew-resize'
  }
  return props.lineOrientation === 'horizontal' ? 'ns-resize' : 'ew-resize'
})

const HIT_THRESHOLD = 0.05   // normalised units

function _getNorm (clientX, clientY) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return null
  return {
    x: Math.max(0, Math.min(1, (clientX - rect.left)  / rect.width)),
    y: Math.max(0, Math.min(1, (clientY - rect.top)   / rect.height))
  }
}

function _hitTest (norm) {
  const { lineConfig: lc, lineOrientation: ori } = props
  if (ori === 'horizontal') {
    return Math.abs(norm.y - lc.y1) < HIT_THRESHOLD
  } else {
    return Math.abs(norm.x - lc.x1) < HIT_THRESHOLD
  }
}

function onMouseDown (e) {
  const norm = _getNorm(e.clientX, e.clientY)
  if (norm && _hitTest(norm)) isDragging.value = true
}

function onMouseMove (e) {
  if (!isDragging.value) return
  const norm = _getNorm(e.clientX, e.clientY)
  if (!norm) return

  const PAD = 0.05
  if (props.lineOrientation === 'horizontal') {
    const y = Math.max(PAD, Math.min(1 - PAD, norm.y))
    emit('setLine', 0, y, 1, y)
  } else {
    const x = Math.max(PAD, Math.min(1 - PAD, norm.x))
    emit('setLine', x, 0, x, 1)
  }
}

// ใน <script setup>
const wrapperStyle = computed(() => {
  const rot90 = props.transform.rotation === 90 || props.transform.rotation === 270
  // ถ้าหมุน 90/270 สัดส่วนจะเป็น 9:16 (0.56) ถ้าปกติเป็น 16:9 (1.77)
  const ratio = rot90 ? 9/16 : 16/9
  return {
    aspectRatio: ratio,
    maxHeight: '70vh', // จำกัดความสูงไม่ให้เกิน 70% ของจอ เพื่อให้เห็นปุ่มกดด้านล่าง
    width: '100%',
    margin: '0 auto',
    position: 'relative'
  }
})

function stopDrag () { isDragging.value = false }

function onTouchStart (e) { onMouseDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }) }
function onTouchMove  (e) { onMouseMove ({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }) }

// Reset hint when orientation changes
watch(() => props.lineOrientation, () => {
  showHint.value = true
  setTimeout(() => { showHint.value = false }, 4000)
})

defineExpose({ videoRef, canvasRef })
</script>

<style scoped>
.aspect-ratio-sizer { width: 60%; pointer-events: none; transition: padding-top 0.3s ease; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,   .fade-leave-to     { opacity: 0; }
.horus-eye-emblem { filter: drop-shadow(0 0 16px rgba(212,175,55,0.5)); }
.video-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  background: black;
  overflow: hidden;
  border-radius: 8px; /* เพิ่มความสวยงาม */
}
</style>
