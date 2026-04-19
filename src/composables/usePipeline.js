/**
 * usePipeline
 * Central composable — wires all core modules + exposes reactive state to Vue.
 *
 * New in v1.1:
 *  • transform.rotation  (0 / 90 / 180 / 270 °)
 *  • transform.mirror    (horizontal flip)
 *  • lineOrientation     ('horizontal' | 'vertical')
 *
 * Rendering strategy (v1.1):
 *  The visible <canvas> shows BOTH the transformed video frame AND the overlay
 *  (bboxes + counting line) drawn in one pass.  The <video> element stays hidden.
 *  This guarantees pixel-perfect alignment between the displayed image and
 *  the annotation overlay regardless of rotation / mirror state.
 */

import { ref, reactive, shallowRef, readonly, onUnmounted } from 'vue'
import { VideoManager }       from '@/core/VideoManager'
import { PreProcessor }       from '@/core/PreProcessor'
import { PersonDetector }     from '@/core/PersonDetector'
import { Tracker }            from '@/core/Tracker'
import { LineCounter }        from '@/core/LineCounter'
import { Logger }             from '@/core/Logger'
import { EvidenceCapture }    from '@/core/EvidenceCapture'
import { ZipExporter }        from '@/core/ZipExporter'
import { PerformanceMonitor } from '@/core/PerformanceMonitor'

// ── Direction labels per orientation ──────────────────────────────────────────
const LABEL = {
  horizontal: { in: '▼ IN',  out: '▲ OUT', inShort: '↓', outShort: '↑' },
  vertical:   { in: '▶ IN',  out: '◀ OUT', inShort: '→', outShort: '←' }
}

