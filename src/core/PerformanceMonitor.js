/**
 * PerformanceMonitor
 * Tracks FPS (exponential moving average), per-frame detection latency,
 * and active track count. All values are plain numbers suitable for reactive UI.
 */

const FPS_ALPHA     = 0.15   // EMA smoothing factor — lower = smoother
const LATENCY_ALPHA = 0.20

export class PerformanceMonitor {
  constructor () {
    this.fps          = 0
    this.latency      = 0     // ms
    this.trackCount   = 0
    this._lastFrameTs = 0
    this._latencyTs   = 0
  }

  /** Call at the start of each frame processing cycle. */
  frameStart () {
    this._latencyTs = performance.now()

    const now = performance.now()
    if (this._lastFrameTs > 0) {
      const elapsed = now - this._lastFrameTs
      const instFps = 1000 / elapsed
      this.fps      = this.fps === 0
        ? instFps
        : FPS_ALPHA * instFps + (1 - FPS_ALPHA) * this.fps
    }
    this._lastFrameTs = now
  }

  /** Call after detection completes. */
  detectionDone () {
    const elapsed   = performance.now() - this._latencyTs
    this.latency    = this.latency === 0
      ? elapsed
      : LATENCY_ALPHA * elapsed + (1 - LATENCY_ALPHA) * this.latency
  }

  /** Update the active track count. */
  setTrackCount (n) {
    this.trackCount = n
  }

  reset () {
    this.fps          = 0
    this.latency      = 0
    this.trackCount   = 0
    this._lastFrameTs = 0
  }
}
