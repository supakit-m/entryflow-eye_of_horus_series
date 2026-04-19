/**
 * PreProcessor
 * Normalises video frames for ML inference.
 * Supports rotation (0 / 90 / 180 / 270 degrees CW) and horizontal mirroring.
 * The same transform is reused by usePipeline when drawing the display canvas.
 *
 * Rotation changes output canvas dimensions:
 *   0° / 180°  → output (W, H)
 *   90° / 270° → output (H, W)  ← swapped
 */
export class PreProcessor {
  /**
   * @param {Object} [opts]
   * @param {number}       [opts.brightness=1.0]
   * @param {number}       [opts.contrast=1.0]
   * @param {0|90|180|270} [opts.rotation=0]    — clockwise degrees
   * @param {boolean}      [opts.mirror=false]  — horizontal flip (after rotation)
   */
  constructor (opts = {}) {
    this.brightness = opts.brightness ?? 1.0
    this.contrast   = opts.contrast   ?? 1.0
    this.rotation   = opts.rotation   ?? 0
    this.mirror     = opts.mirror     ?? false

    this._canvas = document.createElement('canvas')
    this._ctx    = this._canvas.getContext('2d', { willReadFrequently: true })
  }

  /**
   * Draw a video frame (with rotation + mirror) onto an internal canvas
   * and return it — ready for ML inference.
   *
   * @param {HTMLVideoElement} videoEl
   * @returns {HTMLCanvasElement}
   */
  process (videoEl) {
    const srcW = videoEl.videoWidth
    const srcH = videoEl.videoHeight
    if (!srcW || !srcH) return this._canvas

    const { w: outW, h: outH } = this.outputSize(srcW, srcH)

    if (this._canvas.width !== outW || this._canvas.height !== outH) {
      this._canvas.width  = outW
      this._canvas.height = outH
    }

    this._applyTransformDraw(this._ctx, videoEl, srcW, srcH, outW, outH)
    return this._canvas
  }

  /**
   * Apply rotation + mirror transform to any canvas 2D context.
   * Used both for the inference canvas (process) and the display canvas (_draw in pipeline).
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {CanvasImageSource} source
   * @param {number} srcW
   * @param {number} srcH
   * @param {number} outW
   * @param {number} outH
   */
  _applyTransformDraw (ctx, source, srcW, srcH, outW, outH) {
    ctx.save()

    // Brightness / contrast filter
    const fp = []
    if (this.brightness !== 1.0) fp.push(`brightness(${this.brightness})`)
    if (this.contrast   !== 1.0) fp.push(`contrast(${this.contrast})`)
    ctx.filter = fp.length ? fp.join(' ') : 'none'

    ctx.translate(outW / 2, outH / 2)
    if (this.mirror)         ctx.scale(-1, 1)
    if (this.rotation !== 0) ctx.rotate((this.rotation * Math.PI) / 180)

    ctx.drawImage(source, -srcW / 2, -srcH / 2, srcW, srcH)
    ctx.restore()
  }

  /**
   * Output dimensions for given source dimensions and current settings.
   * @param {number} srcW
   * @param {number} srcH
   * @returns {{ w: number, h: number }}
   */
  outputSize (srcW, srcH) {
    const rot90 = this.rotation === 90 || this.rotation === 270
    return { w: rot90 ? srcH : srcW, h: rot90 ? srcW : srcH }
  }

  reset () {
    this.brightness = 1.0
    this.contrast   = 1.0
    this.rotation   = 0
    this.mirror     = false
  }
}
