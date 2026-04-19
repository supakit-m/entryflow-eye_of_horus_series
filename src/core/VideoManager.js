/**
 * VideoManager
 * Abstracts the video source — either a live camera stream or a demo video file.
 * Provides a consistent interface regardless of source type.
 */
export class VideoManager {
  constructor () {
    /** @type {HTMLVideoElement|null} */
    this.videoEl = null
    /** @type {MediaStream|null} */
    this.stream = null
    /** @type {'camera'|'demo'|null} */
    this.mode = null
    this._readyPromise = null
  }

  /**
   * Start a live webcam stream.
   * @param {HTMLVideoElement} videoEl
   * @param {{ width?: number, height?: number }} [opts]
   */
  async startCamera (videoEl, opts = {}) {
    this.videoEl = videoEl

    const constraints = {
      video: {
        facingMode: 'environment',
        width:  { ideal: opts.width  ?? 1280 },
        height: { ideal: opts.height ?? 720  }
      },
      audio: false
    }

    this.stream = await navigator.mediaDevices.getUserMedia(constraints)
    videoEl.srcObject = this.stream
    videoEl.muted = true

    await this._waitForReady(videoEl)
    videoEl.play()
    this.mode = 'camera'
  }

  /**
   * Load and play a demo video file (no camera permission needed).
   * @param {HTMLVideoElement} videoEl
   * @param {string} src — path to the video file
   */
  async startDemoVideo (videoEl, src = '/entryflow-eye_of_horus_series/demo/demo.mp4') {
    this.videoEl = videoEl
    videoEl.src = src
    videoEl.loop  = true
    videoEl.muted = true
    videoEl.playsInline = true

    await this._waitForReady(videoEl)
    videoEl.play()
    this.mode = 'demo'
  }

  /** Stop all playback and release the camera track. */
  stop () {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop())
      this.stream = null
    }
    if (this.videoEl) {
      this.videoEl.pause()
      this.videoEl.srcObject = null
      this.videoEl.src = ''
      this.videoEl.load()
    }
    this.mode = null
  }

  /** @returns {boolean} True if the video element has data and is playing. */
  get isReady () {
    return !!(
      this.videoEl &&
      !this.videoEl.paused &&
      this.videoEl.readyState >= HTMLVideoElement.HAVE_ENOUGH_DATA
    )
  }

  get videoWidth  () { return this.videoEl?.videoWidth  ?? 0 }
  get videoHeight () { return this.videoEl?.videoHeight ?? 0 }

  /** @private */
  _waitForReady (videoEl) {
    return new Promise((resolve, reject) => {
      if (videoEl.readyState >= HTMLVideoElement.HAVE_ENOUGH_DATA) return resolve()
      videoEl.onloadeddata = () => resolve()
      videoEl.onerror     = (e) => reject(new Error(`Video load error: ${e.message ?? e}`))
      setTimeout(() => reject(new Error('Video ready timeout')), 15_000)
    })
  }
}
