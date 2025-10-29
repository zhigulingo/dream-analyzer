<template>
  <div>
    <!-- Табы для переключения режима -->
    <div class="flex items-center gap-8 mb-6 border-b" style="border-color: var(--tg-theme-hint-color, rgba(255,255,255,0.1))">
      <button
        @click="switchTab('history')"
        class="relative pb-3 text-lg font-semibold transition-all duration-200"
        :class="[
          activeTab === 'history' 
            ? 'tab-active' 
            : 'tab-inactive'
        ]"
      >
        Дневник снов
        <div
          v-if="activeTab === 'history'"
          class="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
          style="background-color: var(--tg-theme-text-color, #ffffff)"
        ></div>
      </button>
      <button
        @click="switchTab('deep')"
        class="relative pb-3 text-lg font-semibold transition-all duration-200"
        :class="[
          activeTab === 'deep' 
            ? 'tab-active' 
            : 'tab-inactive',
          !hasDeepUnlocked ? 'opacity-60' : ''
        ]"
        :aria-disabled="!hasDeepUnlocked"
      >
        <span class="inline-flex items-center gap-2">
          Глубокий анализ
          <span v-if="!hasDeepUnlocked" class="inline-flex items-center gap-1 text-sm"
                :style="{ color: 'var(--tg-theme-hint-color, rgba(255,255,255,0.6))' }">
            <span class="lock-ico"></span>
            <span>5 снов</span>
          </span>
        </span>
        <div
          v-if="activeTab === 'deep'"
          class="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
          style="background-color: var(--tg-theme-text-color, #ffffff)"
        ></div>
      </button>
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
  try {
    const tg = (window as any)?.Telegram?.WebApp
    tg?.BackButton?.onClick?.(() => closeOverlay())
    tg?.BackButton?.show?.()
  } catch {}
}
const closeOverlay = () => {
  try {
    const tg = (window as any)?.Telegram?.WebApp
    tg?.BackButton?.hide?.()
    // offClick без ссылки на исходный коллбек может быть проигнорирован; hide достаточно для UI
  } catch {}
  selectedItem.value = null
  anchorY.value = null
}
</script>

<style scoped>
/* Тематические бейджи и кнопки: слегка темнее на светлой теме и слегка светлее на тёмной */
select { -webkit-appearance: auto; appearance: auto; }

/* Tab styles that adapt to user theme */
.tab-active {
  color: var(--tg-theme-text-color, #ffffff);
}
.tab-inactive {
  color: var(--tg-theme-hint-color, rgba(255, 255, 255, 0.4));
}
.tab-inactive:hover {
  color: var(--tg-theme-text-color, rgba(255, 255, 255, 0.6));
  opacity: 0.8;
}

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

/* Иконка замка через CSS mask, цвет берём из var(--tg-theme-text-color) с пониженной непрозрачностью */
.lock-ico { width: 14px; height: 14px; display: inline-block; background-color: var(--tg-theme-text-color, #fff); opacity: 0.7;
  -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="black" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z"/></svg>') no-repeat center / contain;
          mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="black" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z"/></svg>') no-repeat center / contain; }

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