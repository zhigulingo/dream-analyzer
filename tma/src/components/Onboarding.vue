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
        <div class="onboarding-media flex-1 flex items-center justify-center"><img :src="frame1" alt="onboarding-2" style="max-width: 320px; width: 100%; border-radius: 12px;" /></div>
        <div class="onboarding-body"></div>
      </SwiperSlide>
      <SwiperSlide class="onboarding-card slidePeek center-card">
        <div class="onboarding-header">
          <h2 class="title">Полезные факты</h2>
          <p class="subtitle"></p>
        </div>
        <div class="onboarding-media flex-1 flex items-center justify-center">
          <img :src="frame2" alt="onboarding-3" style="max-width: 320px; width: 100%; border-radius: 12px;" />
        </div>
        <div class="onboarding-body"></div>
      </SwiperSlide>
      <SwiperSlide class="onboarding-card slidePeek center-card">
        <div class="onboarding-header">
          <h2 class="title">История снов</h2>
          <p class="subtitle">и анализ</p>
        </div>
        <div class="onboarding-media flex-1 flex items-center justify-center">
          <img :src="frame3" alt="onboarding-4" style="max-width: 320px; width: 100%; border-radius: 12px;" />
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

// СТАНДАРТНЫЕ ИМПОРТЫ С ПОЗДНЕЙ ИНИЦИАЛИЗАЦИЕЙ
let useUserStore: any = null
let api: any = null
let StickerPlayer: any = null

// ИНИЦИАЛИЗАЦИЯ ПЕРЕМЕННЫХ С ЗАЩИТОЙ
onMounted(async () => {
  try {
    const userStoreModule = await import('@/stores/user.js')
    useUserStore = userStoreModule.useUserStore
    console.log('✅ [ONBOARDING] useUserStore loaded successfully')
  } catch (error) {
    console.error('❌ [ONBOARDING] Failed to load useUserStore:', error)
    useUserStore = () => ({
      profile: { subscription_type: '', channel_reward_claimed: false, total_dreams_count: 0 },
      history: [],
      claimChannelReward: () => Promise.resolve(),
      rewardAlreadyClaimed: false,
      claimRewardError: null,
      notificationStore: { info: () => {}, warning: () => {}, success: () => {} }
    })
  }

  try {
    const apiModule = await import('@/services/api.js')
    api = apiModule.default
    console.log('✅ [ONBOARDING] api loaded successfully')
  } catch (error) {
    console.error('❌ [ONBOARDING] Failed to load api:', error)
    api = { trackOnboarding: () => {} }
  }

  try {
    const stickerModule = await import('@/components/StickerPlayer.vue')
    StickerPlayer = stickerModule.default
    console.log('✅ [ONBOARDING] StickerPlayer loaded successfully')
  } catch (error) {
    console.error('❌ [ONBOARDING] Failed to load StickerPlayer:', error)
    StickerPlayer = {
      name: 'ErrorStickerPlayer',
      template: '<div class="text-center text-white">Ошибка загрузки стикера</div>'
    }
  }
})
const frame1 = new URL('../../stickers/Onboarding Frame-1.png', import.meta.url).href
const frame2 = new URL('../../stickers/Onboarding Frame-2.png', import.meta.url).href
const frame3 = new URL('../../stickers/Onboarding Frame-3.png', import.meta.url).href

const modules = [Autoplay, A11y, Keyboard]
const autoplay = { delay: 8000, disableOnInteraction: false, stopOnLastSlide: true }
const tg = computed(() => (typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null))
const emit = defineEmits<{ (e: 'visible-change', value: boolean): void }>()

// БЕЗОПАСНОЕ ПОЛУЧЕНИЕ userStore
const getUserStore = () => {
  if (!useUserStore) {
    console.warn('⚠️ [ONBOARDING] useUserStore not loaded yet, using fallback')
    return {
      profile: { subscription_type: '', channel_reward_claimed: false, total_dreams_count: 0 },
      history: [],
      claimChannelReward: () => Promise.resolve(),
      rewardAlreadyClaimed: false,
      claimRewardError: null,
      notificationStore: { info: () => {}, warning: () => {}, success: () => {} }
    }
  }
  return useUserStore()
}

const userStore = getUserStore()

