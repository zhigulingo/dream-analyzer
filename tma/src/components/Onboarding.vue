<template>
  <div v-if="visible" class="onboarding-overlay" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
    <!-- Stack 1: first card (Onboarding_new_1) -->
    <div v-show="isNewFlow && step === 1" class="onboarding-card card-absolute" :class="dragClass">
      <div class="onboarding-header">
        <h2 class="title">Добро пожаловать в Dream Analyzer</h2>
        <p class="subtitle">Как это работает и с чего начать</p>
      </div>
      <div class="onboarding-media"><StickerPlayer src="wizard-happy.tgs" :width="220" :height="220" /></div>
      <div class="onboarding-body">
        <p class="text">Приложение помогает осмыслять сны и находить в них повторяющиеся символы.</p>
        <p class="text">Отправьте свой первый сон — получите быстрый анализ ИИ.</p>
      </div>
    </div>

    <!-- Stack 2: second card (Onboarding_new_2) with CTA to subscribe -->
    <div v-show="isNewFlow && step === 2" class="onboarding-card card-absolute">
      <div class="onboarding-header">
        <h2 class="title">Получите стартовый токен</h2>
        <p class="subtitle">Подпишитесь на канал — и мы начислим 1 токен</p>
      </div>
      <div class="onboarding-media"><StickerPlayer src="telegram-star.tgs" :width="220" :height="220" /></div>
      <div class="onboarding-body">
        <p class="text">После подписки нажмите «Проверить подписку» — сразу начислим токен.</p>
      </div>
    </div>

    <!-- Free flow single card -->
    <div v-show="isFreeFlow" class="onboarding-card card-absolute">
      <div class="onboarding-header">
        <h2 class="title">Отлично! Первый анализ готов</h2>
        <p class="subtitle">Теперь доступен весь функционал мини‑приложения</p>
      </div>
      <div class="onboarding-media"><StickerPlayer src="chat.tgs" :width="220" :height="220" /></div>
      <div class="onboarding-body">
        <p class="text">Продолжайте отправлять сны — так AI лучше поймёт ваш контекст.</p>
        <p class="text">Открывайте историю и изучайте теги‑символы.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { useUserStore } from '@/stores/user.js'
import StickerPlayer from '@/components/StickerPlayer.vue'

const tg: any = (window as any).Telegram?.WebApp
const userStore = useUserStore()

// Local one-time flags
const NEW_DONE_KEY = 'onboarding_new_done'
const FREE_DONE_KEY = 'onboarding_free_done'

// Which flow and step
const flow = ref<'none' | 'new' | 'free'>('none')
const step = ref<number>(1)

// Derived visibility
const visible = computed(() => flow.value !== 'none')
const isNewFlow = computed(() => flow.value === 'new')
const isFreeFlow = computed(() => flow.value === 'free')

const hasNewFlowEligibility = computed(() => {
  if (!userStore?.profile) return false
  const alreadyDone = localStorage.getItem(NEW_DONE_KEY) === '1'
  return !alreadyDone && userStore.profile.channel_reward_claimed === false
})

const hasFreeFlowEligibility = computed(() => {
  const alreadyDone = localStorage.getItem(FREE_DONE_KEY) === '1'
  const count = Array.isArray(userStore.history) ? userStore.history.length : 0
  return !alreadyDone && count === 1
})

// Initialize flow when profile/history are available
const initFlow = () => {
  if (hasNewFlowEligibility.value) {
    flow.value = 'new'
    step.value = 1
  } else if (hasFreeFlowEligibility.value) {
    flow.value = 'free'
    step.value = 1
  } else {
    flow.value = 'none'
  }
}

watch(
  () => [userStore.profile?.channel_reward_claimed, userStore.history?.length],
  () => initFlow(),
  { immediate: true }
)

// MainButton management
const clearMainButton = () => {
  try {
    if (tg?.MainButton) {
      tg.MainButton.hide()
      tg.MainButton.offClick(handleMainButtonClick)
    }
  } catch (_) {}
}

const setMainButton = (text: string, handler: () => void) => {
  if (!tg?.MainButton) return
  tg.MainButton.setParams({
    text,
    color: tg.themeParams?.button_color || '#2481CC',
    text_color: tg.themeParams?.button_text_color || '#ffffff',
    is_active: true,
    is_visible: true,
  })
  tg.MainButton.offClick(handleMainButtonClick)
  tg.MainButton.onClick(handleMainButtonClick)
  mainButtonHandler.value = handler
}

const mainButtonHandler = ref<() => void>(() => {})
const handleMainButtonClick = () => {
  try { mainButtonHandler.value?.() } catch (e) { console.error(e) }
}

onMounted(() => {
  // When shown, set up the button
  watchEffect(() => {
    if (!visible.value) {
      clearMainButton()
      return
    }
    // Show MainButton only on last frame per spec
    if (isNewFlow.value) {
      if (step.value === 2) setMainButton('Проверить подписку', verifySubscription)
      else clearMainButton()
    } else if (isFreeFlow.value) {
      setMainButton('Продолжить', completeFree)
    }
  })
})

