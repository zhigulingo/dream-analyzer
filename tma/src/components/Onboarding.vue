<template>
  <div v-if="visible" class="onboarding-overlay opaque">
    <!-- Первый онбординг: вертикальный Swiper -->
    <Swiper
      v-if="isNewFlow"
      :modules="modules"
      direction="vertical"
      :spaceBetween="18"
      :slidesOffsetBefore="48"
      :slidesOffsetAfter="48"
      slides-per-view="auto"
      :centeredSlides="true"
      :autoplay="autoplay"
      :keyboard="{ enabled: true }"
      :a11y="{ enabled: true }"
      :observer="true"
      :observe-parents="true"
      :watch-overflow="true"
      @init="onInitNew"
      @slideChange="onSlideChangeNew"
      class="w-full h-full"
    >
      <SwiperSlide class="onboarding-card slidePeek center-card">
        <div class="onboarding-media"><StickerPlayer src="wizard-thining.tgs" :width="220" :height="220" /></div>
        <div class="onboarding-body">
          <h2 class="headline centered">Сюжеты снов часто отражают эмоции,<br/>а не реальные события.</h2>
        </div>
      </SwiperSlide>
      <SwiperSlide class="onboarding-card slidePeek center-card">
        <div class="onboarding-media"><StickerPlayer src="thinking.tgs" :width="220" :height="220" /></div>
        <div class="onboarding-body">
          <h2 class="headline centered">DreamsTalk поможет сохранить<br/>и исследовать сны, чтобы лучше<br/>понимать себя и свои эмоции.</h2>
        </div>
      </SwiperSlide>
      <SwiperSlide class="onboarding-card slidePeek center-card">
        <div class="onboarding-media"><StickerPlayer src="chat.tgs" :width="220" :height="220" /></div>
        <div class="onboarding-body">
          <h2 class="headline centered">Чтобы описать сон — просто отправь его в чат.</h2>
        </div>
      </SwiperSlide>
      <SwiperSlide class="onboarding-card slidePeek center-card">
        <div class="onboarding-media"><StickerPlayer src="telegram-star.tgs" :width="220" :height="220" /></div>
        <div class="onboarding-body">
          <h2 class="headline centered">Получи первый токен для анализа сна<br/>за подписку на канал @TheDreamsHub</h2>
        </div>
      </SwiperSlide>
    </Swiper>

    <!-- Промежуточный экран: токен получен, анализа ещё нет (после первого онбординга) -->
    <Swiper
      v-if="isPostClaimFlow"
      :modules="modules"
      direction="vertical"
      :spaceBetween="18"
      :slidesOffsetBefore="48"
      :slidesOffsetAfter="48"
      slides-per-view="auto"
      :centeredSlides="true"
      :keyboard="{ enabled: true }"
      :a11y="{ enabled: true }"
      :observer="true"
      :observe-parents="true"
      :watch-overflow="true"
      @init="onInitPostClaim"
      @slideChange="onSlideChangePostClaim"
      class="w-full h-full"
    >
      <SwiperSlide class="onboarding-card slidePeek center-card">
        <div class="onboarding-media"><StickerPlayer src="chat.tgs" :width="220" :height="220" /></div>
        <div class="onboarding-body">
          <h2 class="headline centered">Чтобы описать сон — просто отправь его в чат.</h2>
        </div>
      </SwiperSlide>
    </Swiper>

    <!-- Второй онбординг: вертикальный Swiper -->
    <Swiper
      v-if="isFreeFlow"
      :modules="modules"
      direction="vertical"
      :spaceBetween="18"
      :slidesOffsetBefore="48"
      :slidesOffsetAfter="48"
      slides-per-view="auto"
      :centeredSlides="true"
      :autoplay="autoplay"
      :keyboard="{ enabled: true }"
      :a11y="{ enabled: true }"
      :observer="true"
      :observe-parents="true"
      :watch-overflow="true"
      @init="onInitFree"
      @slideChange="onSlideChangeFree"
      class="w-full h-full"
    >
      <SwiperSlide class="onboarding-card slidePeek center-card">
        <div class="onboarding-media"><StickerPlayer src="wizard-thining.tgs" :width="220" :height="220" /></div>
        <div class="onboarding-body">
          <h2 class="headline centered">Ура! Твой первый сон проанализирован</h2>
        </div>
      </SwiperSlide>
      <SwiperSlide class="onboarding-card slidePeek center-card">
        <div class="onboarding-header">
          <h2 class="title">Удобный доступ</h2>
          <p class="subtitle"></p>
        </div>
        <div class="onboarding-media"><img :src="frame1" alt="onboarding-2" style="max-width: 320px; width: 100%; border-radius: 12px;" /></div>
        <div class="onboarding-body"></div>
      </SwiperSlide>
      <SwiperSlide class="onboarding-card slidePeek center-card">
        <div class="onboarding-header">
          <h2 class="title">Полезные факты</h2>
          <p class="subtitle"></p>
        </div>
        <div class="onboarding-media">
          <img :src="frame2" alt="onboarding-3" style="max-width: 320px; width: 100%; border-radius: 12px;" />
        </div>
        <div class="onboarding-body"></div>
      </SwiperSlide>
      <SwiperSlide class="onboarding-card slidePeek center-card">
        <div class="onboarding-media media-overlay">
          <img :src="frame3" alt="onboarding-4" style="max-width: 320px; width: 100%; border-radius: 12px;" />
          <div class="overlay-stack">
            <div class="overlay-title">История снов</div>
            <div class="overlay-subtitle">и анализ</div>
          </div>
        </div>
        <div class="onboarding-body"></div>
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, A11y, Keyboard } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/autoplay'
import { useUserStore } from '@/stores/user.js'
import api from '@/services/api.js'
import StickerPlayer from '@/components/StickerPlayer.vue'
const frame1 = new URL('../../stickers/Onboarding Frame-1.png', import.meta.url).href
const frame2 = new URL('../../stickers/Onboarding Frame-2.png', import.meta.url).href
const frame3 = new URL('../../stickers/Onboarding Frame-3.png', import.meta.url).href

