<template>
  <div v-if="visible" class="onboarding-overlay opaque" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
    <!-- Stack 1: Onboarding_new_1 -->
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

    <!-- Stack 2: Onboarding_new_2 (CTA subscribe) -->
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

    <!-- Stack 3: Onboarding_new_3 (tips) -->
    <div v-show="isNewFlow && step === 3" class="onboarding-card card-absolute">
      <div class="onboarding-header">
        <h2 class="title">Как использовать токен</h2>
        <p class="subtitle">Отправьте свой сон боту — получите анализ</p>
      </div>
      <div class="onboarding-media"><StickerPlayer src="thinking.tgs" :width="220" :height="220" /></div>
      <div class="onboarding-body">
        <p class="text">Опишите сон своими словами. Чем детальнее — тем точнее анализ.</p>
        <p class="text">Мы выделим символы и дадим интерпретацию.</p>
      </div>
    </div>

    <!-- Stack 4: Onboarding_new_4 (verify) -->
    <div v-show="isNewFlow && step === 4" class="onboarding-card card-absolute">
      <div class="onboarding-header">
        <h2 class="title">Завершите шаг</h2>
        <p class="subtitle">Нажмите «Проверить подписку», чтобы получить токен</p>
      </div>
      <div class="onboarding-media"><StickerPlayer src="telegram-star.tgs" :width="220" :height="220" /></div>
      <div class="onboarding-body">
        <p class="text">После подтверждения вы сможете отправить первый сон прямо в чат.</p>
      </div>
    </div>

    <!-- Free flow: Onboarding_free_1 -->
    <div v-show="isFreeFlow && step === 1" class="onboarding-card card-absolute">
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

    <!-- Free flow: Onboarding_free_2 (history hint) -->
    <div v-show="isFreeFlow && step === 2" class="onboarding-card card-absolute">
      <div class="onboarding-header">
        <h2 class="title">История снов</h2>
        <p class="subtitle">Возвращайтесь к предыдущим анализам</p>
      </div>
      <div class="onboarding-media"><StickerPlayer src="wizard-happy.tgs" :width="220" :height="220" /></div>
      <div class="onboarding-body">
        <p class="text">Мы сохраняем все ваши сны и выводим ключевые символы.</p>
      </div>
    </div>

    <!-- Free flow: Onboarding_free_3 (tags) -->
    <div v-show="isFreeFlow && step === 3" class="onboarding-card card-absolute">
      <div class="onboarding-header">
        <h2 class="title">Теги‑символы</h2>
        <p class="subtitle">Отслеживайте повторяющиеся темы ваших снов</p>
      </div>
      <div class="onboarding-media"><StickerPlayer src="telegram-star.tgs" :width="220" :height="220" /></div>
      <div class="onboarding-body">
        <p class="text">Мы выделяем символы, чтобы замечать паттерны и инсайты.</p>
      </div>
    </div>

    <!-- Free flow: Onboarding_free_4 (continue) -->
    <div v-show="isFreeFlow && step === 4" class="onboarding-card card-absolute">
      <div class="onboarding-header">
        <h2 class="title">Готово!</h2>
        <p class="subtitle">Нажмите «Продолжить», чтобы открыть интерфейс</p>
      </div>
      <div class="onboarding-media"><StickerPlayer src="chat.tgs" :width="220" :height="220" /></div>
      <div class="onboarding-body">
        <p class="text">Доступна история, профиль и глубокие анализы.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { useUserStore } from '@/stores/user.js'
import api from '@/services/api'
import StickerPlayer from '@/components/StickerPlayer.vue'

const tg: any = (window as any).Telegram?.WebApp
const emit = defineEmits<{ (e: 'visible-change', value: boolean): void }>()
const userStore = useUserStore()

// Local one-time flags
const NEW_DONE_KEY = 'onboarding_new_done'
const FREE_DONE_KEY = 'onboarding_free_done'

// Which flow and step (4 screens per flow per spec)
const flow = ref<'none' | 'new' | 'free'>('none')
const step = ref<number>(1) // 1..4

// Derived visibility
const visible = computed(() => flow.value !== 'none')
const isNewFlow = computed(() => flow.value === 'new')
const isFreeFlow = computed(() => flow.value === 'free')

const hasNewFlowEligibility = computed(() => {
  if (!userStore?.profile) return false
  const s = (userStore.profile.subscription_type || '').toLowerCase()
  return s === 'onboarding1'
})

// Второй онбординг показываем, когда у пользователя уже есть первый проанализированный сон
const hasFreeFlowEligibility = computed(() => {
  const s = (userStore.profile?.subscription_type || '').toLowerCase()
  const count = Array.isArray(userStore.history) ? userStore.history.length : 0
  return (s === 'onboarding1') && count >= 1
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
    // Show MainButton only on final screen of each flow
    if (isNewFlow.value) {
      if (step.value === 4) setMainButton(newFlowButtonLabel.value, handleNewFlowMainButton)
      else clearMainButton()
    } else if (isFreeFlow.value) {
      if (step.value === 4) setMainButton('Открыть историю', openHistory)
      else clearMainButton()
    }
  })
})

onBeforeUnmount(() => {
  clearMainButton()
})