onBeforeUnmount(() => {
  clearMainButton()
})

// Actions
// Swipe handling: drag up on step 1 reveals step 2
const touchStartY = ref<number | null>(null)
const dragOffset = ref(0)
const dragClass = computed(() => ({ dragging: dragOffset.value !== 0 }))
const onTouchStart = (e: TouchEvent) => {
  if (!isNewFlow.value || step.value !== 1) return
  touchStartY.value = e.touches[0].clientY
  dragOffset.value = 0
}
const onTouchMove = (e: TouchEvent) => {
  if (touchStartY.value == null || !isNewFlow.value || step.value !== 1) return
  const delta = touchStartY.value - e.touches[0].clientY
  dragOffset.value = Math.max(0, delta)
}
const onTouchEnd = () => {
  if (!isNewFlow.value || step.value !== 1) { touchStartY.value = null; dragOffset.value = 0; return }
  // Threshold to switch: 80px
  if (dragOffset.value > 80) {
    step.value = 2
  }
  touchStartY.value = null
  dragOffset.value = 0
}

const verifySubscription = async () => {
  await userStore.claimChannelReward()
  if (userStore.claimRewardError) {
    // stay on step 2, show notification through notification store
    return
  }
  // Success
  localStorage.setItem(NEW_DONE_KEY, '1')
  flow.value = 'none'
}

const completeFree = () => {
  localStorage.setItem(FREE_DONE_KEY, '1')
  flow.value = 'none'
}

// Content per flow/step
const currentTitle = computed(() => {
  if (flow.value === 'new') {
    return step.value === 1 ? 'Добро пожаловать в Dream Analyzer' : 'Получите стартовый токен'
  }
  if (flow.value === 'free') {
    return 'Отлично! Первый анализ готов'
  }
  return ''
})

const currentSubtitle = computed(() => {
  if (flow.value === 'new') {
    return step.value === 1 ? 'Как это работает и с чего начать' : 'Подпишитесь на канал — и мы начислим 1 токен'
  }
  if (flow.value === 'free') {
    return 'Теперь доступен весь функционал мини‑приложения'
  }
  return ''
})

const currentParagraphs = computed(() => {
  if (flow.value === 'new') {
    if (step.value === 1) {
      return [
        'Приложение помогает осмыслять сны и находить в них повторяющиеся символы.',
        'Отправьте свой первый сон — получите быстрый анализ ИИ.',
      ]
    }
    return [
      'Подписка на наш канал — это стартовый бонус: мы начислим 1 токен.',
      'После этого можно сразу отправить свой первый сон в чат с ботом.',
    ]
  }
  if (flow.value === 'free') {
    return [
      'Вы получили базовый доступ. Продолжайте отправлять сны — так AI лучше поймёт ваш контекст.',
      'Открывайте историю и изучайте теги‑символы.',
    ]
  }
  return []
})

const currentSticker = computed(() => {
  if (flow.value === 'new') {
    // Onboarding_new_1, Onboarding_new_2
    return step.value === 1 ? 'wizard-happy.tgs' : 'telegram-star.tgs'
  }
  if (flow.value === 'free') {
    // Onboarding_free_1
    return 'chat.tgs'
  }
  return 'thinking.tgs'
})

const primaryAction = computed(() => {
  if (flow.value === 'new') {
    if (step.value === 2) return { label: 'Проверить подписку', handler: verifySubscription }
    return null as any
  }
  if (flow.value === 'free') {
    return { label: 'Продолжить', handler: completeFree }
  }
  return null as any
})

const secondaryAction = computed(() => {
  // No secondary actions in new flow per Figma; swipes control step
  return null as any
})

// If profile turns claimed externally, auto-complete
watch(() => userStore.profile?.channel_reward_claimed, (val) => {
  if (flow.value === 'new' && val) {
    localStorage.setItem(NEW_DONE_KEY, '1')
    flow.value = 'none'
  }
})
</script>

<style scoped>
.onboarding-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.onboarding-card {
  width: 100%;
  max-width: 560px;
  background: var(--tg-theme-secondary-bg-color, #0c110c);
  border-radius: 16px;
  padding: 20px 16px 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
}
.card-absolute { position: absolute; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); }
.dragging { transition: none; }
.onboarding-header .title {
  margin: 0 0 4px 0;
  font-size: 20px;
}
.onboarding-header .subtitle {
  margin: 0;
  opacity: 0.8;
}
.onboarding-media {
  display: flex;
  justify-content: center;
  margin: 16px 0 8px 0;
}
.onboarding-body .text {
  margin: 8px 0 0 0;
  font-size: 14px;
  opacity: 0.95;
}
.onboarding-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.btn-primary, .btn-secondary {
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
}
.btn-primary {
  background: var(--tg-theme-button-color, #366832);
  color: var(--tg-theme-button-text-color, #fff);
}
.btn-secondary {
  background: rgba(255,255,255,0.08);
  color: var(--tg-theme-text-color, #fff);
}
</style>


