<template>
  <section class="card">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-lg font-semibold">Глубокий анализ</h3>
      <div class="flex gap-2" v-if="canShowAction">
        <button
          v-if="hasAnyCredits"
          class="px-3 py-2 text-sm rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          @click="runDeepAnalysis"
        >Выполнить анализ</button>
        <button
          v-else
          class="px-3 py-2 text-sm rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          @click="payForDeepAnalysis"
        >Получить анализ (1 ⭐️)</button>
      </div>
    </div>

    <div v-if="isLoading" class="py-4"><LoadingSpinner size="sm" label="Загрузка..." /></div>
    <div v-else-if="error" class="p-3 bg-red-500/10 rounded text-sm">{{ error }}</div>

    <div v-else>
      <div v-if="!items || items.length === 0" class="text-sm opacity-70">Пока нет глубоких анализов</div>
      <div v-else class="space-y-4">
        <DreamCard 
          v-for="(item, idx) in items"
          :key="item.id || idx"
          :dream="asDream(item)"
          @open="(payload) => openOverlay(asDream(item), payload)"
        />
      </div>
      <DreamOverlay :dream="selected" :anchor-y="anchorY" @close="closeOverlay" />
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user.js'
import api from '@/services/api'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import DreamCard from '@/components/DreamCard.vue'
import DreamOverlay from '@/components/DreamOverlay.vue'

const userStore = useUserStore()

const items = ref([])
const isLoading = ref(false)
const error = ref(null)
const selected = ref(null)
const anchorY = ref(null)

const hasAnyCredits = computed(() => {
  const p = userStore.profile || {}
  return (p.free_deep_analysis || 0) > 0 || (p.deep_analysis_credits || 0) > 0
})

const canShowAction = computed(() => (userStore.history?.length || 0) >= 5)

const asDream = (item) => ({
  dream_text: 'Глубокий анализ последних 5 снов',
  analysis: item.analysis,
  created_at: item.created_at,
  is_deep_analysis: true
})

const openOverlay = (dream, payload) => {
  selected.value = dream
  anchorY.value = typeof payload?.y === 'number' ? Math.max(0, Math.round(payload.y)) : null
  try {
    const tg = (window)?.Telegram?.WebApp
    tg?.BackButton?.onClick?.(() => closeOverlay())
    tg?.BackButton?.show?.()
  } catch {}
}
const closeOverlay = () => {
  try {
    const tg = (window)?.Telegram?.WebApp
    tg?.BackButton?.hide?.()
  } catch {}
  selected.value = null
  anchorY.value = null
}

const runDeepAnalysis = async () => {
  await userStore.performDeepAnalysis()
  await load()
}

const payForDeepAnalysis = async () => {
  await userStore.initiateDeepAnalysisPayment()
}

const load = async () => {
  isLoading.value = true
  error.value = null
  try {
    const resp = await api.getDeepAnalysesHistory()
    items.value = resp.data
    // append latest result from localStorage if present and not yet saved
    try {
      const latest = localStorage.getItem('latest_deep_analysis')
      if (latest && (!items.value || items.value.length === 0 || items.value[0]?.analysis !== latest)) {
        items.value.unshift({ id: 'local', analysis: latest, created_at: new Date().toISOString() })
      }
    } catch (_) {}
  } catch (e) {
    error.value = e?.response?.data?.error || e.message || 'Ошибка загрузки'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await load()
})
</script>

<style scoped>
.card { background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)); border-radius: 12px; padding: 12px; }
</style>