const modules = [Autoplay, A11y, Keyboard]
const autoplay = { delay: 8000, disableOnInteraction: false, stopOnLastSlide: true }
const tg = computed(() => (typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null))
const emit = defineEmits<{ (e: 'visible-change', value: boolean): void }>()
const userStore = useUserStore()

// Local one-time flags
const NEW_DONE_KEY = 'onboarding_new_done'
const FREE_DONE_KEY = 'onboarding_free_done'

// Which flow and step (4 screens per flow per spec)
const flow = ref<'none' | 'new' | 'post_claim' | 'free'>('none')
const step = ref<number>(1) // 1..4

// Derived visibility
const visible = computed(() => flow.value !== 'none')
const isNewFlow = computed(() => flow.value === 'new')
const isFreeFlow = computed(() => flow.value === 'free')
const isPostClaimFlow = computed(() => flow.value === 'post_claim')
// классы смещения больше не используются (Swiper управляет)

const hasNewFlowEligibility = computed(() => {
  if (!userStore?.profile) return false
  const s = (userStore.profile.subscription_type || '').toLowerCase()
  return s === 'onboarding1'
})

// Второй онбординг показываем, когда у пользователя уже есть первый проанализированный сон
const hasFreeFlowEligibility = computed(() => {
  const s = (userStore.profile?.subscription_type || '').toLowerCase()
  return s === 'onboarding2'
})

// Промежуточный экран больше не используется — логика этапов строго по subscription_type

// Initialize flow when profile/history are available
const initFlow = () => {
  if (hasFreeFlowEligibility.value) {
    flow.value = 'free'
    step.value = 1
  } else if (hasNewFlowEligibility.value) {
    // Если пользователь уже получил токен, но ещё не сделал анализ → показываем промежуточный экран
    const claimed = !!userStore.profile?.channel_reward_claimed
    const hasAnalyses = (userStore.profile?.total_dreams_count || userStore.history?.length || 0) > 0
    if (claimed && !hasAnalyses) {
      flow.value = 'post_claim'
      step.value = 1
      return
    }
    flow.value = 'new'
    step.value = 1
  } else {
    flow.value = 'none'
  }
}

