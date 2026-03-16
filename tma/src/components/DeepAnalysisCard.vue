<template>
  <article
    class="deep-analysis-card relative rounded-2xl text-white overflow-hidden transition-all cursor-pointer"
    :class="[isOpen ? 'pb-20' : 'min-h-[9rem]']"
    role="button"
    :aria-expanded="isOpen"
    aria-label="Запросить глубокий анализ"
    @click="toggle"
  >
    <!-- Subtle background gradient -->
    <div class="card-bg-gradient" aria-hidden="true"></div>

    <div class="relative px-6 md:px-10 pt-6 pb-3">
      <!-- Header row -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1">
          <div class="card-badge">🔮 Глубокий анализ</div>
          <p class="mt-2 card-summary">ИИ проанализирует паттерны из твоих последних снов и найдёт, что скрывает подсознание.</p>
        </div>
        <!-- Chevron indicator -->
        <div class="card-chevron" :class="{ 'card-chevron--open': isOpen }" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      <!-- Divider (visible when open) -->
      <div v-if="isOpen" class="card-divider mt-4"></div>

      <!-- Detail section (visible when open) -->
      <Transition name="details-fade">
        <div v-if="isOpen" class="mt-3 space-y-3">
          <div class="card-detail-item">
            <span class="card-section-badge">01</span>
            <div>
              <div class="card-detail-label">Анализирует последние 5 снов</div>
              <div class="card-detail-desc">Выявляет повторяющиеся образы, символы и эмоциональные паттерны</div>
            </div>
          </div>
          <div class="card-divider-thin"></div>
          <div class="card-detail-item">
            <span class="card-section-badge">02</span>
            <div>
              <div class="card-detail-label">Психологическая интерпретация</div>
              <div class="card-detail-desc">Глубокий разбор с отсылками к юнгианскому архетипическому анализу</div>
            </div>
          </div>
          <div class="card-divider-thin"></div>
          <div class="card-detail-item">
            <span class="card-section-badge">03</span>
            <div>
              <div class="card-detail-label">Персональный отчёт</div>
              <div class="card-detail-desc">Развёрнутый текст с выводами и рекомендациями — только для тебя</div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Status messages -->
      <div v-if="userStore?.isInitiatingDeepPayment" class="mt-4">
        <LoadingSpinner size="xs" variant="white" label="Создаем счёт..." />
      </div>
      <div v-if="userStore?.deepAnalysisProcessing" class="mt-4 card-status card-status--info">
        <LoadingSpinner size="xs" variant="white" />
        <span class="leading-snug">Анализ запущен! Бот пришлёт уведомление, когда всё будет готово. Обычно — 1–2 минуты.</span>
      </div>
      <div v-else-if="userStore?.deepAnalysisError" class="mt-4 card-status card-status--error">
        😔 Что-то пошло не так: {{ userStore.deepAnalysisError }}. Попробуй ещё раз.
      </div>
      <div v-else-if="userStore?.deepAnalysisSuccess" class="mt-4 card-status card-status--success">
        <span>✨</span>
        <span>Глубокий анализ готов! Загляни во вкладку «Глубокий анализ» ниже.</span>
      </div>
    </div>

    <!-- CTA Button -->
    <div
      class="absolute left-4 right-4 transition-all duration-300"
      :class="isOpen && userStore?.canAttemptDeepAnalysis ? 'bottom-4 opacity-100' : '-bottom-24 opacity-0 pointer-events-none'"
    >
      <button
        class="w-full card-cta-btn"
        @click.stop="requestAnalysis"
      >
        {{ ((userStore?.profile?.deep_analysis_credits || 0) > 0) || ((userStore?.profile?.free_deep_analysis || 0) > 0) ? 'Выполнить анализ' : 'Получить анализ (1 ⭐️)' }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const props = defineProps(['userStore'])

const isOpen = ref(false)

// Прогресс анализа
const analysisProgress = ref(0)
const currentStep = ref(0)
const analysisSteps = ref([
  { title: 'Сбор данных', description: 'Получение последних 5 снов', duration: '2-3 сек' },
  { title: 'Анализ паттернов', description: 'Поиск повторяющихся тем', duration: '8-12 сек' },
  { title: 'Глубокая интерпретация', description: 'Психологический анализ', duration: '10-15 сек' },
  { title: 'Формирование отчета', description: 'Создание персонального анализа', duration: '3-5 сек' }
])

watch(() => props.userStore?.isDoingDeepAnalysis, (isAnalyzing) => {
  if (isAnalyzing) {
    analysisProgress.value = 0
    currentStep.value = 0
    simulateProgress()
  } else {
    setTimeout(() => {
      analysisProgress.value = 0
      currentStep.value = 0
      analysisSteps.value.forEach(s => (s as any).status = 'pending')
    }, 2000)
  }
})

const simulateProgress = () => {
  const updateProgress = (step: number, progress: number) => {
    currentStep.value = step
    analysisProgress.value = progress
    analysisSteps.value.forEach((s: any, index: number) => {
      if (index < step) s.status = 'completed'
      else if (index === step) s.status = 'loading'
      else s.status = 'pending'
    })
  }
  setTimeout(() => updateProgress(0, 15), 500)
  setTimeout(() => updateProgress(1, 35), 2000)
  setTimeout(() => updateProgress(2, 65), 5000)
  setTimeout(() => updateProgress(3, 90), 12000)
}

const toggle = () => {
  isOpen.value = !isOpen.value
  if ((window as any).triggerHaptic) (window as any).triggerHaptic('light')
}

const requestAnalysis = () => {
  if (props.userStore?.canAttemptDeepAnalysis) {
    if ((window as any).triggerHaptic) (window as any).triggerHaptic('medium')
    if ((props.userStore?.profile?.deep_analysis_credits || 0) > 0 || (props.userStore?.profile?.free_deep_analysis || 0) > 0) {
      props.userStore.performDeepAnalysis()
    } else {
      props.userStore.initiateDeepAnalysisPayment()
    }
  }
}
</script>

<style scoped>
/* Card container */
.deep-analysis-card {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.10);
}

