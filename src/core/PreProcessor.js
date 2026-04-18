/**
 * PreProcessor
 * Normalizes video frames for ML inference (brightness / contrast).
 * The original video feed is untouched — only the processed copy is sent to the model.
 */
export class PreProcessor {
  constructor (opts = {}) {
    this.brightness = opts.brightness ?? 1.0   // multiplier  (1 = no change)
    this.contrast   = opts.contrast   ?? 1.0   // multiplier  (1 = no change)
    this._canvas = document.createElement('canvas')
    this._ctx    = this._canvas.getContext('2d', { willReadFrequently: true })
  }

  /**
   * Process a video element frame into an ImageBitmap suitable for model inference.
   * @param {HTMLVideoElement} videoEl
   * @returns {HTMLCanvasElement} — canvas with adjusted frame
   */
  process (videoEl) {
    const w = videoEl.videoWidth
    const h = videoEl.videoHeight

    if (this._canvas.width !== w || this._canvas.height !== h) {
      this._canvas.width  = w
      this._canvas.height = h
    }

    const ctx = this._ctx

    // Apply CSS filter before drawing to simulate brightness/contrast adjustments
    if (this.brightness !== 1.0 || this.contrast !== 1.0) {
      ctx.filter = `brightness(${this.brightness}) contrast(${this.contrast})`
    } else {
      ctx.filter = 'none'
    }

    ctx.drawImage(videoEl, 0, 0, w, h)
    ctx.filter = 'none'

    return this._canvas
  }

  /**
   * Reset settings to defaults.
   */
  reset () {
    this.brightness = 1.0
    this.contrast   = 1.0
  }
}
