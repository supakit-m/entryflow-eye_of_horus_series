<template>
  <div class="card flex flex-col" style="max-height: 320px;">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2.5 border-b border-horus-border shrink-0">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-horus-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <span class="text-sm font-semibold text-horus-text">Event Log</span>
        <span v-if="events.length" class="text-xs font-mono bg-horus-border px-1.5 py-0.5 rounded text-horus-text-dim">
          {{ events.length }}
        </span>
      </div>
      <!-- Auto-scroll toggle -->
      <button
        class="text-[11px] font-mono text-horus-text-dim hover:text-horus-gold transition-colors"
        @click="autoScroll = !autoScroll"
        :title="autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'"
      >
        {{ autoScroll ? '⬇ AUTO' : '⏸ PAUSED' }}
      </button>
    </div>

    <!-- Table -->
    <div class="overflow-y-auto flex-1" ref="scrollEl">
      <table class="w-full text-xs font-mono">
        <thead class="sticky top-0 bg-horus-card z-10">
          <tr class="text-horus-text-dim border-b border-horus-border">
            <th class="text-left px-3 py-1.5 w-8">#</th>
            <th class="text-left px-3 py-1.5">Time</th>
            <th class="text-left px-3 py-1.5">Dir</th>
            <th class="text-left px-3 py-1.5">Track</th>
            <th class="text-left px-3 py-1.5">Evidence</th>
          </tr>
        </thead>
        <tbody>
          <TransitionGroup name="log-row">
            <tr
              v-for="entry in displayEvents"
              :key="entry.eventId"
              class="border-b border-horus-border/50 hover:bg-horus-border/30 transition-colors"
            >
              <td class="px-3 py-1.5 text-horus-text-dim">{{ entry.id }}</td>
              <td class="px-3 py-1.5 text-horus-text">{{ entry.timeLabel }}</td>
              <td class="px-3 py-1.5">
                <span :class="entry.direction === 'IN' ? 'badge-in' : 'badge-out'">
                  {{ entry.direction === 'IN' ? '↓' : '↑' }} {{ entry.direction }}
                </span>
              </td>
              <td class="px-3 py-1.5 text-horus-blue">ID:{{ entry.trackId }}</td>
              <td class="px-3 py-1.5 text-horus-text-dim">
                <span v-if="entry.imageFiles.length">
                  📸 {{ entry.imageFiles[0] }}
                </span>
                <span v-else class="opacity-40">—</span>
              </td>
            </tr>
          </TransitionGroup>

          <!-- Empty state -->
          <tr v-if="events.length === 0">
            <td colspan="5" class="text-center py-8 text-horus-text-dim text-[11px] tracking-widest uppercase">
              No events yet
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  events: {
    type: Array,
    default: () => []
  }
})

const scrollEl   = ref(null)
const autoScroll = ref(true)

// Show newest events first in the log
const displayEvents = computed(() =>
  [...props.events].reverse()
)

// Auto-scroll to top (newest) when new events arrive
watch(() => props.events.length, async () => {
  if (!autoScroll.value) return
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = 0
})
</script>

<style scoped>
.log-row-enter-active { transition: all 0.25s ease; }
.log-row-enter-from   { opacity: 0; transform: translateY(-8px); }
</style>
