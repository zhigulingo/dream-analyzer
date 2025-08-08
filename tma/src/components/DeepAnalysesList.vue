<template>
  <section class="card">
    <h3 class="text-lg font-semibold mb-3">Глубокий анализ</h3>
    <div v-if="isLoading" class="py-4"><LoadingSpinner size="sm" label="Загрузка..." /></div>
    <div v-else-if="error" class="p-3 bg-red-500/10 rounded text-sm">{{ error }}</div>
    <ul v-else>
      <li v-for="item in items" :key="item.id" class="mb-4 p-3 bg-white/10 rounded">
        <div class="text-[10px] opacity-70 mb-1">{{ formatDate(item.created_at) }}</div>
        <div class="text-xs whitespace-pre-line leading-relaxed">{{ item.analysis }}</div>
      </li>
      <li v-if="!items || items.length === 0" class="text-sm opacity-70">Пока нет глубоких анализов</li>
    </ul>
  </section>
  </template>

  <script setup>
  import { ref, onMounted } from 'vue'
  import api from '@/services/api'
  import LoadingSpinner from '@/components/LoadingSpinner.vue'

  const items = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  const formatDate = (d) => new Date(d).toLocaleString()

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

  onMounted(load)
  </script>

  <style scoped>
  .card { background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)); border-radius: 12px; padding: 12px; }
  </style>


