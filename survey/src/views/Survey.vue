<template>
  <div class="survey-overlay" :class="{ 'keyboard-open': keyboardOpen }" ref="dragHost">
    <div class="survey-viewport">
      <div class="survey-top">
        <ProgressBar :current="store.index" :total="store.total" />
      </div>
      <button
        v-if="showDesktopBack"
        class="back-circle"
        aria-label="Назад к предыдущему вопросу"
        @click="onDesktopBack"
      >
        ↑
      </button>
      <Swiper
        :modules="modules"
        direction="vertical"
        :spaceBetween="18"
        :slidesOffsetBefore="0"
        :slidesOffsetAfter="0"
        slides-per-view="auto"
        :centeredSlides="true"
        :centeredSlidesBounds="true"
        :allowTouchMove="false"
        :keyboard="{ enabled: false }"
        :a11y="{ enabled: false }"
        class="onboarding-swiper"
        :observer="true"
        :observe-parents="true"
        :watch-overflow="true"
        @swiper="onSwiper"
      >
        <SwiperSlide v-for="(q, i) in QUESTIONS" :key="q.key" class="onboarding-card slidePeek center-card">
          <component
            :is="resolveComponent(q)"
            v-bind="resolveProps(q)"
            v-model="answersProxy[q.key]"
            @commit="() => onCommit(q, i)"
          />
        </SwiperSlide>
      </Swiper>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useSurveyStore, QUESTIONS, validateAnswer } from '../store/survey';
import ProgressBar from '../components/ProgressBar.vue';
import SliderQuestion from '../components/controls/SliderQuestion.vue';
import ButtonsQuestion from '../components/controls/ButtonsQuestion.vue';
import TextQuestion from '../components/controls/TextQuestion.vue';
import { submitSurvey, submitSurveyStep } from '../services/api';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { A11y, Keyboard } from 'swiper/modules';
import 'swiper/css';

const store = useSurveyStore();
const keyboardOpen = ref(false);

// Swiper instance
const modules = [A11y, Keyboard];
const swiperRef = ref(null);
function onSwiper(swiper) {
  swiperRef.value = swiper;
  try { swiper.slideTo(store.index || 0, 0); } catch (_) {}
}

// Desktop detection (no coarse pointer => считаем десктоп)
const isDesktop = ref(false);
const showDesktopBack = computed(() => isDesktop.value && store.index > 0);
function onDesktopBack() {
  if (store.index > 0) {
    store.prev();
    try { swiperRef.value?.slideTo(store.index, 200); } catch (_) {}
  }
}

// Drag-to-previous: позволяем тянуть активную карточку вниз для возврата
const dragHost = ref(null);
let startY = 0;
let lastY = 0;
let gestureHandled = false;
function touchY(e) { return (e.touches && e.touches[0]?.clientY) || e.clientY || 0; }
function onTouchStart(e) { startY = touchY(e); lastY = startY; gestureHandled = false; }
function onTouchMove(e) {
  const dy = touchY(e) - startY;
  // Блокируем свайп вверх (вперёд) полностью
  if (dy < 0) {
    try { e.preventDefault(); } catch (_) {}
  }
  lastY = touchY(e);
}
function onTouchEnd() {
  if (gestureHandled) return;
  const dy = lastY - startY;
  const THRESHOLD = 60;
  if (dy > THRESHOLD && store.index > 0) {
    store.prev();
    try { swiperRef.value?.slideTo(store.index, 200); } catch (_) {}
    gestureHandled = true;
  }
}

