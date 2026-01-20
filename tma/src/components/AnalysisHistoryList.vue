<template>
  <div>
    <!-- Табы для переключения режима -->
    <!-- Селектор табов в стиле переключателя (Segmented Control) -->
    <div class="tab-switcher-wrap mb-8">
      <div class="tab-switcher">
        <!-- Анимированная подложка активного таба -->
        <div 
          class="tab-active-pill" 
          :style="{ 
            transform: activeTab === 'deep' ? 'translateX(100%)' : 'translateX(0)',
            width: '50%'
          }"
        ></div>
        
        <button
          @click="switchTab('history')"
          class="tab-btn"
          :class="{ 'is-active': activeTab === 'history' }"
        >
          Дневник снов
        </button>
        
        <button
          @click="switchTab('deep')"
          class="tab-btn"
          :class="{ 
            'is-active': activeTab === 'deep',
            'is-locked': !hasDeepUnlocked 
          }"
        >
          <span class="inline-flex items-center gap-2">
            Глубокий анализ
            <span v-if="!hasDeepUnlocked" class="lock-ico-small"></span>
          </span>
        </button>
      </div>
    </div>

    <!-- Подсказка о блокировке (показывается при клике на заблокированный таб) -->
    <div v-if="showDeepHint && !hasDeepUnlocked" class="mt-[-20px] mb-4 text-center text-sm"
         :style="{ color: 'var(--tg-theme-hint-color, rgba(255,255,255,0.7))' }">
      Доступно после 5 снов в дневнике
    </div>
    <div v-if="showDeepHint && !hasDeepUnlocked" class="mt-2 text-sm"
         :style="{ color: 'var(--tg-theme-hint-color, rgba(255,255,255,0.7))' }">
      Доступно после 5 снов в дневнике
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
          @open="(payload) => openOverlay(dream, payload)"
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
          @open="(payload) => openOverlay(dream, payload)"
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
    <DreamOverlay :dream="selectedItem" :anchor-y="anchorY" @close="closeOverlay" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DreamCard from '@/components/DreamCard.vue'
import DreamOverlay from '@/components/DreamOverlay.vue'

const props = defineProps(['userStore'])

const selectedItem = ref<any|null>(null)
const anchorY = ref<number|null>(null)
const regularPageSize = ref(5)
const deepPageSize = ref(5)
const activeTab = ref('history')
const showDeepHint = ref(false)

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

// Разблокировка глубокого анализа после 5 снов
const regularCount = computed(() => regularDreams.value.length)
const hasDeepUnlocked = computed(() => regularCount.value >= 5)

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
  if (tab === 'deep' && !hasDeepUnlocked.value) {
    // Показать подсказку и не переключать
    showDeepHint.value = true
    setTimeout(() => { showDeepHint.value = false }, 1800)
    return
  }
  activeTab.value = tab
  selectedItem.value = null // Закрываем оверлей
}

const openOverlay = (dream:any, payload?: any) => {
  selectedItem.value = dream
  anchorY.value = typeof payload?.y === 'number' ? Math.max(0, Math.round(payload.y)) : null
}
const closeOverlay = () => {
  selectedItem.value = null
  anchorY.value = null
}
</script>

<style scoped>
/* Тематические бейджи и кнопки: слегка темнее на светлой теме и слегка светлее на тёмной */
select { -webkit-appearance: auto; appearance: auto; }

/* Новые стили для переключателя табов */
.tab-switcher-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
}

.tab-switcher {
  position: relative;
  display: flex;
  background: rgba(255, 255, 255, 0.06); /* Чуть более заметный фон */
  background: var(--tg-theme-secondary-bg-color, rgba(255, 255, 255, 0.06));
  border-radius: 100px;
  padding: 4px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12); /* Яркая граница для видимости на черном */
}

.tab-btn {
  position: relative;
  flex: 1;
  background: transparent !important;
  border: none;
  padding: 10px 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--tg-theme-hint-color, rgba(255, 255, 255, 0.45));
  z-index: 2;
  transition: color 0.3s ease;
  border-radius: 100px;
}

.tab-btn.is-active {
  color: var(--tg-theme-text-color, #ffffff);
}

.tab-btn.is-locked {
  opacity: 0.4;
}

.tab-active-pill {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  /* Используем белый цвет с более высокой прозрачностью для лучшей видимости */
  background: rgba(255, 255, 255, 0.18); 
  border-radius: 100px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}

/* На темной теме Telegram (или если переменная слишком темная) делаем подложку активнее */
@media (prefers-color-scheme: dark) {
  .tab-active-pill {
    background: rgba(255, 255, 255, 0.22);
  }
  .tab-switcher {
    border-color: rgba(255, 255, 255, 0.15);
  }
}

.lock-ico-small {
  width: 12px;
  height: 12px;
  display: inline-block;
  background-color: currentColor;
  opacity: 0.6;
  -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="black" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z"/></svg>') no-repeat center / contain;
          mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="black" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z"/></svg>') no-repeat center / contain;
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