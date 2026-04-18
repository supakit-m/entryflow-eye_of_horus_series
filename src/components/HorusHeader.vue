<template>
  <header class="flex items-center justify-between px-6 py-4 border-b border-horus-border bg-horus-card">
    <!-- Logotype -->
    <div class="flex items-center gap-3">
      <!-- SVG emblem -->
      <div class="horus-logo-mark">
        <svg viewBox="0 0 48 40" class="w-10 h-8" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="24" cy="18" rx="20" ry="11"
            fill="none" stroke="#D4AF37" stroke-width="2"/>
          <circle cx="24" cy="18" r="6.5" fill="#D4AF37"/>
          <circle cx="24" cy="18" r="2.8" fill="#09090F"/>
          <path d="M24 26 Q18 33 16 39 Q23 35 24 31 Q25 35 32 39 Q30 33 24 26Z"
                fill="#D4AF37" opacity="0.8"/>
          <line x1="4"  y1="18" x2="0"  y2="18" stroke="#D4AF37" stroke-width="1.5" opacity="0.6"/>
          <line x1="44" y1="18" x2="48" y2="18" stroke="#D4AF37" stroke-width="1.5" opacity="0.6"/>
        </svg>
      </div>

      <div class="flex flex-col leading-none">
        <span class="text-[10px] font-mono font-medium tracking-[0.3em] text-horus-text-dim uppercase">
          Eye of Horus
        </span>
        <span class="text-xl font-bold font-sans tracking-tight text-white">
          Entry<span class="text-horus-gold">Flow</span>
        </span>
      </div>
    </div>

    <!-- Right side: mode badge + session info -->
    <div class="flex items-center gap-4">
      <!-- Mode badge -->
      <div v-if="mode" class="flex items-center gap-1.5">
        <span
          class="w-2 h-2 rounded-full animate-pulse"
          :class="mode === 'camera' ? 'bg-horus-red' : 'bg-horus-green'"
        />
        <span class="text-xs font-mono uppercase tracking-widest text-horus-text-dim">
          {{ mode === 'camera' ? 'LIVE CAM' : 'DEMO' }}
        </span>
      </div>

      <!-- Version tag -->
      <span class="hidden sm:block text-[10px] font-mono text-horus-border
                   border border-horus-border rounded px-2 py-0.5 tracking-widest">
        v1.0.0
      </span>
    </div>
  </header>
</template>

<script setup>
defineProps({
  mode: { type: String, default: null }   // 'camera' | 'demo' | null
})
</script>

<style scoped>
.horus-logo-mark {
  filter: drop-shadow(0 0 8px rgba(212,175,55,0.35));
}
</style>
