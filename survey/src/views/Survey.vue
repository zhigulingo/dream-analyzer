<template>
  <div>
    <ProgressBar :current="store.index" :total="store.total" />

    <div class="stack" ref="stackEl">
      <div
        v-for="(q, i) in visibleQuestions"
        :key="q.key"
        class="card onboarding-card"
        :class="{ inactive: i < store.indexVisibleStart || i > store.index }"
        :ref="el => setCardRef(i, el)"
      >
        <component
          :is="resolveComponent(q)"
          v-bind="resolveProps(q)"
          v-model="answersProxy[q.key]"
          @commit="() => onCommit(q)"
        />
      </div>
    </div>

    <div class="nav">
      <button class="btn btn-secondary" :disabled="store.index===0" @click="goPrev">Назад</button>
    </div>
  </div>
  </template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue';
import { useSurveyStore, QUESTIONS, validateAnswer } from '../store/survey';
import ProgressBar from '../components/ProgressBar.vue';
import SliderQuestion from '../components/controls/SliderQuestion.vue';
import ButtonsQuestion from '../components/controls/ButtonsQuestion.vue';
import TextQuestion from '../components/controls/TextQuestion.vue';
import { submitSurvey } from '../services/api';

const store = useSurveyStore();
store.restore();

// Поддержка вертикальной стопки карточек
const stackEl = ref(null);
const cardRefs = reactive({});
function setCardRef(i, el) { if (el) cardRefs[i] = el; }

// Видим только уже пройденные и текущую
const visibleQuestions = computed(() => QUESTIONS.slice(0, store.index + 1));

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

function scrollToIndex(i) {
  nextTick(() => {
    const el = cardRefs[i];
    if (el && stackEl.value) {
      const top = el.offsetTop - 12;
      stackEl.value.scrollTo({ top, behavior: 'smooth' });
    }
  });
}

function onCommit(q) {
  const value = store.answers[q.key];
  if (!validateAnswer(q.key, value)) return;

  const isLast = store.index === store.total - 1;
  if (isLast) {
    submitSurvey(store.answers, store.clientId)
      .catch(() => {})
      .finally(() => { store.next(); });
    return;
  }
  store.next();
  scrollToIndex(store.index);
}

function goPrev() {
  if (store.index === 0) return;
  store.prev();
  scrollToIndex(store.index);
}
</script>

<style scoped>
.stack { margin-top: 16px; max-height: calc(100vh - 180px); overflow-y: auto; scroll-behavior: smooth; padding-right: 6px; }
.card { margin-bottom: 16px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; }
.nav { margin-top: 8px; display: flex; justify-content: space-between; }
.btn { padding: 12px 16px; border-radius: 12px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; }
.btn-secondary { background: #f9fafb; }
.onboarding-card { 
  padding: 24px; 
  border-radius: 20px; 
  border: 1px solid #e5e7eb; 
  background: #ffffff; 
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
}
.inactive { opacity: 1; }
</style>


