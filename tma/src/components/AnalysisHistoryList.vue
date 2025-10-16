<template>
  <div>
    <!-- Заголовок + селектор режима справа -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-3xl font-bold">История</h2>
      <div class="inline-flex items-center gap-2 rounded-full px-3 py-1 themed-badge">
        <select
          aria-label="Режим истории"
          v-model="modeVal"
          class="bg-transparent focus:outline-none themed-select"
        >
          <option value="history">Дневник снов</option>
          <option value="deep">Глубокий анализ</option>
        </select>
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
          class="self-center rounded-full px-4 py-2 text-sm font-medium transition-colors my-2 themed-button"
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
          class="self-center rounded-full px-4 py-2 text-sm font-medium transition-colors my-2 themed-button"
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
/* Тематические бейджи и кнопки: слегка темнее на светлой теме и слегка светлее на тёмной */
select { -webkit-appearance: auto; appearance: auto; }

.themed-badge { position: relative; border: 1px solid transparent; }
.themed-select { color: var(--tg-theme-text-color); padding-right: 26px; -webkit-appearance: none; appearance: none; }
/* Кастомная стрелка селектора, цвет = var(--tg-theme-text-color) */
.themed-badge::after {
  content: "";
  position: absolute;
  right: 8px;
  top: 50%;
  width: 14px; height: 14px;
  transform: translateY(-50%);
  background-color: var(--tg-theme-text-color);
  -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="black" d="M7 10l5 5 5-5"/></svg>') no-repeat center / contain;
          mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="black" d="M7 10l5 5 5-5"/></svg>') no-repeat center / contain;
  pointer-events: none;
}

@media (prefers-color-scheme: dark) {
  .themed-badge { background-color: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.12); }
  .themed-select { color: var(--tg-theme-text-color, #fff); }
  .themed-button { background-color: rgba(255, 255, 255, 0.12); color: var(--tg-theme-text-color, #fff); }
  .themed-button:hover { background-color: rgba(255, 255, 255, 0.18); }
}

@media (prefers-color-scheme: light) {
  .themed-badge { background-color: rgba(0, 0, 0, 0.06); border-color: rgba(0, 0, 0, 0.10); }
  .themed-select { color: var(--tg-theme-text-color, #111); }
  .themed-button { background-color: rgba(0, 0, 0, 0.08); color: var(--tg-theme-text-color, #111); }
  .themed-button:hover { background-color: rgba(0, 0, 0, 0.12); }
}
</style>

<style scoped>
.shimmer {
  background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 75%);
  background-size: 400% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 0% 0; } 100% { background-position: -200% 0; } }
</style>