onMounted(() => {
  const el = dragHost.value;
  if (!el) return;
  // Отключаем вертикальные свайпы Telegram WebApp на время опроса,
  // чтобы жест возврата к предыдущему вопросу не сворачивал TWA
  try { window?.Telegram?.WebApp?.disableVerticalSwipes?.(); } catch {}
  // Определяем десктоп
  try {
    const coarse = window?.matchMedia && window.matchMedia('(pointer: coarse)')?.matches;
    isDesktop.value = !coarse;
  } catch {}
  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd, { passive: true });
  // Детектируем показ клавиатуры (visualViewport) и фокус на текстовых полях
  try {
    const baseInnerH = window.innerHeight;
    const vv = window.visualViewport;
    function onVVResize() {
      try {
        const h = vv?.height || baseInnerH;
        keyboardOpen.value = h < baseInnerH - 120;
      } catch {}
    }
    vv?.addEventListener('resize', onVVResize);
    el.addEventListener('focusin', (e) => {
      const t = e.target;
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) keyboardOpen.value = true;
    }, { passive: true });
    el.addEventListener('focusout', (e) => {
      const t = e.target;
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) keyboardOpen.value = false;
    }, { passive: true });
    onBeforeUnmount(() => { try { vv?.removeEventListener('resize', onVVResize); } catch {} });
  } catch {}
  // Глобальная блокировка прокрутки страницы во время опроса
  try {
    document.documentElement.classList.add('no-scroll');
    document.body.classList.add('no-scroll');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  } catch (_) {}
  // Слушаем события на самом контейнере Swiper, чтобы жест работал всегда
  try {
    const sEl = swiperRef.value?.el;
    if (sEl) {
      sEl.addEventListener('touchstart', onTouchStart, { passive: true });
      sEl.addEventListener('touchmove', onTouchMove, { passive: false });
      sEl.addEventListener('touchend', onTouchEnd, { passive: true });
    }
  } catch (_) {}
});
onBeforeUnmount(() => {
  const el = dragHost.value;
  if (!el) return;
  // Возвращаем поведение свайпов по умолчанию при выходе
  try { window?.Telegram?.WebApp?.enableVerticalSwipes?.(); } catch {}
  el.removeEventListener('touchstart', onTouchStart);
  el.removeEventListener('touchmove', onTouchMove);
  el.removeEventListener('touchend', onTouchEnd);
  try {
    document.documentElement.classList.remove('no-scroll');
    document.body.classList.remove('no-scroll');
  } catch (_) {}
});

const answersProxy = reactive(new Proxy({}, {
  get(_, key) { return store.answers[key]; },
  set(_, key, val) { store.setAnswer(key, val); return true; }
}));

function resolveComponent(q) {
  if (q.type === 'slider') return SliderQuestion;
  if (q.type === 'buttons') return ButtonsQuestion;
  return TextQuestion;
}
function resolveProps(q) {
  const base = { title: q.title };
  if (q.type === 'slider') return { ...base, min: q.min, max: q.max };
  if (q.type === 'buttons') return { ...base, options: q.options };
  // Примеры для открытых вопросов
  const placeholders = {
    q7: 'Например: «Хочу лучше понимать символику снов и их влияние на настроение»',
    q8: 'Например: «Авто‑расшифровка символов, дневник сна, рекомендации по улучшению сна»'
  };
  const key = q.key;
  return { ...base, placeholder: placeholders[key] || 'Например: опишите ваш ответ' };
}

function goToSlide(i) {
  try {
    const s = swiperRef.value;
    if (!s) return;
    s.slideTo(i, 300);
    // На всякий случай прокручиваем контейнер к началу
    try { s.el?.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) {}
  } catch (_) {}
}

async function onCommit(q, i) {
  const value = store.answers[q.key];
  if (!validateAnswer(q.key, value)) return;

  // Защита от двойных отправок одного и того же шага (быстрые тапы)
  const now = Date.now();
  if (!onCommit._last) onCommit._last = { index: -1, at: 0 };
  if (onCommit._last.index === i && (now - onCommit._last.at) < 800) {
    return;
  }
  onCommit._last = { index: i, at: now };

  const isLast = i === store.total - 1;
  if (isLast) {
    const payload = { ...store.answers };
    const clientId = store.clientId;
    // Переходим на финальный экран сразу, без ожидания сети
    store.next();
    // Отправляем ответы в фоне, не блокируя UI
    try { submitSurvey(payload, clientId, store.sessionId).catch(() => {}); } catch (_) {}
    return;
  }
  // Отправляем частичный ответ (не блокируя переход)
  try { submitSurveyStep({ answerKey: q.key, answerValue: value, index: i, completed: false, sessionId: store.sessionId }, store.clientId).catch(() => {}); } catch (_) {}
  store.next();
  await nextTick();
  goToSlide(store.index);
}
</script>

