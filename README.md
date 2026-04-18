# 👁 Eye of Horus : EntryFlow

> Client-side real-time multi-person people counter — no backend, no uploads, no cloud.

---

## Overview

**EntryFlow** is the people-counting module of the **Eye of Horus** computer vision project group.
It runs entirely in the browser using TensorFlow.js (COCO-SSD) for person detection,
a custom centroid/IOU tracker, and a virtual counting line with bidirectional IN/OUT logic.

All video frames, captures, and logs remain on the user's device at all times.

---

## Quick Start

```bash
# 1 — Install dependencies
npm install

# 2 — Start the dev server
npm run dev

# 3 — Open http://localhost:5173
```

### Production build

```bash
npm run build
# Output in ./dist — deploy to GitHub Pages, Netlify, Vercel, etc.
```

---

## Demo Mode

Place a video file at `public/demo/demo.mp4`.
See `public/demo/README.md` for format requirements.

Demo mode uses the same detection pipeline as live camera — no camera permission is required.

---

## Project Structure

```
eye-of-horus-entryflow/
├── src/
│   ├── core/
│   │   ├── VideoManager.js       — webcam / demo video abstraction
│   │   ├── PreProcessor.js       — brightness/contrast normalisation
│   │   ├── PersonDetector.js     — COCO-SSD inference wrapper
│   │   ├── Tracker.js            — IOU + centroid multi-object tracker
│   │   ├── LineCounter.js        — virtual line crossing + direction logic
│   │   ├── Logger.js             — in-memory event log + CSV / JSON export
│   │   ├── EvidenceCapture.js    — per-event JPEG evidence capture
│   │   ├── ZipExporter.js        — JSZip-based download
│   │   └── PerformanceMonitor.js — FPS / latency / track-count metrics
│   ├── composables/
│   │   └── usePipeline.js        — Vue 3 composable wiring all modules
│   └── components/
│       ├── HorusHeader.vue       — branding header
│       ├── VideoCanvas.vue       — video feed + draggable overlay canvas
│       ├── CountDisplay.vue      — IN / OUT / NET counters
│       ├── PerformanceBar.vue    — live FPS / latency display
│       ├── ControlPanel.vue      — source selection, line config, export
│       └── EventLog.vue          — real-time scrollable event table
├── public/
│   ├── favicon.svg
│   └── demo/
│       └── README.md             — instructions for demo video
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Architecture

```
Video Source (Camera / Demo)
  → PreProcessor        (brightness/contrast for ML)
    → PersonDetector    (COCO-SSD — person bboxes)
      → Tracker         (IOU + centroid — persistent IDs)
        → LineCounter   (side-change crossing detection)
          → Logger      (in-memory event store)
          → EvidenceCapture (JPEG crop per event)
            → ZipExporter (CSV + images → .zip download)
```

Vue components consume state via `usePipeline` composable only.
No component calls ML logic directly.

---

## Export Format

Clicking **Export ZIP** produces a `entryflow_export_<timestamp>.zip` containing:

```
entryflow_export_2024-01-01T00-00-00/
  records.csv        — tabular event log
  manifest.json      — summary + full event array
  images/
    person_3_1714000000000.jpg
    …
```

---

## Features

| Feature | Status |
|---|---|
| Multi-person detection | ✅ |
| Persistent track IDs | ✅ |
| Bidirectional IN/OUT counting | ✅ |
| Duplicate crossing prevention | ✅ |
| Image evidence capture | ✅ |
| Real-time event log | ✅ |
| ZIP export (CSV + images) | ✅ |
| Demo mode (no camera needed) | ✅ |
| FPS / latency monitoring | ✅ |
| Draggable counting line | ✅ |
| Fully client-side / offline | ✅ |

---

## Privacy

- Zero server communication
- No video frames transmitted
- Evidence stored in browser memory only
- Cleared on page reload (unless exported)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Vue 3 (Composition API) |
| Build | Vite 5 |
| Styling | TailwindCSS 3 |
| CV Model | TensorFlow.js + COCO-SSD |
| ZIP | JSZip |

---

## Eye of Horus Project Group

**EntryFlow** is a sub-project under the *Eye of Horus* computer vision umbrella.

> *"The eye sees all that enters and all that departs."*
