<template>
  <div class="survey-overlay">
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
import { computed, reactive, ref } from 'vue';
import { useSurveyStore, QUESTIONS, validateAnswer } from '../store/survey';
import ProgressBar from '../components/ProgressBar.vue';
import SliderQuestion from '../components/controls/SliderQuestion.vue';
import ButtonsQuestion from '../components/controls/ButtonsQuestion.vue';
import TextQuestion from '../components/controls/TextQuestion.vue';
import { submitSurvey } from '../services/api';
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

function goToSlide(i) { try { swiperRef.value?.slideTo(i); } catch (_) {} }

function onCommit(q, i) {
  const value = store.answers[q.key];
  if (!validateAnswer(q.key, value)) return;

  const isLast = i === store.total - 1;
  if (isLast) {
    submitSurvey(store.answers, store.clientId)
      .catch(() => {})
      .finally(() => { store.next(); });
    return;
  }
  store.next();
  goToSlide(store.index);
}
</script>

<style scoped>
.nav { display: none; }
/* Фиксированный оверлей и вьюпорт по центру, как в онбординге */
.survey-overlay { position: fixed; inset: 0; display: flex; align-items: stretch; justify-content: center; z-index: 10; background: transparent; }
.survey-viewport { width: 100%; max-width: 560px; display: flex; flex-direction: column; padding: 16px; box-sizing: border-box; }
.survey-top { padding: 0 0 8px 0; }
/* Центрирование и peeking */
::v-deep(.onboarding-swiper) { padding: 16px 0 8px 0; box-sizing: border-box; flex: 1; }
::v-deep(.onboarding-swiper .swiper-wrapper) { align-items: center; }
::v-deep(.onboarding-swiper .swiper-slide) { display: flex; justify-content: center; }
::v-deep(.slidePeek) { min-height: 72vh; max-height: 72vh; width: 100%; }
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
.inactive { opacity: 1; }
</style>