export function usePipeline () {
  // ── Module instances ────────────────────────────────────────────────────
  const videoMgr    = new VideoManager()
  const preProc     = new PreProcessor()
  const detector    = new PersonDetector({ minScore: 0.42 })
  const tracker     = new Tracker()
  const lineCounter = new LineCounter()
  const logger      = new Logger()
  const evidence    = new EvidenceCapture()
  const perf        = new PerformanceMonitor()
  const exporter    = new ZipExporter()

  // ── Reactive state ──────────────────────────────────────────────────────
  const status    = ref('idle')      // 'idle' | 'loading' | 'running' | 'error'
  const mode      = ref(null)        // 'camera' | 'demo' | null
  const errorMsg  = ref('')

  const counts    = reactive({ in: 0, out: 0 })
  const metrics   = reactive({ fps: 0, latency: 0, trackCount: 0 })
  const tracks    = shallowRef([])
  const events    = ref([])

  // ── Transform state (NEW) ───────────────────────────────────────────────
  const transform = reactive({
    rotation: 0,       // 0 | 90 | 180 | 270
    mirror:   false    // horizontal flip
  })

  // ── Line config (normalised 0–1) ────────────────────────────────────────
  const lineOrientation = ref('horizontal')  // 'horizontal' | 'vertical'
  const lineConfig      = reactive({ x1: 0, y1: 0.5, x2: 1, y2: 0.5 })

  // ── DOM refs ─────────────────────────────────────────────────────────────
  let videoEl   = null   // hidden <video>
  let displayEl = null   // visible <canvas> — renders frame + overlay

  let rafId = null

  // ── Public API ────────────────────────────────────────────────────────────

  function mount (videoElement, canvasElement) {
    videoEl   = videoElement
    displayEl = canvasElement
  }

  async function loadModel () {
    status.value = 'loading'
    try {
      await detector.load()
      status.value = 'idle'
    } catch (e) {
      status.value   = 'error'
      errorMsg.value = `Model failed to load: ${e.message}`
      throw e
    }
  }

  async function startCamera () {
    if (!detector.isLoaded) await loadModel()
    try {
      await videoMgr.startCamera(videoEl)
      _resetSession()
      mode.value   = 'camera'
      status.value = 'running'
      _loop()
    } catch (e) {
      status.value   = 'error'
      errorMsg.value = e.message
      throw e
    }
  }

  async function startDemo () {
    if (!detector.isLoaded) await loadModel()
    try {
      await videoMgr.startDemoVideo(videoEl)
      _resetSession()
      mode.value   = 'demo'
      status.value = 'running'
      _loop()
    } catch (e) {
      status.value   = 'error'
      errorMsg.value = e.message
      throw e
    }
  }

  function stop () {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null }
    videoMgr.stop()
    status.value = 'idle'
    mode.value   = null
    tracks.value = []
    perf.reset()
    _syncMetrics()
    // Clear display canvas
    if (displayEl) {
      const ctx = displayEl.getContext('2d')
      ctx.clearRect(0, 0, displayEl.width, displayEl.height)
    }
  }

  /** Rotate CW by 90° each call. */
  function rotateRight () {
    transform.rotation = (transform.rotation + 90) % 360
    preProc.rotation   = transform.rotation
    // Reset line to sensible default for new orientation
    _applyLineOrientation(lineOrientation.value)
  }

  /** Rotate CCW by 90° each call. */
  function rotateLeft () {
    transform.rotation = (transform.rotation + 270) % 360
    preProc.rotation   = transform.rotation
    _applyLineOrientation(lineOrientation.value)
  }

  /** Set rotation directly to 0/90/180/270. */
  function setRotation (deg) {
    const valid = [0, 90, 180, 270]
    if (!valid.includes(deg)) return
    transform.rotation = deg
    preProc.rotation   = deg
    _applyLineOrientation(lineOrientation.value)
  }

  /** Toggle horizontal mirror. */
  function toggleMirror () {
    transform.mirror = !transform.mirror
    preProc.mirror   = transform.mirror
  }

  /** Switch the counting line orientation. */
  function setLineOrientation (orientation) {
    lineOrientation.value = orientation
    _applyLineOrientation(orientation)
  }

  /** Move the counting line (normalised coords). */
  function setLine (x1, y1, x2, y2) {
    lineConfig.x1 = x1; lineConfig.y1 = y1
    lineConfig.x2 = x2; lineConfig.y2 = y2
    lineCounter.setLine(x1, y1, x2, y2)
  }

  function flipDirection () {
    lineCounter.flipDirection()
  }

  async function exportZip () {
    if (logger.entries.length === 0) { alert('No events to export yet.'); return }
    await exporter.export(logger, evidence)
  }

  function resetCounters () {
    logger.reset(); evidence.reset(); tracker.reset()
    counts.in = 0; counts.out = 0; events.value = []
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  function _resetSession () {
    logger.reset(); evidence.reset(); tracker.reset(); perf.reset()
    counts.in = 0; counts.out = 0; events.value = []
    _applyLineOrientation(lineOrientation.value)
  }

  /** Set line coordinates for the chosen orientation. */
  function _applyLineOrientation (orientation) {
    if (orientation === 'horizontal') {
      setLine(0, 0.5, 1, 0.5)
    } else {
      setLine(0.5, 0, 0.5, 1)
    }
  }

  // ── Main loop ────────────────────────────────────────────────────────────

  function _loop () {
    rafId = requestAnimationFrame(async () => {
      if (status.value !== 'running') return

      if (!videoMgr.isReady) { _loop(); return }

      perf.frameStart()

      // ── Pre-process (rotation + mirror → inference canvas) ─────────────
      const processed = preProc.process(videoEl)
      const { w: outW, h: outH } = preProc.outputSize(
        videoEl.videoWidth, videoEl.videoHeight
      )

      // ── Detection ──────────────────────────────────────────────────────
      let detections = []
      try { detections = await detector.detect(processed) } catch { /* skip */ }
      perf.detectionDone()

      // ── Tracking ───────────────────────────────────────────────────────
      const activeTracks = tracker.update(detections)
      perf.setTrackCount(activeTracks.length)

      // ── Line crossing ──────────────────────────────────────────────────
      for (const track of activeTracks) {
        const normCentroid = { x: track.centroid.x / outW, y: track.centroid.y / outH }
        const event = lineCounter.process(track, normCentroid)
        if (event) {
          // Capture from the processed (rotated) canvas so image is correct orientation
          evidence.capture(processed, event.bbox, event.trackId, event.direction)
            .then(({ filename }) => _logEvent(event, [filename]))
            .catch(() => _logEvent(event, []))
        }
      }

      // ── Draw display canvas (frame + overlay) ─────────────────────────
      tracks.value = activeTracks
      _render(activeTracks, outW, outH)

      _syncMetrics()
      _loop()
    })
  }

  function _logEvent (event, imageFiles) {
    logger.log(event, imageFiles)
    events.value  = [...logger.entries]
    counts.in     = logger.inCount
    counts.out    = logger.outCount
  }

  function _syncMetrics () {
    metrics.fps        = Math.round(perf.fps * 10) / 10
    metrics.latency    = Math.round(perf.latency)
    metrics.trackCount = perf.trackCount
  }

  /**
   * Render the transformed video frame + all overlay annotations onto the
   * single visible display canvas.
   */
  function _render (activeTracks, outW, outH) {
    if (!displayEl || !outW || !outH) return

    // Resize canvas if needed
    if (displayEl.width !== outW || displayEl.height !== outH) {
      displayEl.width  = outW
      displayEl.height = outH
    }

    const ctx = displayEl.getContext('2d')
    ctx.clearRect(0, 0, outW, outH)

    // ── 1. Draw transformed video frame ───────────────────────────────────
    preProc._applyTransformDraw(
      ctx,
      videoEl,
      videoEl.videoWidth,
      videoEl.videoHeight,
      outW,
      outH
    )

    // ── 2. Counting line ──────────────────────────────────────────────────
    _drawLine(ctx, outW, outH)

    // ── 3. Bounding boxes & track labels ─────────────────────────────────
    for (const track of activeTracks) {
      _drawTrack(ctx, track)
    }
  }

  function _drawLine (ctx, W, H) {
    const lp  = lineCounter.toPixels(W, H)
    const ori = lineOrientation.value
    const lbl = LABEL[ori]

    ctx.save()
    ctx.shadowColor = '#D4AF37'
    ctx.shadowBlur  = 14
    ctx.strokeStyle = '#D4AF37'
    ctx.lineWidth   = 2.5
    ctx.setLineDash([12, 6])
    ctx.beginPath()
    ctx.moveTo(lp.x1, lp.y1)
    ctx.lineTo(lp.x2, lp.y2)
    ctx.stroke()
    ctx.setLineDash([])

    // Labels at midpoint
    const midX = (lp.x1 + lp.x2) / 2
    const midY = (lp.y1 + lp.y2) / 2
    ctx.font      = 'bold 13px JetBrains Mono, monospace'
    ctx.fillStyle = '#D4AF37'
    ctx.shadowBlur = 0

    if (ori === 'horizontal') {
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(lbl.in,  midX, midY - 4)
      ctx.textBaseline = 'top'
      ctx.fillText(lbl.out, midX, midY + 4)
    } else {
      ctx.textBaseline = 'middle'
      ctx.textAlign    = 'right'
      ctx.fillText(lbl.in,  midX - 6, midY - 12)
      ctx.textAlign    = 'left'
      ctx.fillText(lbl.out, midX + 6, midY + 12)
    }

    ctx.restore()
  }

  function _drawTrack (ctx, track) {
    const [x, y, w, h] = track.bbox

    ctx.save()
    ctx.strokeStyle = 'rgba(0, 180, 216, 0.9)'
    ctx.lineWidth   = 2
    ctx.shadowColor = 'rgba(0, 180, 216, 0.5)'
    ctx.shadowBlur  = 8
    ctx.strokeRect(x, y, w, h)

    // Label pill
    ctx.shadowBlur  = 0
    ctx.fillStyle   = 'rgba(0, 20, 40, 0.75)'
    ctx.fillRect(x, y - 22, 72, 20)
    ctx.fillStyle   = '#00B4D8'
    ctx.font        = '700 11px JetBrains Mono, monospace'
    ctx.textBaseline = 'middle'
    ctx.fillText(`ID:${track.id}  ${Math.round(track.score * 100)}%`, x + 4, y - 12)

    // Centroid dot
    ctx.beginPath()
    ctx.arc(track.centroid.x, track.centroid.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#D4AF37'
    ctx.fill()

    ctx.restore()
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  onUnmounted(() => { stop(); detector.dispose() })

  // ── Expose ────────────────────────────────────────────────────────────────
  return {
    status:          readonly(status),
    mode:            readonly(mode),
    errorMsg:        readonly(errorMsg),
    counts:          readonly(counts),
    metrics:         readonly(metrics),
    tracks,
    events,
    transform:       readonly(transform),
    lineConfig:      readonly(lineConfig),
    lineOrientation: readonly(lineOrientation),

    mount,
    loadModel,
    startCamera,
    startDemo,
    stop,

    // Transform controls
    rotateRight,
    rotateLeft,
    setRotation,
    toggleMirror,

    // Line controls
    setLineOrientation,
    setLine,
    flipDirection,

    exportZip,
    resetCounters,

    evidenceStore: evidence
  }
}