// БЕЗОПАСНЫЕ ФУНКЦИИ API И TELEGRAM
const safeApiTrack = (event: string) => {
  try {
    // Проверяем глобальную переменную api
    if (typeof api !== 'undefined' && api && typeof api.trackOnboarding === 'function') {
      api.trackOnboarding(event)
    } else {
      console.warn('⚠️ [ONBOARDING] api.trackOnboarding not available')
    }
  } catch (error) {
    console.error('❌ [ONBOARDING] Error in api.trackOnboarding:', error)
  }
}

const safeTgClose = () => {
  try {
    // Проверяем глобальную переменную tg
    if (typeof tg !== 'undefined' && tg?.value?.close) {
      tg.value.close()
    } else {
      console.warn('⚠️ [ONBOARDING] tg.close not available')
    }
  } catch (error) {
    console.error('❌ [ONBOARDING] Error in tg.close:', error)
  }
}

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
  try {
    const currentUserStore = getUserStore()
    if (!currentUserStore?.profile) return false
    const s = (currentUserStore.profile.subscription_type || '').toLowerCase()
    return s === 'onboarding1'
  } catch (error) {
    console.error('❌ [ONBOARDING] Error in hasNewFlowEligibility:', error)
    return false
  }
})

// Второй онбординг показываем, когда у пользователя уже есть первый проанализированный сон
const hasFreeFlowEligibility = computed(() => {
  try {
    const currentUserStore = getUserStore()
    const s = (currentUserStore?.profile?.subscription_type || '').toLowerCase()
    return s === 'onboarding2'
  } catch (error) {
    console.error('❌ [ONBOARDING] Error in hasFreeFlowEligibility:', error)
    return false
  }
})

// Промежуточный экран больше не используется — логика этапов строго по subscription_type

// Initialize flow when profile/history are available
const initFlow = () => {
  try {
    if (hasFreeFlowEligibility.value) {
      flow.value = 'free'
      step.value = 1
    } else if (hasNewFlowEligibility.value) {
      // Если пользователь уже получил токен, но ещё не сделал анализ → показываем промежуточный экран
      try {
        const currentUserStore = getUserStore()
        const claimed = !!currentUserStore?.profile?.channel_reward_claimed
        const hasAnalyses = (currentUserStore?.profile?.total_dreams_count || currentUserStore?.history?.length || 0) > 0
        if (claimed && !hasAnalyses) {
          flow.value = 'post_claim'
          step.value = 1
          return
        }
        flow.value = 'new'
        step.value = 1
      } catch (error) {
        console.error('❌ [ONBOARDING] Error accessing userStore properties:', error)
        flow.value = 'none'
      }
    } else {
      flow.value = 'none'
    }
  } catch (error) {
    console.error('❌ [ONBOARDING] Error in initFlow:', error)
    flow.value = 'none'
  }
}

watch(
  () => {
    const currentUserStore = getUserStore()
    return [
      currentUserStore?.profile?.channel_reward_claimed,
      currentUserStore?.history?.length,
      currentUserStore?.profile?.subscription_type
    ]
  },
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
    // Проверяем глобальную переменную tg
    if (typeof tg !== 'undefined' && tg?.value?.MainButton) {
      tg.value.MainButton.hide()
      tg.value.MainButton.offClick(handleMainButtonClick)
    }
  } catch (error) {
    console.error('❌ [ONBOARDING] Error in clearMainButton:', error)
  }
}

