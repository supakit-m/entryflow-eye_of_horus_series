/**
 * usePipeline
 * The central composable that wires together all core modules and exposes
 * reactive state + actions to Vue components.
 *
 * Architecture rule: Vue components NEVER call ML / CV logic directly.
 * All side-effects flow through this composable.
 */
console.log('Pipeline file is loading...');
import { ref, reactive, shallowRef, readonly, onUnmounted } from 'vue'
import { VideoManager } from '@/core/VideoManager'
import { PreProcessor } from '@/core/PreProcessor'
import { PersonDetector } from '@/core/PersonDetector'
import { Tracker } from '@/core/Tracker'
import { LineCounter } from '@/core/LineCounter'
import { Logger } from '@/core/Logger'
import { EvidenceCapture } from '@/core/EvidenceCapture'
import { ZipExporter } from '@/core/ZipExporter'
import { PerformanceMonitor } from '@/core/PerformanceMonitor'

export function usePipeline() {
  console.log('usePipeline: Initializing modules...');
  // ── Module instances ────────────────────────────────────────────────────
  const videoMgr = new VideoManager()
  const preProc = new PreProcessor()
  const detector = new PersonDetector({ minScore: 0.42 })
  const tracker = new Tracker()
  const lineCounter = new LineCounter()
  const logger = new Logger()
  const evidence = new EvidenceCapture()
  const perf = new PerformanceMonitor()
  const exporter = new ZipExporter()
  try {
    console.log('usePipeline: Modules initialized successfully');
  } catch (err) {
    console.error('usePipeline: FATAL ERROR during initialization', err);
  }
  // ── Reactive state ──────────────────────────────────────────────────────
  const status = ref('idle')         // 'idle' | 'loading' | 'running' | 'error'
  const mode = ref(null)            // 'camera' | 'demo' | null
  const errorMsg = ref('')

  const counts = reactive({ in: 0, out: 0 })
  const metrics = reactive({ fps: 0, latency: 0, trackCount: 0 })

  /** @type {import('vue').Ref<import('@/core/Tracker').Track[]>} */
  const tracks = shallowRef([])

  /** @type {import('vue').Ref<import('@/core/Logger').LogEntry[]>} */
  const events = ref([])

  // Line configuration (normalised 0–1)
  const lineConfig = reactive({ x1: 0, y1: 0.5, x2: 1, y2: 0.5 })

  // ── Internal refs ────────────────────────────────────────────────────────
  let videoEl = null
  let overlayEl = null   // canvas for overlay drawing
  let rafId = null
  let frameSkip = 5      // process every N+1 frames for perf

  // ── Public API ───────────────────────────────────────────────────────────

  /** Attach DOM elements. Call before startCamera / startDemo. */
  function mount(videoElement, canvasElement) {
    videoEl = videoElement
    overlayEl = canvasElement
  }

  /** Load the ML model (called once). */
  async function loadModel() {
    status.value = 'loading'
    try {
      await detector.load()
      status.value = 'idle' // <--- เพิ่มบรรทัดนี้ เพื่อเปลี่ยนกลับจาก loading เป็น idle
    } catch (e) {
      status.value = 'error'
      errorMsg.value = `Model failed to load: ${e.message}`
      throw e
    }
  }

  /** Start live webcam counting. */
  async function startCamera() {
    console.log('1. Loading model...');
    if (!detector.isLoaded) await loadModel()
    console.log('2. Starting camera...');
    try {
      await videoMgr.startCamera(videoEl)
      console.log('3. Camera started!');
      _resetSession()
      mode.value = 'camera'
      status.value = 'running'
      _loop()
    } catch (e) {
      status.value = 'error'
      errorMsg.value = e.message
      throw e
    }
  }

  /** Start demo-video counting (no camera permission). */
  async function startDemo() {
    if (!detector.isLoaded) await loadModel()
    try {
      await videoMgr.startDemoVideo(videoEl)
      _resetSession()
      mode.value = 'demo'
      status.value = 'running'
      _loop()
    } catch (e) {
      status.value = 'error'
      errorMsg.value = e.message
      throw e
    }
  }

  /** Stop everything. */
  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null }
    videoMgr.stop()
    status.value = 'idle'
    mode.value = null
    tracks.value = []
    perf.reset()
    _syncMetrics()
  }

  /** Flip the IN/OUT direction label. */
  function flipDirection() {
    lineCounter.flipDirection()
  }

  /** Update the counting line position (normalised coords). */
  function setLine(x1, y1, x2, y2) {
    lineConfig.x1 = x1; lineConfig.y1 = y1
    lineConfig.x2 = x2; lineConfig.y2 = y2
    lineCounter.setLine(x1, y1, x2, y2)
  }

  /** Export ZIP archive. */
  async function exportZip() {
    if (logger.entries.length === 0) {
      alert('No events to export yet.')
      return
    }
    await exporter.export(logger, evidence)
  }

  /** Hard reset counters and logs (keeps pipeline running). */
  function resetCounters() {
    logger.reset()
    evidence.reset()
    tracker.reset()
    counts.in = 0
    counts.out = 0
    events.value = []
  }

  // ── Internal helpers ─────────────────────────────────────────────────────

  function _resetSession() {
    logger.reset()
    evidence.reset()
    tracker.reset()
    perf.reset()
    counts.in = 0
    counts.out = 0
    events.value = []
    frameSkip = 0
  }

  /** Main detection + tracking loop — runs via requestAnimationFrame. */
  function _loop() {
    rafId = requestAnimationFrame(async () => {
      if (status.value !== 'running') return

      if (!videoMgr.isReady) {
        rafId = requestAnimationFrame(_loop)
        return
      }

      // ── Per-frame timing ───────────────────────────────────────────────
      perf.frameStart()

      // ── Pre-process ────────────────────────────────────────────────────
      const processed = preProc.process(videoEl)

      // ── Detection ──────────────────────────────────────────────────────
      let detections = []
      try {
        detections = await detector.detect(processed)
      } catch { /* tolerate single-frame failures */ }
      perf.detectionDone()

      // ── Tracking ───────────────────────────────────────────────────────
      const activeTracks = tracker.update(detections)
      perf.setTrackCount(activeTracks.length)

      // ── Line crossing ──────────────────────────────────────────────────
      const W = videoEl.videoWidth
      const H = videoEl.videoHeight

      for (const track of activeTracks) {
        const normCentroid = {
          x: track.centroid.x / W,
          y: track.centroid.y / H
        }
        const event = lineCounter.process(track, normCentroid)
        if (event) {
          // Capture evidence asynchronously (don't block the loop)
          evidence.capture(videoEl, event.bbox, event.trackId, event.direction)
            .then(({ filename }) => {
              const entry = logger.log(event, [filename])
              events.value = [...logger.entries]
              counts.in = logger.inCount
              counts.out = logger.outCount
            })
            .catch(() => {
              const entry = logger.log(event, [])
              events.value = [...logger.entries]
              counts.in = logger.inCount
              counts.out = logger.outCount
            })
        }
      }

      // ── Draw overlay ───────────────────────────────────────────────────
      tracks.value = activeTracks
      _draw(activeTracks, W, H)

      // ── Sync metrics ───────────────────────────────────────────────────
      _syncMetrics()

      // ── Schedule next frame ────────────────────────────────────────────
      _loop()
    })
  }

  function _syncMetrics() {
    metrics.fps = Math.round(perf.fps * 10) / 10
    metrics.latency = Math.round(perf.latency)
    metrics.trackCount = perf.trackCount
  }

  /** Draw bounding boxes, centroids and the counting line on the overlay canvas. */
  function _draw(activeTracks, W, H) {
    if (!overlayEl || !W || !H) return

    const canvas = overlayEl
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    // ── Counting line ────────────────────────────────────────────────────
    const lp = lineCounter.toPixels(W, H)
    _drawLine(ctx, lp, W, H)

    // ── Tracks ───────────────────────────────────────────────────────────
    for (const track of activeTracks) {
      _drawTrack(ctx, track)
    }
  }

  function _drawLine(ctx, lp, W, H) {
    // Glow effect
    ctx.save()
    ctx.shadowColor = '#D4AF37'
    ctx.shadowBlur = 12
    ctx.strokeStyle = '#D4AF37'
    ctx.lineWidth = 2.5
    ctx.setLineDash([12, 6])
    ctx.beginPath()
    ctx.moveTo(lp.x1, lp.y1)
    ctx.lineTo(lp.x2, lp.y2)
    ctx.stroke()
    ctx.setLineDash([])

    // Arrow indicators
    const midX = (lp.x1 + lp.x2) / 2
    const midY = (lp.y1 + lp.y2) / 2
    ctx.fillStyle = '#D4AF37'
    ctx.font = 'bold 13px JetBrains Mono, monospace'
    ctx.textAlign = 'center'

    // IN label above mid
    ctx.fillText('▼ IN', midX, midY - 10)
    // OUT label below mid
    ctx.fillText('▲ OUT', midX, midY + 24)

    ctx.restore()
  }

  function _drawTrack(ctx, track) {
    const [x, y, w, h] = track.bbox
    const cx = track.centroid.x
    const cy = track.centroid.y

    // Box
    ctx.save()
    ctx.strokeStyle = 'rgba(0, 180, 216, 0.9)'
    ctx.lineWidth = 2
    ctx.shadowColor = 'rgba(0, 180, 216, 0.5)'
    ctx.shadowBlur = 8
    ctx.strokeRect(x, y, w, h)

    // Label pill
    ctx.fillStyle = 'rgba(0, 20, 40, 0.75)'
    ctx.fillRect(x, y - 22, 68, 20)
    ctx.fillStyle = '#00B4D8'
    ctx.font = '700 11px JetBrains Mono, monospace'
    ctx.fillText(`ID:${track.id}  ${Math.round(track.score * 100)}%`, x + 4, y - 7)

    // Centroid dot
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#D4AF37'
    ctx.fill()

    ctx.restore()
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────
  onUnmounted(() => {
    stop()
    detector.dispose()
  })

  // ── Expose ───────────────────────────────────────────────────────────────
  return {
    debug: () => ({
      status: status.value,
      tfBackend: 'cpu', // หรือถ้าอยากเช็ค tf จริงๆ ให้ import tf เข้ามาในนี้ด้วย
      videoReady: videoMgr.isReady
    }),
    // state
    status: readonly(status),
    mode: readonly(mode),
    errorMsg: readonly(errorMsg),
    counts: readonly(counts),
    metrics: readonly(metrics),
    tracks,
    events,
    lineConfig: readonly(lineConfig),

    // actions
    mount,
    loadModel,
    startCamera,
    startDemo,
    stop,
    flipDirection,
    setLine,
    exportZip,
    resetCounters,

    // expose internals for custom drawing (VideoCanvas uses this)
    videoManager: videoMgr,
    evidenceStore: evidence

  }
}