/* Layered gradient background — subtle, doesn't fight readability */
.card-bg-gradient {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(ellipse at 10% 0%, rgba(180, 80, 255, 0.45) 0%, transparent 60%),
    linear-gradient(145deg, #7B2FFF 0%, #A020F0 45%, #C03AFF 100%);
  z-index: 0;
}

/* All direct children need relative + z-index to sit above gradient */
.deep-analysis-card > * {
  position: relative;
  z-index: 1;
}

/* Header badge */
.card-badge {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #fff;
}

/* Summary text */
.card-summary {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.82);
}

/* Chevron toggle */
.card-chevron {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
  transition: transform 0.3s cubic-bezier(0.32, 0, 0.08, 1), background 0.2s;
  margin-top: 2px;
}
.card-chevron--open {
  transform: rotate(180deg);
  background: rgba(255, 255, 255, 0.2);
}

/* Glass divider */
.card-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 1px;
}
.card-divider-thin {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin-left: 36px; /* indent to align with content, not badge */
}

/* Section detail items */
.card-detail-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.card-section-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  margin-top: 1px;
}

.card-detail-label {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  line-height: 1.4;
}

.card-detail-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.4;
  margin-top: 1px;
}

/* Status messages */
.card-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
}
.card-status--info   { background: rgba(96, 165, 250, 0.18); border: 1px solid rgba(96, 165, 250, 0.25); }
.card-status--error  { background: rgba(248, 113, 113, 0.18); border: 1px solid rgba(248, 113, 113, 0.25); color: rgba(255,255,255,0.9); }
.card-status--success {
  background: rgba(52, 211, 153, 0.18);
  border: 1px solid rgba(52, 211, 153, 0.25);
}

/* CTA button */
.card-cta-btn {
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
  border-radius: 14px;
  padding: 13px 16px;
  font-size: 15px;
  font-weight: 600;
  width: 100%;
  transition: background 0.15s ease, transform 0.1s ease;
  cursor: pointer;
}
.card-cta-btn:active {
  background: rgba(255, 255, 255, 0.32);
  transform: scale(0.98);
}

/* Animate details section */
.details-fade-enter-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.32, 0, 0.08, 1);
}
.details-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.details-fade-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.details-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