const setMainButton = (text: string, handler: () => void) => {
  try {
    // Проверяем глобальную переменную tg
    if (typeof tg !== 'undefined' && tg?.value?.MainButton) {
      tg.value.MainButton.setParams({
        text,
        color: tg.value.themeParams?.button_color || '#2481CC',
        text_color: tg.value.themeParams?.button_text_color || '#ffffff',
        is_active: true,
        is_visible: true,
      })
      tg.value.MainButton.offClick(handleMainButtonClick)
      tg.value.MainButton.onClick(handleMainButtonClick)
      mainButtonHandler.value = handler
      try { tg.value.MainButton.show() } catch (_) {}
    }
  } catch (error) {
    console.error('❌ [ONBOARDING] Error in setMainButton:', error)
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
        safeApiTrack('post_claim_open_chat_click')
        safeTgClose()
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
  try {
    const url = 'https://t.me/thedreamshub'
    try { localStorage.setItem('visited_channel', '1') } catch (_) {}

    // Проверяем глобальную переменную tg
    if (typeof tg !== 'undefined' && tg?.value) {
      try {
        if (tg.value.openLink) {
          tg.value.openLink(url);
          return;
        }
      } catch(_) {}

      try {
        if (tg.value.openTelegramLink) {
          tg.value.openTelegramLink(url);
          return;
        }
      } catch(_) {}
    }

    // Fallback to window.open
    window.open(url, '_blank')
  } catch (error) {
    console.error('❌ [ONBOARDING] Error in goToCommunity:', error)
    // Emergency fallback
    try { window.open('https://t.me/thedreamshub', '_blank') } catch (_) {}
  }
}

//

const verifySubscription = async () => {
  try {
    safeApiTrack('onboarding1_step4_verify_click')

    const currentUserStore = getUserStore()
    if (currentUserStore?.claimChannelReward) {
      await currentUserStore.claimChannelReward()
    }

    // Если награда уже была получена ранее — просто сообщаем и закрываем онбординг
    if (currentUserStore?.rewardAlreadyClaimed) {
      if (currentUserStore?.notificationStore?.info) {
        currentUserStore.notificationStore.info('Награда уже получена. Отправьте свой сон в чате с ботом.')
      }
      safeApiTrack('onboarding1_reward_already')
      flow.value = 'none'
      emit('visible-change', false)
      safeTgClose()
      return
    }

    // Если возникла ошибка (часто это отсутствие подписки) — оставляем возможность перейти в канал
    if (currentUserStore?.claimRewardError) {
      if (currentUserStore?.notificationStore?.warning) {
        currentUserStore.notificationStore.warning(currentUserStore.claimRewardError || 'Не удалось подтвердить подписку.')
      }
      safeApiTrack('onboarding1_verify_failed')
      return
    }

    // Успех: сообщаем и закрываем онбординг
    if (currentUserStore?.notificationStore?.success) {
      currentUserStore.notificationStore.success('Подписка подтверждена! Теперь отправьте свой сон в чате с ботом.')
    }
    safeApiTrack('onboarding1_reward_granted')
    flow.value = 'none'
    emit('visible-change', false)
    safeTgClose()
  } catch (error) {
    console.error('❌ [ONBOARDING] Error in verifySubscription:', error)
  }
}

// drag-логика упразднена — ею управляет Swiper

const completeFree = async () => {
  try {
    // 1) Просим сервер перевести в stage3/free
    if (api?.setOnboardingStage) {
      await api.setOnboardingStage('stage3');
    } else {
      console.warn('⚠️ [ONBOARDING] api.setOnboardingStage not available');
    }

    // 2) Сразу закрываем онбординг, чтобы не блокировать UI
    flow.value = 'none'
    emit('visible-change', false)
    clearMainButton()

    // 3) Обновляем профиль в фоне (без блокировки интерфейса)
    const currentUserStore = getUserStore()
    if (currentUserStore?.fetchProfile) {
      try { await currentUserStore.fetchProfile() } catch (_) {}
    }

    if (currentUserStore?.profile) {
      currentUserStore.profile.onboarding_stage = 'stage3';
    }
  } catch (error) {
    console.error('❌ [ONBOARDING] Error in completeFree:', error)
  }
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
    safeApiTrack('onboarding1_step4_enter')
    // Пытаемся автоматически подтвердить подписку и начислить токен
    try {
      await verifySubscription()
      const currentUserStore = getUserStore()
      if (currentUserStore?.fetchProfile) {
        try { await currentUserStore.fetchProfile() } catch (_) {}
      }
    } catch (_) {}

    // После попытки показываем релевантную кнопку
    const currentUserStore2 = getUserStore()
    if (currentUserStore2?.profile?.channel_reward_claimed) {
      setMainButton('Открыть чат', () => { safeTgClose() })
    } else {
      const visited = (()=>{ try { return localStorage.getItem('visited_channel') === '1' } catch(_) { return false } })()
      if (visited) {
        setMainButton('Проверить подписку', async () => {
          await verifySubscription();
          const userStoreAfter = getUserStore()
          if (userStoreAfter?.fetchProfile) {
            try { await userStoreAfter.fetchProfile() } catch (_) {}
          }
          if (userStoreAfter?.profile?.channel_reward_claimed) {
            safeTgClose()
          }
        })
      } else {
        safeApiTrack('onboarding1_step4_need_subscribe')
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
    safeApiTrack('onboarding2_step4_open_history_click')
    await openHistory();
    const currentUserStore = getUserStore()
    if (currentUserStore?.fetchProfile) {
      try { await currentUserStore.fetchProfile() } catch (_) {}
    }
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
      safeApiTrack('post_claim_open_chat_click')
      safeTgClose()
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
watch(() => {
  const currentUserStore = getUserStore()
  return [currentUserStore?.profile?.onboarding_stage, currentUserStore?.profile?.subscription_type]
}, ([stage, sub]) => {
  try {
    const isDone = stage === 'stage3' || (sub && !String(sub).toLowerCase().startsWith('onboarding'))
    if (isDone) {
      flow.value = 'none'
      emit('visible-change', false)
      clearMainButton()
      safeApiTrack('onboarding_closed')
    }
  } catch (error) {
    console.error('❌ [ONBOARDING] Error in onboarding closed watch:', error)
  }
})

// Автопереход в onboarding2: если уже есть хотя бы один анализ, а статус ещё onboarding1 — переводим на сервере
watch(() => {
  const currentUserStore = getUserStore()
  return [currentUserStore?.history?.length, currentUserStore?.profile?.subscription_type]
}, async ([len, sub]) => {
  try {
    if ((Number(len) || 0) > 0 && String(sub || '').toLowerCase() === 'onboarding1') {
      safeApiTrack('auto_transition_to_onboarding2')

      if (api?.setOnboardingStage) {
        await api.setOnboardingStage('stage2')
      }

      const currentUserStore = getUserStore()
      if (currentUserStore?.fetchProfile) {
        try { await currentUserStore.fetchProfile() } catch (_) {}
      }
    }
  } catch (error) {
    console.error('❌ [ONBOARDING] Error in auto transition watch:', error)
  }
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
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 400px;
}
.center-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 20px 0;
  gap: 16px;
}
/* Карточка чуть меньше экрана для peeking; контент вертикально выстроен */
.slidePeek {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
  max-height: 70vh;
  padding: 20px 0;
}

/* Медиа-запросы для мобильных устройств */
@media (max-width: 768px) {
  .slidePeek {
    min-height: 75vh;
    max-height: 75vh;
    padding: 15px 0;
  }

  .onboarding-card {
    min-height: 350px;
    padding: 16px 12px;
  }

  .center-card {
    gap: 12px;
    padding: 15px 0;
  }
}

@media (max-height: 600px) {
  .slidePeek {
    min-height: 80vh;
    max-height: 80vh;
    padding: 10px 0;
  }

  .onboarding-card {
    min-height: 300px;
    padding: 12px 8px;
  }
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
.onboarding-body {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.headline {
  font-size: 22px;
  line-height: 1.28;
  margin: 12px 0 0 0;
  color: #fff;
  text-align: center;
  width: 100%;
  display: block;
}

.centered {
  text-align: center;
  width: 100%;
  display: block;
}
.media-overlay { position: relative; display: inline-block; }
.overlay-stack { position: absolute; left: 24px; top: 18px; right: 24px; color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,0.55); }
.overlay-title { font-size: 26px; font-weight: 700; line-height: 1.12; }
.overlay-subtitle { font-size: 18px; line-height: 1.12; margin-top: 6px; opacity: 0.95; }
/* Центрирование контента карточек и контроль переполнения текста */
.onboarding-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.onboarding-header, .onboarding-body, .onboarding-media {
  max-width: 560px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.onboarding-body {
  padding: 0 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.onboarding-body .text {
  word-wrap: break-word;
  overflow-wrap: anywhere;
  text-align: center;
  width: 100%;
  display: block;
}

/* ДОПОЛНИТЕЛЬНЫЕ СТИЛИ ДЛЯ ЦЕНТРИРОВАНИЯ */
@media (max-width: 768px) {
  .onboarding-card {
    justify-content: space-around;
    min-height: 350px;
  }

  .onboarding-body .headline {
    font-size: 20px;
    line-height: 1.3;
  }
}
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


