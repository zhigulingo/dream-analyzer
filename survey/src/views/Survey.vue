<template>
  <div>
    <ProgressBar :current="store.index" :total="store.total" />

    <div class="card onboarding-card">
      <component
        :is="currentComponent"
        v-bind="currentProps"
        :key="currentKey"
        v-model="modelValue"
        @commit="onCommit"
      />
    </div>

    <div class="nav">
      <button class="btn btn-secondary" :disabled="store.index===0" @click="store.prev()">Назад</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useSurveyStore, QUESTIONS, validateAnswer } from '../store/survey';
import ProgressBar from '../components/ProgressBar.vue';
import SliderQuestion from '../components/controls/SliderQuestion.vue';
import ButtonsQuestion from '../components/controls/ButtonsQuestion.vue';
import TextQuestion from '../components/controls/TextQuestion.vue';
import { submitSurvey } from '../services/api';

const store = useSurveyStore();
store.restore();

const currentQuestion = computed(() => QUESTIONS[store.index]);
const currentComponent = computed(() => {
  const t = currentQuestion.value.type;
  if (t === 'slider') return SliderQuestion;
  if (t === 'buttons') return ButtonsQuestion;
  return TextQuestion;
});
const currentKey = computed(() => currentQuestion.value.key);
const currentProps = computed(() => {
  const q = currentQuestion.value;
  const base = { title: q.title };
  if (q.type === 'slider') return { ...base, min: q.min, max: q.max };
  if (q.type === 'buttons') return { ...base, options: q.options };
  return base;
});

const modelValue = computed({
  get() { return store.answers[currentKey.value]; },
  set(v) { store.setAnswer(currentKey.value, v); }
});

function onCommit() {
  const value = store.answers[currentKey.value];
  if (validateAnswer(currentKey.value, value)) {
    if (store.index === store.total - 1) {
      // Последний вопрос — отправляем
      submitSurvey(store.answers, store.clientId).then(() => {
        store.next();
      }).catch(() => {
        // даже при ошибке двигаем дальше для локального теста
        store.next();
      });
    } else {
      store.next();
    }
  }
}
</script>

<style scoped>
.card { margin-top: 16px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; }
.nav { margin-top: 16px; display: flex; justify-content: space-between; }
.btn { padding: 12px 16px; border-radius: 12px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; }
.btn-secondary { background: #f9fafb; }
.onboarding-card { 
  padding: 24px; 
  border-radius: 20px; 
  border: 1px solid #e5e7eb; 
  background: #ffffff; 
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
}
</style>


