/**
 * Logger
 * Stores count events in memory during the session.
 * Events are reactive-friendly plain objects (no class instances).
 *
 * @typedef {Object} LogEntry
 * @property {number}   id         — auto-increment entry number
 * @property {string}   eventId    — UUID-ish unique string
 * @property {number}   timestamp  — ms since epoch
 * @property {string}   timeLabel  — HH:MM:SS string
 * @property {'IN'|'OUT'} direction
 * @property {number}   trackId
 * @property {string[]} imageFiles — filenames of captured evidence images
 */

let _globalSeq = 0

function formatTime (ms) {
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function makeEventId () {
  return `ev-${Date.now().toString(36)}-${(++_globalSeq).toString(36)}`
}

export class Logger {
  constructor () {
    /** @type {LogEntry[]} */
    this.entries = []
    this._inCount  = 0
    this._outCount = 0
  }

  /**
   * Record a new count event.
   * @param {{ direction: 'IN'|'OUT', trackId: number }} event
   * @param {string[]} [imageFiles=[]]
   * @returns {LogEntry}
   */
  log (event, imageFiles = []) {
    const ts    = Date.now()
    const entry = {
      id:         this.entries.length + 1,
      eventId:    makeEventId(),
      timestamp:  ts,
      timeLabel:  formatTime(ts),
      direction:  event.direction,
      trackId:    event.trackId,
      imageFiles
    }
    this.entries.push(entry)

    if (event.direction === 'IN')  this._inCount++
    else                           this._outCount++

    return entry
  }

  get inCount  () { return this._inCount  }
  get outCount () { return this._outCount }
  get netCount () { return this._inCount - this._outCount }

  /**
   * Generate CSV content from all log entries.
   * @returns {string}
   */
  toCSV () {
    const header = 'id,event_id,timestamp,time,direction,track_id,image_files'
    const rows = this.entries.map(e =>
      [
        e.id,
        e.eventId,
        e.timestamp,
        e.timeLabel,
        e.direction,
        e.trackId,
        e.imageFiles.join(';')
      ].join(',')
    )
    return [header, ...rows].join('\n')
  }

  /** Generate JSON manifest. */
  toManifest () {
    return JSON.stringify({
      generated:  new Date().toISOString(),
      totalIn:    this._inCount,
      totalOut:   this._outCount,
      net:        this._inCount - this._outCount,
      entryCount: this.entries.length,
      entries:    this.entries
    }, null, 2)
  }

  reset () {
    this.entries   = []
    this._inCount  = 0
    this._outCount = 0
  }
}
