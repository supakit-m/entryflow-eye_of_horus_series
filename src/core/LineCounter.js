/**
 * LineCounter
 * Detects when a tracked person crosses the virtual counting line and
 * determines crossing direction (IN / OUT).
 *
 * The line is defined by two normalised points (0–1 range for both axes),
 * so it works regardless of frame resolution.
 *
 * Side determination uses the 2-D cross product (sign of signed area).
 *   d > 0 → "left" of the directed line  → side +1
 *   d < 0 → "right" of the directed line → side -1
 *   d = 0 → exactly on the line           → side  0
 *
 * Crossing convention:
 *   +1 → -1  means the person moved from the "left" side to the "right" → OUT
 *   -1 → +1  means the person moved from the "right" side to the "left" → IN
 * (The label depends on the configured inDirection.)
 *
 * @typedef {Object} CountEvent
 * @property {number} trackId
 * @property {'IN'|'OUT'} direction
 * @property {{x:number,y:number}} centroid — normalised centroid at crossing moment
 * @property {number[]} bbox                 — pixel-space bbox at crossing moment
 */

export class LineCounter {
  /**
   * @param {Object}  [opts]
   * @param {number}  [opts.x1=0]       normalised x of line start
   * @param {number}  [opts.y1=0.5]     normalised y of line start
   * @param {number}  [opts.x2=1]       normalised x of line end
   * @param {number}  [opts.y2=0.5]     normalised y of line end
   * @param {1|-1}    [opts.inDirection] which side change counts as IN (+1→-1 or -1→+1)
   */
  constructor (opts = {}) {
    this.x1 = opts.x1 ?? 0
    this.y1 = opts.y1 ?? 0.5
    this.x2 = opts.x2 ?? 1
    this.y2 = opts.y2 ?? 0.5
    // +1 → -1 means moving in the "downward / rightward" direction → IN by default
    this.inDirection = opts.inDirection ?? 1
  }

  /**
   * Reconfigure the line.
   * All parameters are normalised (0–1).
   */
  setLine (x1, y1, x2, y2) {
    this.x1 = x1; this.y1 = y1
    this.x2 = x2; this.y2 = y2
  }

  /** Flip IN/OUT labelling. */
  flipDirection () {
    this.inDirection *= -1
  }

  /**
   * Evaluate a single track and return a CountEvent if a crossing occurred,
   * or null otherwise.
   *
   * NOTE: Centroid must be normalised (0–1) relative to the frame dimensions.
   *
   * @param {import('./Tracker').Track} track
   * @param {{x:number,y:number}} normCentroid  — centroid in normalised space
   * @returns {CountEvent|null}
   */
  process (track, normCentroid) {
    if (track.crossingCooldown > 0) return null

    const side = this._sideOf(normCentroid)
    if (side === 0) return null   // exactly on line — skip

    if (track.lastSide === null) {
      track.lastSide = side
      return null
    }

    if (track.lastSide === side) return null  // same side — no crossing

    // ── Crossing detected ──────────────────────────────────────────────────
    const prevSide = track.lastSide
    track.lastSide = side
    track.crossingCooldown = 30   // prevent double-counting for ~1 second at 30 fps

    // Determine direction label
    // prevSide → side:
    //   +1 → -1 : moved in inDirection  → IN  (if inDirection === +1)
    //   -1 → +1 : moved against         → OUT (if inDirection === +1)
    const direction = (prevSide === this.inDirection) ? 'IN' : 'OUT'

    return {
      trackId:  track.id,
      direction,
      centroid: { ...normCentroid },
      bbox:     [...track.bbox]
    }
  }

  /**
   * Determine which side of the line a point lies on.
   * Uses the sign of the cross product of the line vector and the point vector.
   * @returns {-1|0|1}
   */
  _sideOf ({ x, y }) {
    const dx = this.x2 - this.x1
    const dy = this.y2 - this.y1
    const d  = dx * (y - this.y1) - dy * (x - this.x1)
    return Math.sign(d)
  }

  /**
   * Get line coordinates in pixel space for drawing.
   * @param {number} W frame width
   * @param {number} H frame height
   * @returns {{ x1:number, y1:number, x2:number, y2:number }}
   */
  toPixels (W, H) {
    return {
      x1: this.x1 * W, y1: this.y1 * H,
      x2: this.x2 * W, y2: this.y2 * H
    }
  }
}