// Actions
// Swipe handling: drag up advances to next step (1→2→3→4)
const touchStartY = ref<number | null>(null)
const dragOffset = ref(0)
const dragClass = computed(() => ({ dragging: dragOffset.value !== 0 }))
const onTouchStart = (e: TouchEvent) => {
  if (!visible.value) return
  touchStartY.value = e.touches[0].clientY
  dragOffset.value = 0
}
const onTouchMove = (e: TouchEvent) => {
  if (touchStartY.value == null || !visible.value) return
  const delta = touchStartY.value - e.touches[0].clientY
  dragOffset.value = Math.max(0, delta)
}
const onTouchEnd = () => {
  if (!visible.value) { touchStartY.value = null; dragOffset.value = 0; return }
  // Threshold to switch: 80px
  if (dragOffset.value > 80) {
    step.value = Math.min(4, step.value + 1)
  }
  touchStartY.value = null
  dragOffset.value = 0
}

const goToCommunity = () => {
  const url = 'https://t.me/thedreamshub'
  if (tg?.openTelegramLink) tg.openTelegramLink(url)
  else window.open(url, '_blank')
}

const verifySubscription = async () => {
  await userStore.claimChannelReward()
  if (userStore.claimRewardError) {
    return
  }
  try { await api.setOnboardingStage('stage2'); userStore.profile.onboarding_stage = 'stage2'; userStore.profile.subscription_type = 'onboarding2' } catch (_) {}
  // Показать сообщение "Теперь отправьте сон в чате"
  userStore.notificationStore?.success('Подписка подтверждена! Теперь отправьте свой сон в чате с ботом.')
  flow.value = 'none'
  emit('visible-change', false)
}

// На шаге 4 в первом онбординге: если уже подписан — "Получить токен", иначе — "Перейти и подписаться"
const subscriptionChecked = ref(false)
const subscribedByCheck = ref(false)
const newFlowButtonLabel = computed(() => (subscriptionChecked.value && subscribedByCheck.value ? 'Получить токен' : 'Перейти и подписаться'))
const handleNewFlowMainButton = async () => {
  if (subscriptionChecked.value && subscribedByCheck.value) {
    await verifySubscription()
  } else {
    goToCommunity()
  }
}

const completeFree = async () => {
  try {
    await api.setOnboardingStage('stage3');
    userStore.profile.onboarding_stage = 'stage3';
    if ((userStore.profile.subscription_type || '').toLowerCase().startsWith('onboarding')) {
      userStore.profile.subscription_type = 'free';
    }
  } catch (_) {}
  flow.value = 'none'
  emit('visible-change', false)
}

// Кнопка шага 4 второго онбординга — открыть историю
const openHistory = async () => {
  await completeFree()
  // В этом приложении история — основной экран; просто закрываем онбординг.
}

// Content per flow/step
const currentTitle = computed(() => {
  if (flow.value === 'new') {
    if (step.value === 1) return 'Добро пожаловать в Dream Analyzer'
    if (step.value === 2) return 'Получите стартовый токен'
    if (step.value === 3) return 'Как использовать токен'
    return 'Завершите шаг'
  }
  if (flow.value === 'free') {
    return 'Отлично! Первый анализ готов'
  }
  return ''
})

const currentSubtitle = computed(() => {
  if (flow.value === 'new') {
    if (step.value === 1) return 'Как это работает и с чего начать'
    if (step.value === 2) return 'Подпишитесь на канал — и мы начислим 1 токен'
    if (step.value === 3) return 'Отправьте сон боту — получите анализ'
    return 'Нажмите — чтобы завершить шаг'
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
    if (step.value === 1) return { label: 'Перейти и подписаться', handler: goToCommunity }
    if (step.value === 4) return { label: 'Проверить подписку', handler: verifySubscription }
    return null as any
  }
  if (flow.value === 'free') {
    if (step.value === 4) return { label: 'Продолжить', handler: completeFree }
    return null as any
  }
  return null as any
})

const secondaryAction = computed(() => {
  // No secondary actions in new flow per Figma; swipes control step
  return null as any
})

// If profile turns claimed externally, auto-complete
watch(() => [userStore.profile?.onboarding_stage, userStore.profile?.subscription_type], ([stage, sub]) => {
  const isDone = stage === 'stage3' || (sub && !String(sub).toLowerCase().startsWith('onboarding'))
  if (isDone) {
    flow.value = 'none'
    emit('visible-change', false)
  }
})

// Авто-проверка/начисление на шаге 4 первого онбординга
const attemptedAutoClaim = ref(false)
watchEffect(async () => {
  if (isNewFlow.value && step.value === 4 && !attemptedAutoClaim.value) {
    attemptedAutoClaim.value = true
    try {
      await userStore.claimChannelReward()
      if (!userStore.claimRewardError) {
        // Успешно начислили — остаёмся в первом онбординге, показываем подсказку отправить сон в чат
        userStore.notificationStore?.success('Подписка подтверждена! Вам начислен токен. Отправьте свой сон в чате с ботом.')
        // Не закрываем онбординг; пользователь увидит последний экран и сможет вернуться в чат
        return
      }
      // Если пришла ошибка — считаем, что не подписан (или не удалось проверить)
      subscriptionChecked.value = true
      subscribedByCheck.value = false
    } catch (_) {
      subscriptionChecked.value = true
      subscribedByCheck.value = false
    }
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


