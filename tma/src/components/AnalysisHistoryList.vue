<template>
  <div>
    <!-- Переключатель вкладок с иконками: активная — иконка + текст, неактивная — только иконка (монохром, фейд) -->
    <div class="flex items-center mb-4 gap-3 text-white">
      <button
        class="inline-flex items-center gap-2 cursor-pointer transition-opacity"
        :class="activeTab === 'history' ? 'opacity-100' : 'opacity-60'"
        @click="switchTab('history')"
        aria-label="История снов"
      >
        <!-- Иконка истории: список/календарь -->
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 3a1 1 0 0 1 1 1v1h8V4a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V4a1 1 0 0 1 1-1zm13 8H4v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8zM5 9h14V7H5v2z"/>
        </svg>
        <span v-if="activeTab === 'history'" class="text-2xl font-semibold">История снов</span>
      </button>

      <button
        class="inline-flex items-center gap-2 cursor-pointer transition-opacity ml-2"
        :class="activeTab === 'deep' ? 'opacity-100' : 'opacity-60'"
        @click="switchTab('deep')"
        aria-label="Глубокий анализ"
      >
        <!-- Иконка глубокого анализа: граф/мозг/лупа (минималистично) -->
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M11 3a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm1 3a1 1 0 0 1 1 1v4.268l1.364.788a1 1 0 1 1-1 1.732l-1.732-1a1 1 0 0 1-.5-.866V9a1 1 0 0 1 1-1z"/>
          <path d="M20.293 20.293l-2.086-2.086a1 1 0 1 1 1.414-1.414l2.086 2.086a1 1 0 1 1-1.414 1.414z"/>
        </svg>
        <span v-if="activeTab === 'deep'" class="text-lg font-medium">Глубокий анализ</span>
      </button>
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
/* Кнопки вкладок — без лишних рамок/фонов; цвет монохромный, непрозрачность управляется классами */
button { background: transparent; }
</style>

<style scoped>
.shimmer {
  background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 75%);
  background-size: 400% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 0% 0; } 100% { background-position: -200% 0; } }
</style>