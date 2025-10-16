<template>
  <div>
    <!-- Заголовок + селектор режима справа -->
    <div class="flex items-center justify-between mb-4 text-white">
      <h2 class="text-2xl font-semibold">История</h2>
      <div class="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
        <select
          aria-label="Режим истории"
          v-model="modeVal"
          class="bg-transparent text-white focus:outline-none"
        >
          <option value="history">Дневник снов</option>
          <option value="deep">Глубокий анализ</option>
        </select>
        <!-- Горизонтальный шеврон -->
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="opacity-80">
          <path d="M9 6l6 6-6 6"/>
        </svg>
      </div>
    </div>
    <!-- Контент вкладок -->
    <div v-if="userStore?.isLoadingHistory" class="flex flex-col gap-4 pb-[5vh]">
      <div v-for="i in 3" :key="i" class="rounded-xl bg-white/10 px-8 md:px-16 py-6">
        <div class="flex justify-between items-center py-2 min-h-[2.5rem]">
          <div class="shimmer h-4 w-32 rounded"></div>
          <div class="shimmer h-4 w-12 rounded"></div>
        </div>
        <div class="mt-4 space-y-2">
          <div class="shimmer h-3 w-full rounded"></div>
          <div class="shimmer h-3 w-5/6 rounded"></div>
          <div class="shimmer h-3 w-2/3 rounded"></div>
        </div>
        <div class="mt-4 grid grid-cols-3 gap-2">
          <div class="shimmer h-6 rounded-full"></div>
          <div class="shimmer h-6 rounded-full"></div>
          <div class="shimmer h-6 rounded-full"></div>
        </div>
      </div>
    </div>
    <div v-else-if="userStore?.errorHistory" class="text-center text-red-400 py-8">
      Ошибка загрузки: {{ userStore.errorHistory }}
    </div>
    
    <!-- Вкладка История снов -->
    <div v-else-if="activeTab === 'history'">
      <div v-if="!regularDreams?.length" class="text-center text-white/60 py-8">
        У вас пока нет сохраненных анализов
      </div>
      <div v-else class="flex flex-col gap-4 pb-[5vh]">
        <DreamCard
          v-for="dream in visibleRegularDreams"
          :key="dream.id"
          :dream="dream"
          :active="activeId === dream.id"
          @toggle="activeId = activeId === dream.id ? null : dream.id"
        />
        <button
          v-if="canLoadMoreRegular"
          class="self-center bg-white/10 rounded-full px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors my-2"
          @click="loadMoreRegular"
        >
          Загрузить ещё
        </button>
      </div>
    </div>
    
    <!-- Вкладка Глубокий анализ -->
    <div v-else-if="activeTab === 'deep'">
      <div v-if="!deepAnalyses?.length" class="text-center text-white/60 py-8">
        Пока нет глубоких анализов
      </div>
      <div v-else class="flex flex-col gap-4 pb-[5vh]">
        <DreamCard
          v-for="dream in visibleDeepAnalyses"
          :key="dream.id"
          :dream="dream"
          :active="activeId === dream.id"
          @toggle="activeId = activeId === dream.id ? null : dream.id"
        />
        <button
          v-if="canLoadMoreDeep"
          class="self-center bg-white/10 rounded-full px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors my-2"
          @click="loadMoreDeep"
        >
          Загрузить ещё
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DreamCard from '@/components/DreamCard.vue'

const props = defineProps(['userStore'])

const activeId = ref(null)
const regularPageSize = ref(5)
const deepPageSize = ref(5)
const activeTab = ref('history')

// Привязка селектора к текущему режиму
const modeVal = computed({
  get: () => activeTab.value,
  set: (v: string) => switchTab(v)
})

// Разделяем сны на обычные и глубокие анализы
const regularDreams = computed(() => {
  if (!props.userStore?.history) return []
  return props.userStore.history.filter(dream => !dream.is_deep_analysis)
})

const deepAnalyses = computed(() => {
  if (!props.userStore?.history) return []
  return props.userStore.history.filter(dream => dream.is_deep_analysis)
})

const visibleRegularDreams = computed(() => {
  return regularDreams.value.slice(0, regularPageSize.value)
})

const visibleDeepAnalyses = computed(() => {
  return deepAnalyses.value.slice(0, deepPageSize.value)
})

const canLoadMoreRegular = computed(() => {
  return regularDreams.value.length > regularPageSize.value
})

const canLoadMoreDeep = computed(() => {
  return deepAnalyses.value.length > deepPageSize.value
})

const loadMoreRegular = () => {
  if (window.triggerHaptic) {
    window.triggerHaptic('light')
  }
  regularPageSize.value += 5
}

const loadMoreDeep = () => {
  if (window.triggerHaptic) {
    window.triggerHaptic('light')
  }
  deepPageSize.value += 5
}

const switchTab = (tab) => {
  if (window.triggerHaptic) {
    window.triggerHaptic('light')
  }
  activeTab.value = tab
  activeId.value = null // Сбрасываем активную карточку
}
</script>

<style scoped>
/* Минимальные стили: не ломаем нативный select, лишь обертка под бейдж */
select { -webkit-appearance: auto; appearance: auto; }
</style>

<style scoped>
.shimmer {
  background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 75%);
  background-size: 400% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 0% 0; } 100% { background-position: -200% 0; } }
</style>