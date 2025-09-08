<template>
  <div class="survey-overlay" ref="dragHost">
    <div class="survey-viewport">
      <div class="survey-top">
        <ProgressBar :current="store.index" :total="store.total" />
      </div>
      <Swiper
        :modules="modules"
        direction="vertical"
        :spaceBetween="18"
        :slidesOffsetBefore="32"
        :slidesOffsetAfter="32"
        slides-per-view="auto"
        :centeredSlides="true"
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
store.restore();

// Swiper instance
const modules = [A11y, Keyboard];
const swiperRef = ref(null);
function onSwiper(swiper) {
  swiperRef.value = swiper;
  try { swiper.slideTo(store.index || 0, 0); } catch (_) {}
}

// Drag-to-previous: позволяем тянуть активную карточку вниз для возврата
const dragHost = ref(null);
let startY = 0;
let lastY = 0;
function touchY(e) { return (e.touches && e.touches[0]?.clientY) || e.clientY || 0; }
function onTouchStart(e) { startY = touchY(e); lastY = startY; }
function onTouchMove(e) {
  const dy = touchY(e) - startY;
  // Блокируем свайп вверх (вперёд) полностью
  if (dy < 0) {
    try { e.preventDefault(); } catch (_) {}
  }
  lastY = touchY(e);
}
function onTouchEnd() {
  const dy = lastY - startY;
  const THRESHOLD = 60;
  if (dy > THRESHOLD && store.index > 0) {
    store.prev();
    try { swiperRef.value?.slideTo(store.index, 200); } catch (_) {}
  }
}

onMounted(() => {
  const el = dragHost.value;
  if (!el) return;
  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd, { passive: true });
  // Глобальная блокировка прокрутки страницы во время опроса
  try {
    document.documentElement.classList.add('no-scroll');
    document.body.classList.add('no-scroll');
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
  return base;
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
/* Центрирование и peeking */
::v-deep(.onboarding-swiper) { padding: 32px 0 32px 0; box-sizing: border-box; flex: 1; height: 100vh; }
::v-deep(.onboarding-swiper .swiper-wrapper) { align-items: center; }
::v-deep(.onboarding-swiper .swiper-slide) { display: flex; justify-content: center; align-items: center; }
::v-deep(.slidePeek) { height: 70vh; width: 100%; }
::v-deep(.center-card) { width: 100%; display: flex; align-items: center; justify-content: center; }
/* Блокируем прокрутку страницы */
:host { overflow: hidden; }
::v-deep(html), ::v-deep(body) { overscroll-behavior: none; }
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
  ::v-deep(.onboarding-swiper) { padding-top: 16px; padding-bottom: 12px; }
  ::v-deep(.slidePeek) { min-height: 68vh; max-height: 68vh; }
  .onboarding-card { width: calc(100% - 24px); padding: 18px; border-radius: 16px; }
}
.inactive { opacity: 1; }
</style>


