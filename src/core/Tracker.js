/**
 * Tracker
 * Maintains identity persistence across frames using a combination of
 * IOU (Intersection over Union) and centroid distance matching.
 *
 * @typedef {Object} Track
 * @property {number}   id
 * @property {number[]} bbox           — [x, y, w, h]
 * @property {{x:number,y:number}} centroid
 * @property {number}   score
 * @property {number}   age            — frames since creation
 * @property {number}   missedFrames   — consecutive frames not matched
 * @property {number|null} lastSide    — which side of the counting line (-1 | 0 | 1)
 * @property {number}   crossingCooldown — frames remaining before another crossing can fire
 */

// ─── helpers ────────────────────────────────────────────────────────────────

function centroidOf ([x, y, w, h]) {
  return { x: x + w / 2, y: y + h / 2 }
}

function iou (b1, b2) {
  const [x1, y1, w1, h1] = b1
  const [x2, y2, w2, h2] = b2
  const ix = Math.max(0, Math.min(x1 + w1, x2 + w2) - Math.max(x1, x2))
  const iy = Math.max(0, Math.min(y1 + h1, y2 + h2) - Math.max(y1, y2))
  const inter = ix * iy
  const union = w1 * h1 + w2 * h2 - inter
  return union > 0 ? inter / union : 0
}

function dist (c1, c2) {
  const dx = c1.x - c2.x
  const dy = c1.y - c2.y
  return Math.sqrt(dx * dx + dy * dy)
}

// ────────────────────────────────────────────────────────────────────────────

export class Tracker {
  /**
   * @param {Object} [opts]
   * @param {number} [opts.maxMissedFrames=12]   — frames before a track is removed
   * @param {number} [opts.iouThreshold=0.25]    — minimum IOU to match
   * @param {number} [opts.distThreshold=120]    — max centroid distance (px) as fallback
   * @param {number} [opts.crossingCooldown=30]  — frames before another crossing event
   */
  constructor (opts = {}) {
    this.maxMissedFrames  = opts.maxMissedFrames  ?? 12
    this.iouThreshold     = opts.iouThreshold     ?? 0.25
    this.distThreshold    = opts.distThreshold    ?? 120
    this.crossingCooldown = opts.crossingCooldown ?? 30

    /** @type {Map<number, Track>} */
    this._tracks = new Map()
    this._nextId = 1
  }

  /**
   * Update all tracks with a new set of detections.
   * @param {Array<{bbox:number[], score:number}>} detections
   * @returns {Track[]} — all currently active tracks
   */
  update (detections) {
    const tracks     = Array.from(this._tracks.values())
    const matchedTracks     = new Set()
    const matchedDetections = new Set()

    // ── Phase 1: IOU matching ────────────────────────────────────────────────
    for (const track of tracks) {
      let bestScore = this.iouThreshold - 0.001
      let bestIdx   = -1

      for (let i = 0; i < detections.length; i++) {
        if (matchedDetections.has(i)) continue
        const score = iou(track.bbox, detections[i].bbox)
        if (score > bestScore) { bestScore = score; bestIdx = i }
      }

      if (bestIdx >= 0) {
        this._applyDetection(track, detections[bestIdx])
        matchedTracks.add(track.id)
        matchedDetections.add(bestIdx)
      }
    }

    // ── Phase 2: centroid distance fallback for unmatched tracks ────────────
    for (const track of tracks) {
      if (matchedTracks.has(track.id)) continue

      let bestDist = this.distThreshold
      let bestIdx  = -1

      for (let i = 0; i < detections.length; i++) {
        if (matchedDetections.has(i)) continue
        const d = dist(track.centroid, centroidOf(detections[i].bbox))
        if (d < bestDist) { bestDist = d; bestIdx = i }
      }

      if (bestIdx >= 0) {
        this._applyDetection(track, detections[bestIdx])
        matchedTracks.add(track.id)
        matchedDetections.add(bestIdx)
      }
    }

    // ── Phase 3: increment missed counter for unmatched tracks ───────────────
    for (const track of tracks) {
      if (!matchedTracks.has(track.id)) {
        track.missedFrames++
        if (track.crossingCooldown > 0) track.crossingCooldown--
      }
    }

    // ── Phase 4: create new tracks for unmatched detections ─────────────────
    for (let i = 0; i < detections.length; i++) {
      if (!matchedDetections.has(i)) {
        const id    = this._nextId++
        const det   = detections[i]
        /** @type {Track} */
        const track = {
          id,
          bbox:             det.bbox,
          centroid:         centroidOf(det.bbox),
          score:            det.score,
          age:              0,
          missedFrames:     0,
          lastSide:         null,
          crossingCooldown: 0
        }
        this._tracks.set(id, track)
      }
    }

    // ── Phase 5: prune stale tracks ──────────────────────────────────────────
    for (const [id, track] of this._tracks) {
      if (track.missedFrames > this.maxMissedFrames) {
        this._tracks.delete(id)
      }
    }

    return Array.from(this._tracks.values())
  }

  /**
   * Tick down cooldown timers (should be called every frame).
   */
  tick () {
    for (const track of this._tracks.values()) {
      if (track.crossingCooldown > 0) track.crossingCooldown--
    }
  }

  reset () {
    this._tracks.clear()
    this._nextId = 1
  }

  get activeTracks () {
    return Array.from(this._tracks.values())
  }

  /** @private */
  _applyDetection (track, det) {
    track.bbox         = det.bbox
    track.centroid     = centroidOf(det.bbox)
    track.score        = det.score
    track.age++
    track.missedFrames = 0
    if (track.crossingCooldown > 0) track.crossingCooldown--
  }
}