watch(
  () => [userStore.profile?.channel_reward_claimed, userStore.history?.length, userStore.profile?.subscription_type],
  () => initFlow(),
  { immediate: true }
)

// Синхронизируем видимость онбординга с верхним уровнем (App.vue)
watch(visible, (v) => {
  emit('visible-change', v)
  if (!v) {
    // При скрытии онбординга гарантированно прячем MainButton Telegram
    clearMainButton()
  }
}, { immediate: true })

// MainButton management
const clearMainButton = () => {
  try {
    const t = tg.value
    if (t?.MainButton) {
      t.MainButton.hide()
      t.MainButton.offClick(handleMainButtonClick)
    }
  } catch (_) {}
}

const setMainButton = (text: string, handler: () => void) => {
  const t = tg.value
  if (!t?.MainButton) return
  t.MainButton.setParams({
    text,
    color: t.themeParams?.button_color || '#2481CC',
    text_color: t.themeParams?.button_text_color || '#ffffff',
    is_active: true,
    is_visible: true,
  })
  t.MainButton.offClick(handleMainButtonClick)
  t.MainButton.onClick(handleMainButtonClick)
  mainButtonHandler.value = handler
  try { t.MainButton.show() } catch (_) {}
}

const mainButtonHandler = ref<() => void>(() => {})
const handleMainButtonClick = () => {
  try { mainButtonHandler.value?.() } catch (e) { console.error(e) }
}
// Инициализация peeking масштаба при загрузке свипера
const initScale = (swiper: any) => {
  try {
    const slides = swiper?.slides || []
    slides.forEach((el: HTMLElement, idx: number) => {
      const isActive = idx === (swiper?.activeIndex || 0)
      el.style.transform = isActive ? 'scale(1.0)' : 'scale(0.92)'
      el.style.transition = 'transform .25s ease'
    })
  } catch (_) {}
}
const onInitNew = (swiper:any) => initScale(swiper)
const onInitFree = (swiper:any) => initScale(swiper)
const onInitPostClaim = (swiper:any) => initScale(swiper)

// Гарантируем кнопку на первом кадре post_claim сразу после init
watch(isPostClaimFlow, (v) => {
  if (v) {
    try {
      setMainButton('Написать сон', () => {
        api.trackOnboarding('post_claim_open_chat_click')
        try { tg.value?.close(); } catch (_) {}
        clearMainButton()
      })
    } catch (_) {}
  }
})

// Автоперелистывание управляет Swiper Autoplay; ручной таймер не нужен

onMounted(() => {})

onBeforeUnmount(() => {
  clearMainButton()
})

// drag-логика упразднена — ею управляет Swiper

const goToCommunity = () => {
  const url = 'https://t.me/thedreamshub'
  try { localStorage.setItem('visited_channel', '1') } catch (_) {}
  try { if (tg.value?.openLink) { tg.value.openLink(url); return } } catch(_) {}
  try { if (tg.value?.openTelegramLink) { tg.value.openTelegramLink(url); return } } catch(_) {}
  window.open(url, '_blank')
}

//

const verifySubscription = async () => {
  api.trackOnboarding('onboarding1_step4_verify_click')
  await userStore.claimChannelReward()
  // Если награда уже была получена ранее — просто сообщаем и закрываем онбординг
  if (userStore.rewardAlreadyClaimed) {
    userStore.notificationStore?.info('Награда уже получена. Отправьте свой сон в чате с ботом.')
    api.trackOnboarding('onboarding1_reward_already')
    flow.value = 'none'
    emit('visible-change', false)
    try { tg.value?.close() } catch (_) {}
    return
  }
  // Если возникла ошибка (часто это отсутствие подписки) — оставляем возможность перейти в канал
  if (userStore.claimRewardError) {
    userStore.notificationStore?.warning(userStore.claimRewardError || 'Не удалось подтвердить подписку.')
    api.trackOnboarding('onboarding1_verify_failed', { reason: userStore.claimRewardError })
    return
  }
  try { /* stage остаётся onboarding1; переход в onboarding2 выполнит бэкенд после первого анализа */ } catch (_) {}
  // Успех: сообщаем и закрываем онбординг
  userStore.notificationStore?.success('Подписка подтверждена! Теперь отправьте свой сон в чате с ботом.')
  api.trackOnboarding('onboarding1_reward_granted')
  flow.value = 'none'
  emit('visible-change', false)
  try { tg.value?.close() } catch (_) {}
}

