/**
 * PersonDetector
 * Wraps COCO-SSD to detect persons in a video frame.
 * Filters results to 'person' class only and applies a minimum confidence threshold.
 */

/**
 * @typedef {Object} Detection
 * @property {number[]} bbox   — [x, y, width, height] in pixels
 * @property {number}   score  — confidence (0–1)
 */

export class PersonDetector {
  constructor (opts = {}) {
    this.minScore  = opts.minScore  ?? 0.40
    this.maxDetect = opts.maxDetect ?? 20
    /** @type {import('@tensorflow-models/coco-ssd').ObjectDetection|null} */
    this._model    = null
    this._loading  = false
  }

  /** Load the COCO-SSD model. Must be called before detect(). */
  async load () {
    if (this._model) return
    if (this._loading) throw new Error('Model already loading')
    this._loading = true

    // Dynamic import — allows Vite to split this into its own chunk
    const cocoSsd = await import('@tensorflow-models/coco-ssd')
    // Ensure TF backend is initialised
    const tf = await import('@tensorflow/tfjs')
    await tf.ready()

    this._model   = await cocoSsd.load({ base: 'lite_mobilenet_v2' })
    this._loading = false
  }

  get isLoaded () { return !!this._model }

  /**
   * Run detection on a canvas or video element.
   * @param {HTMLCanvasElement|HTMLVideoElement|ImageData} source
   * @returns {Promise<Detection[]>}
   */
  async detect (source) {
    if (!this._model) throw new Error('Model not loaded — call load() first')

    const raw = await this._model.detect(source, this.maxDetect)

    return raw
      .filter(p => p.class === 'person' && p.score >= this.minScore)
      .map(p => ({ bbox: p.bbox, score: p.score }))
  }

  dispose () {
    this._model?.dispose?.()
    this._model = null
  }
}
