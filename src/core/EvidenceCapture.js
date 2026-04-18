/**
 * EvidenceCapture
 * Crops and stores JPEG evidence images in memory at the moment a counting event fires.
 * Images are indexed by filename and can be bulk-retrieved for export.
 *
 * @typedef {Object} CaptureRecord
 * @property {Blob}   blob
 * @property {string} filename   — e.g. "person_7_1714000000000.jpg"
 * @property {number} trackId
 * @property {number} timestamp
 * @property {'IN'|'OUT'} direction
 */

const PADDING_PX    = 24    // pixels added around the bounding box
const JPEG_QUALITY  = 0.82  // JPEG encoding quality (0–1)

export class EvidenceCapture {
  constructor () {
    /** @type {Map<string, CaptureRecord>} */
    this.captures = new Map()
    this._canvas  = document.createElement('canvas')
    this._ctx     = this._canvas.getContext('2d', { willReadFrequently: false })
  }

  /**
   * Capture a cropped JPEG from the current video frame.
   *
   * @param {HTMLVideoElement|HTMLCanvasElement} source — current frame source
   * @param {number[]} bbox     — [x, y, w, h] in pixels
   * @param {number}   trackId
   * @param {'IN'|'OUT'} direction
   * @returns {Promise<{filename: string, key: string}>}
   */
  async capture (source, bbox, trackId, direction) {
    const srcW = source.videoWidth  ?? source.width  ?? source.naturalWidth
    const srcH = source.videoHeight ?? source.height ?? source.naturalHeight

    const [bx, by, bw, bh] = bbox

    const cx = Math.max(0, Math.floor(bx - PADDING_PX))
    const cy = Math.max(0, Math.floor(by - PADDING_PX))
    const cw = Math.min(srcW - cx, Math.ceil(bw + PADDING_PX * 2))
    const ch = Math.min(srcH - cy, Math.ceil(bh + PADDING_PX * 2))

    this._canvas.width  = cw
    this._canvas.height = ch

    this._ctx.drawImage(source, cx, cy, cw, ch, 0, 0, cw, ch)

    const timestamp = Date.now()
    const filename  = `person_${trackId}_${timestamp}.jpg`
    const key       = filename

    const blob = await new Promise((resolve, reject) => {
      this._canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('Canvas toBlob returned null')),
        'image/jpeg',
        JPEG_QUALITY
      )
    })

    /** @type {CaptureRecord} */
    const record = { blob, filename, trackId, timestamp, direction }
    this.captures.set(key, record)

    return { filename, key }
  }

  /**
   * Return a data-URL for a given capture key (for UI thumbnails).
   * @param {string} key
   * @returns {Promise<string>}
   */
  async getDataURL (key) {
    const record = this.captures.get(key)
    if (!record) return ''
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(/** @type {string} */ (reader.result))
      reader.readAsDataURL(record.blob)
    })
  }

  /** @returns {CaptureRecord[]} */
  getAll () {
    return Array.from(this.captures.values())
  }

  reset () {
    this.captures.clear()
  }
}
