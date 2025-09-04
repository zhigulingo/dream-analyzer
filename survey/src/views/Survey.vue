<template>
  <div>
    <ProgressBar :current="store.index" :total="store.total" />

    <div class="stack" ref="stackEl">
      <div
        v-for="(q, i) in QUESTIONS"
        :key="q.key"
        class="card onboarding-card"
        :class="cardClass(i)"
        :ref="el => setCardRef(i, el)"
      >
        <component
          :is="resolveComponent(q)"
          v-bind="resolveProps(q)"
          v-model="answersProxy[q.key]"
          @commit="() => onCommit(q, i)"
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

function cardClass(i) {
  if (i < store.index) return 'card-done';
  if (i === store.index) return 'card-active';
  if (i === store.index + 1) return 'card-next';
  return 'card-pending';
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

function scrollToIndex(i) {
  nextTick(() => {
    const el = cardRefs[i];
    if (el && stackEl.value) {
      const top = el.offsetTop - 12;
      stackEl.value.scrollTo({ top, behavior: 'smooth' });
    }
  });
}

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
.card { 
  margin-bottom: 16px; 
  padding: 20px; 
  border: 1px solid rgba(255,255,255,0.12); 
  border-radius: 20px; 
  background: linear-gradient(135deg, #6A4DFF 0%, #9A3CFF 100%);
  color: #ffffff;
  box-shadow: 0 12px 28px rgba(0,0,0,0.12);
  transition: transform .28s ease, opacity .28s ease, max-height .28s ease, margin .28s ease;
}
.card-active { opacity: 1; transform: translateY(0); max-height: 640px; }
.card-done { opacity: .65; transform: translateY(-18px); max-height: 0; margin-bottom: 0; overflow: hidden; }
.card-next { opacity: .5; transform: translateY(12px); max-height: 160px; }
.card-pending { opacity: 0; transform: translateY(24px); max-height: 0; margin-bottom: 0; overflow: hidden; }
.nav { margin-top: 8px; display: flex; justify-content: space-between; }
.btn { padding: 12px 16px; border-radius: 12px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; }
.btn-secondary { background: #f9fafb; }
.onboarding-card { 
  padding: 24px; 
  border-radius: 20px; 
}
.inactive { opacity: 1; }
</style>


