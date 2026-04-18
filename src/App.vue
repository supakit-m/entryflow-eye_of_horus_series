<template>
  <div class="min-h-screen flex flex-col bg-horus-bg">

    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <HorusHeader :mode="mode" />

    <!-- ── Main layout ─────────────────────────────────────────────────── -->
    <main class="flex-1 p-4 md:p-6 flex flex-col gap-4">

      <!-- Top row: video + controls -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">

        <!-- Left: video canvas -->
        <div class="flex flex-col gap-3">
          <VideoCanvas
            :status="status"
            :errorMsg="errorMsg"
            :lineConfig="lineConfig"
            @ready="onCanvasReady"
            @setLine="setLine"
            @flipDirection="flipDirection"
          />

          <!-- Counts below video -->
          <CountDisplay :counts="counts" />

          <!-- Performance bar -->
          <PerformanceBar :metrics="metrics" :running="status === 'running'" />
        </div>

        <!-- Right: controls -->
        <ControlPanel
          :isRunning="status === 'running'"
          :isLoading="status === 'loading'"
          :hasEvents="events.length > 0"
          :lineConfig="lineConfig"
          @startCamera="handleStartCamera"
          @startDemo="handleStartDemo"
          @stop="stop"
          @setLine="setLine"
          @flipDirection="flipDirection"
          @exportZip="exportZip"
          @resetCounters="resetCounters"
        />
      </div>

      <!-- Bottom row: event log -->
      <EventLog :events="events" />

    </main>

    <!-- ── Footer ──────────────────────────────────────────────────────── -->
    <footer class="px-6 py-3 border-t border-horus-border text-center
                   text-[11px] font-mono text-horus-border tracking-widest">
      EYE OF HORUS · ENTRYFLOW · CLIENT-SIDE CV · ALL PROCESSING LOCAL
    </footer>

  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { usePipeline }    from '@/composables/usePipeline'
import HorusHeader        from '@/components/HorusHeader.vue'
import VideoCanvas        from '@/components/VideoCanvas.vue'
import CountDisplay       from '@/components/CountDisplay.vue'
import PerformanceBar     from '@/components/PerformanceBar.vue'
import ControlPanel       from '@/components/ControlPanel.vue'
import EventLog           from '@/components/EventLog.vue'

// ── Pipeline ────────────────────────────────────────────────────────────────
const {
  status, mode, errorMsg,
  counts, metrics, tracks, events,
  lineConfig,
  mount, loadModel,
  startCamera, startDemo, stop,
  flipDirection, setLine,
  exportZip, resetCounters
} = usePipeline()

// ── Lifecycle ────────────────────────────────────────────────────────────────
// Pre-load the model as soon as the app mounts (background fetch)
onMounted(async () => {
  console.log('[EntryFlow] Attempting model preload...');
  try {
    await loadModel();
    console.log('[EntryFlow] Model preload complete.');
  } catch (e) {
    console.warn('[EntryFlow] Preload failed, will retry on Start.');
  }
})

// ── Handlers ─────────────────────────────────────────────────────────────────
function onCanvasReady ({ video, canvas }) {
  mount(video, canvas)
}

async function handleStartCamera () {
  try {
    await startCamera()
  } catch (e) {
    console.error('[EntryFlow] Camera error:', e)
  }
}

async function handleStartDemo () {
  try {
    await startDemo()
  } catch (e) {
    console.error('[EntryFlow] Demo error:', e)
  }
}
</script>
