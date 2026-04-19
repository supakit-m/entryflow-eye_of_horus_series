<template>
  <div class="min-h-screen flex flex-col bg-horus-bg">
    <HorusHeader :mode="mode" />

    <main class="flex-1 p-4 md:p-6 flex flex-col gap-6">
      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
          <!-- Left: video + stats -->
          <div class="flex flex-col gap-3">
            <VideoCanvas
              :status="status"
              :errorMsg="errorMsg"
              :lineConfig="lineConfig"
              :lineOrientation="lineOrientation"
              :transform="transform"
              @ready="onCanvasReady"
              @setLine="setLine"
              @flipDirection="flipDirection"
            />
            <CountDisplay :counts="counts" />
            <PerformanceBar
              :metrics="metrics"
              :running="status === 'running'"
            />
          </div>

          <!-- Right: controls -->
          <ControlPanel
            :isRunning="status === 'running'"
            :isLoading="status === 'loading'"
            :hasEvents="events.length > 0"
            :lineConfig="lineConfig"
            :lineOrientation="lineOrientation"
            :transform="transform"
            @startCamera="handleStartCamera"
            @startDemo="handleStartDemo"
            @stop="stop"
            @setRotation="setRotation"
            @rotateLeft="rotateLeft"
            @rotateRight="rotateRight"
            @toggleMirror="toggleMirror"
            @setLineOrientation="setLineOrientation"
            @setLine="setLine"
            @flipDirection="flipDirection"
            @exportZip="exportZip"
            @resetCounters="resetCounters"
          />
        </div>

        <EventLog :events="events" />
      </div>
    </main>

    <footer
      class="px-6 py-3 border-t border-horus-border text-center text-[11px] font-mono text-horus-border tracking-widest"
    >
      EYE OF HORUS · ENTRYFLOW · CLIENT-SIDE CV · ALL PROCESSING LOCAL
    </footer>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { usePipeline } from "@/composables/usePipeline";
import HorusHeader from "@/components/HorusHeader.vue";
import VideoCanvas from "@/components/VideoCanvas.vue";
import CountDisplay from "@/components/CountDisplay.vue";
import PerformanceBar from "@/components/PerformanceBar.vue";
import ControlPanel from "@/components/ControlPanel.vue";
import EventLog from "@/components/EventLog.vue";

const {
  status,
  mode,
  errorMsg,
  counts,
  metrics,
  tracks,
  events,
  transform,
  lineConfig,
  lineOrientation,
  mount,
  loadModel,
  startCamera,
  startDemo,
  stop,
  rotateLeft,
  rotateRight,
  setRotation,
  toggleMirror,
  setLineOrientation,
  setLine,
  flipDirection,
  exportZip,
  resetCounters,
} = usePipeline();

onMounted(() => {
  loadModel().catch((e) =>
    console.error("[EntryFlow] Model preload failed:", e),
  );
});

function onCanvasReady({ video, canvas }) {
  mount(video, canvas);
}

async function handleStartCamera() {
  try {
    await startCamera();
  } catch (e) {
    console.error("[EntryFlow] Camera error:", e);
  }
}

async function handleStartDemo() {
  try {
    await startDemo();
  } catch (e) {
    console.error("[EntryFlow] Demo error:", e);
  }
}
</script>
