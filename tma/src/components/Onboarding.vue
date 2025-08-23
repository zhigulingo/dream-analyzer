<template>
  <div v-if="visible" class="onboarding-overlay">
    <div class="onboarding-card">
      <div class="onboarding-header">
        <h2 class="title">{{ currentTitle }}</h2>
        <p class="subtitle" v-if="currentSubtitle">{{ currentSubtitle }}</p>
      </div>

      <div class="onboarding-media">
        <StickerPlayer :src="currentSticker" :width="220" :height="220" />
      </div>

      <div class="onboarding-body">
        <p class="text" v-for="(p, i) in currentParagraphs" :key="i">{{ p }}</p>
      </div>

      <div class="onboarding-actions">
        <button v-if="secondaryAction" class="btn-secondary" @click="secondaryAction.handler">{{ secondaryAction.label }}</button>
        <button v-if="primaryAction" class="btn-primary" @click="primaryAction.handler">{{ primaryAction.label }}</button>
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
    // Configure per step
    if (flow.value === 'new') {
      if (step.value === 1) {
        setMainButton('Перейти и подписаться', goSubscribe)
      } else if (step.value === 2) {
        setMainButton('Проверить подписку', verifySubscription)
      }
    } else if (flow.value === 'free') {
      setMainButton('Продолжить', completeFree)
    }
  })
})

onBeforeUnmount(() => {
  clearMainButton()
})

// Actions
const goSubscribe = () => {
  const url = 'https://t.me/thedreamshub'
  if (tg?.openTelegramLink) tg.openTelegramLink(url)
  else window.open(url, '_blank')
  // Move to step 2 to let user verify
  step.value = 2
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
    if (step.value === 1) return { label: 'Перейти и подписаться', handler: goSubscribe }
    return { label: 'Проверить подписку', handler: verifySubscription }
  }
  if (flow.value === 'free') {
    return { label: 'Продолжить', handler: completeFree }
  }
  return null as any
})

const secondaryAction = computed(() => {
  if (flow.value === 'new' && step.value === 2) {
    return { label: 'Назад', handler: () => { step.value = 1 } }
  }
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