// drag-логика упразднена — ею управляет Swiper

const completeFree = async () => {
  try {
    // 1) Просим сервер перевести в stage3/free
    await api.setOnboardingStage('stage3');
    // 2) Сразу закрываем онбординг, чтобы не блокировать UI
    flow.value = 'none'
    emit('visible-change', false)
    clearMainButton()
    // 3) Обновляем профиль в фоне (без блокировки интерфейса)
    try { await userStore.fetchProfile() } catch (_) {}
    userStore.profile.onboarding_stage = 'stage3';
  } catch (_) {}
}

// Кнопка шага 4 второго онбординга — открыть историю
const openHistory = async () => {
  await completeFree()
  // В этом приложении история — основной экран; просто закрываем онбординг.
}

// Swiper callbacks: управление MainButton и синхронизацией шага
const onSlideChangeNew = async (swiper: any) => {
  step.value = (swiper?.activeIndex || 0) + 1
  try {
    const slides = swiper?.slides || []
    slides.forEach((el: HTMLElement, idx: number) => {
      const isActive = idx === swiper.activeIndex
      el.style.transform = isActive ? 'scale(1.0)' : 'scale(0.92)'
      el.style.transition = 'transform .25s ease'
    })
  } catch (_) {}
  if (step.value === 4) {
    // Автоматически пробуем подтвердить подписку/начислить токен
    clearMainButton()
    api.trackOnboarding('onboarding1_step4_enter')
    // Пытаемся автоматически подтвердить подписку и начислить токен
    try {
      await verifySubscription()
      try { await userStore.fetchProfile() } catch (_) {}
    } catch (_) {}
    // После попытки показываем релевантную кнопку
    if (userStore.profile?.channel_reward_claimed) {
      setMainButton('Открыть чат', () => { try { tg.value?.close?.() } catch (_) {} })
    } else {
      const visited = (()=>{ try { return localStorage.getItem('visited_channel') === '1' } catch(_) { return false } })()
      if (visited) {
        setMainButton('Проверить подписку', async () => {
          await verifySubscription();
          try { await userStore.fetchProfile() } catch (_) {}
          if (userStore.profile?.channel_reward_claimed) {
            try { tg.value?.close?.() } catch (_) {}
          }
        })
      } else {
        api.trackOnboarding('onboarding1_step4_need_subscribe')
        setMainButton('Перейти и подписаться', goToCommunity)
      }
    }
  }
  else clearMainButton()
}
const onSlideChangeFree = async (swiper: any) => {
  step.value = (swiper?.activeIndex || 0) + 1
  try {
    const slides = swiper?.slides || []
    slides.forEach((el: HTMLElement, idx: number) => {
      const isActive = idx === swiper.activeIndex
      el.style.transform = isActive ? 'scale(1.0)' : 'scale(0.92)'
      el.style.transition = 'transform .25s ease'
    })
  } catch (_) {}
  if (step.value === 4) setMainButton('Открыть историю', async () => {
    api.trackOnboarding('onboarding2_step4_open_history_click')
    await openHistory();
    try { await userStore.fetchProfile() } catch (_) {}
  })
  else clearMainButton()
}

const onSlideChangePostClaim = async (swiper: any) => {
  step.value = (swiper?.activeIndex || 0) + 1
  try {
    const slides = swiper?.slides || []
    slides.forEach((el: HTMLElement, idx: number) => {
      const isActive = idx === swiper.activeIndex
      el.style.transform = isActive ? 'scale(1.0)' : 'scale(0.92)'
      el.style.transition = 'transform .25s ease'
    })
  } catch (_) {}
  if (step.value === 1) {
    setMainButton('Написать сон', () => {
      api.trackOnboarding('post_claim_open_chat_click')
      try { tg.value?.close?.(); } catch (_) {}
      clearMainButton()
    })
  } else {
    clearMainButton()
  }
}

