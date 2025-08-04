<template>
  <div>
    <!-- Переключатель вкладок -->
    <div class="flex items-center mb-4 gap-4">
      <h2 
        class="text-2xl font-semibold text-white cursor-pointer transition-opacity"
        :class="{ 'opacity-100': activeTab === 'history', 'opacity-60': activeTab !== 'history' }"
        @click="switchTab('history')"
      >
        История снов
      </h2>
      <h3 
        class="text-lg font-medium text-white cursor-pointer transition-opacity"
        :class="{ 'opacity-100': activeTab === 'deep', 'opacity-60': activeTab !== 'deep' }"
        @click="switchTab('deep')"
      >
        Глубокий анализ
      </h3>
    </div>
    <!-- Контент вкладок -->
    <div v-if="userStore?.isLoadingHistory" class="text-center text-white/60 py-8">
      Загрузка истории...
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