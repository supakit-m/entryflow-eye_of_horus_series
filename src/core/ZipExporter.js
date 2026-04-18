/**
 * ZipExporter
 * Packages all log data and captured images into a downloadable ZIP archive.
 *
 * ZIP structure:
 *   entryflow_export_<timestamp>/
 *     records.csv
 *     manifest.json
 *     images/
 *       person_<id>_<ts>.jpg
 *       …
 */

import JSZip from 'jszip'

export class ZipExporter {
  /**
   * Build and trigger a ZIP download.
   * @param {import('./Logger').Logger}          logger
   * @param {import('./EvidenceCapture').EvidenceCapture} evidence
   */
  async export (logger, evidence) {
    const zip       = new JSZip()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const rootDir   = `entryflow_export_${timestamp}/`

    // ── CSV log ────────────────────────────────────────────────────────────
    zip.file(`${rootDir}records.csv`, logger.toCSV())

    // ── JSON manifest ─────────────────────────────────────────────────────
    zip.file(`${rootDir}manifest.json`, logger.toManifest())

    // ── Evidence images ───────────────────────────────────────────────────
    const captures = evidence.getAll()
    if (captures.length > 0) {
      const imgFolder = zip.folder(`${rootDir}images`)
      for (const { blob, filename } of captures) {
        imgFolder.file(filename, blob)
      }
    }

    // ── Generate and download ─────────────────────────────────────────────
    const content = await zip.generateAsync({
      type:               'blob',
      compression:        'DEFLATE',
      compressionOptions: { level: 6 }
    })

    const url = URL.createObjectURL(content)
    const a   = document.createElement('a')
    a.href     = url
    a.download = `entryflow_export_${timestamp}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