// Content per flow/step
const currentTitle = computed(() => {
  if (flow.value === 'new') {
    if (step.value === 1) return 'Добро пожаловать в Dream Analyzer'
    if (step.value === 2) return 'Получите стартовый токен'
    if (step.value === 3) return 'Как использовать токен'
    return 'Завершите шаг'
  }
  if (flow.value === 'free') return ''
  return ''
})

const currentSubtitle = computed(() => {
  if (flow.value === 'new') {
    if (step.value === 1) return 'Как это работает и с чего начать'
    if (step.value === 2) return 'Подпишитесь на канал — и мы начислим 1 токен'
    if (step.value === 3) return 'Отправьте сон боту — получите анализ'
    return 'Нажмите — чтобы завершить шаг'
  }
  if (flow.value === 'free') return ''
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
    clearMainButton()
    api.trackOnboarding('onboarding_closed', { subscription: sub, stage })
  }
})

// Автопереход в onboarding2: если уже есть хотя бы один анализ, а статус ещё onboarding1 — переводим на сервере
watch(() => [userStore.history?.length, userStore.profile?.subscription_type], async ([len, sub]) => {
  try {
    if ((Number(len) || 0) > 0 && String(sub || '').toLowerCase() === 'onboarding1') {
      api.trackOnboarding('auto_transition_to_onboarding2')
      await api.setOnboardingStage('stage2')
      try { await userStore.fetchProfile() } catch (_) {}
    }
  } catch (_) {}
})
</script>

<style scoped>
.onboarding-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: stretch;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.onboarding-card {
  width: 100%;
  max-width: 560px;
  /* Градиент как у карточек фактов */
  background: linear-gradient(135deg, #6A4DFF 0%, #9A3CFF 100%);
  border-radius: 16px;
  padding: 20px 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
}
.center-card { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; }
/* Карточка чуть меньше экрана для peeking; контент вертикально выстроен */
.slidePeek {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 72vh;
  max-height: 72vh;
}
.card-absolute { position: absolute; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); transition: transform .25s ease; }
.card-absolute::before, .card-absolute::after { content: ''; position: absolute; left: 50%; transform: translateX(-50%); width: 42%; height: 6px; border-radius: 999px; background: rgba(255,255,255,0.10); }
.card-absolute::before { top: -14px; }
.card-absolute::after { bottom: -14px; }
.dragging { transition: none; }
.onboarding-header .title {
  margin: 0 0 4px 0;
  font-size: 22px;
  line-height: 1.25;
}
.onboarding-header .subtitle {
  margin: 0;
  opacity: 0.8;
  font-size: 16px;
}
.onboarding-media { display: flex; justify-content: center; margin: 8px 0; width: 100%; }
.onboarding-body .text {
  margin: 8px 0 0 0;
  font-size: 16px;
  opacity: 0.95;
}
.onboarding-body { width: 100%; display: flex; justify-content: center; }
.headline { font-size: 22px; line-height: 1.28; margin: 12px 0 0 0; color: #fff; text-align: center; }
.centered { text-align: center; }
.media-overlay { position: relative; display: inline-block; }
.overlay-stack { position: absolute; left: 24px; top: 18px; right: 24px; color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,0.55); }
.overlay-title { font-size: 26px; font-weight: 700; line-height: 1.12; }
.overlay-subtitle { font-size: 18px; line-height: 1.12; margin-top: 6px; opacity: 0.95; }
/* Центрирование контента карточек и контроль переполнения текста */
.onboarding-card { display: flex; flex-direction: column; align-items: center; }
.onboarding-header, .onboarding-body, .onboarding-media { max-width: 560px; width: 100%; }
.onboarding-body { padding: 0 8px; }
.onboarding-body .text { word-wrap: break-word; overflow-wrap: anywhere; text-align: center; }
/* Пузырь текста по центру поверх изображения (вторая карточка) */
.overlay-center { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); display: flex; justify-content: center; padding: 0 16px; }
.overlay-bubble { background: rgba(30,30,60,0.85); color: #fff; border-radius: 12px; padding: 12px 14px; font-size: 14px; line-height: 1.25; box-shadow: 0 8px 24px rgba(0,0,0,0.35); max-width: 260px; text-align: left; }
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