<style scoped>
.nav { display: none; }
/* Фиксированный оверлей и вьюпорт по центру, как в онбординге */
.survey-overlay { position: fixed; inset: 0; display: flex; align-items: stretch; justify-content: center; z-index: 10; background: transparent; overflow: hidden; }
.survey-viewport { position: relative; width: 100%; max-width: 560px; min-height: 100vh; display: flex; flex-direction: column; padding: 0 16px; box-sizing: border-box; }
.survey-top { position: sticky; top: 8px; left: 16px; right: 16px; z-index: 20; backdrop-filter: blur(10px) saturate(120%); -webkit-backdrop-filter: blur(10px) saturate(120%); }
/* Desktop back circle */
.back-circle { position: absolute; top: 56px; left: 50%; transform: translateX(-50%); z-index: 30; width: 36px; height: 36px; border-radius: 9999px; border: 2px solid transparent; background-image: linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #6A4DFF 0%, #9A3CFF 100%); background-origin: border-box; background-clip: padding-box, border-box; color: #111827; font-size: 18px; font-weight: 800; box-shadow: 0 6px 16px rgba(0,0,0,0.18); cursor: pointer; display: flex; align-items: center; justify-content: center; }
/* Центрирование и равные отступы вокруг активной карточки */
::v-deep(.onboarding-swiper) { 
  --peek: 64px; /* видимая часть соседних карточек сверху/снизу */
  padding: 32px 0 32px 0; 
  box-sizing: border-box; 
  flex: 1; 
}
::v-deep(.onboarding-swiper .swiper) { height: 100%; }
::v-deep(.onboarding-swiper .swiper-wrapper) { align-items: center; height: 100%; }
::v-deep(.onboarding-swiper .swiper-slide) { display: flex; justify-content: center; align-items: center; }
::v-deep(.slidePeek) { height: calc(100% - var(--peek) * 2); width: 100%; }
::v-deep(.center-card) { width: 100%; display: flex; align-items: center; justify-content: center; }
/* Блокируем прокрутку страницы */
:host { overflow: hidden; }
::v-deep(html), ::v-deep(body) { overscroll-behavior: none; height: 100dvh; overflow: hidden; }
/* Внутренние отступы слайдера */
::v-deep(.onboarding-swiper) { padding-left: 16px; padding-right: 16px; }
::v-deep(.onboarding-swiper .swiper-wrapper) { align-items: center; }
::v-deep(.onboarding-swiper .swiper-slide) { display: flex; justify-content: center; }
.btn { padding: 12px 16px; border-radius: 12px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; }
.btn-secondary { background: #f9fafb; }
.onboarding-card { 
  padding: 24px; 
  border-radius: 20px; 
  background: linear-gradient(135deg, #6A4DFF 0%, #9A3CFF 100%);
  color: #ffffff;
  box-shadow: 0 8px 24px rgba(0,0,0,0.16);
  width: calc(100% - 32px);
  max-width: 560px;
}
.onboarding-card :deep(.btn) { font-size: 18px; font-weight: 600; border-radius: 20px; }

@media (max-width: 400px) {
  .survey-viewport { padding: 12px; }
  .survey-top { padding-bottom: 6px; }
  ::v-deep(.onboarding-swiper) { padding-top: 16px; padding-bottom: 12px; --peek: 56px; }
  .onboarding-card { width: calc(100% - 24px); padding: 18px; border-radius: 16px; }
}
.inactive { opacity: 1; }

/* Режим с открытой клавиатурой: скрываем peek и растягиваем активную карточку */
.keyboard-open :deep(.onboarding-swiper) { --peek: 0; padding-top: 8px; padding-bottom: 8px; }
.keyboard-open :deep(.onboarding-swiper .swiper-wrapper) { align-items: stretch; }
.keyboard-open :deep(.slidePeek) { height: 100%; }
</style>


