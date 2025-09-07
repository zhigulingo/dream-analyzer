import { defineStore } from 'pinia';

const TOTAL_QUESTIONS = 10;

export const useSurveyStore = defineStore('survey', {
  state: () => ({
    stage: 'start', // 'start' | 'survey' | 'finish'
    index: 0,
    answers: {
      q1: null,
      q2: null,
      q3: null,
      q4: null,
      q5: null,
      q6: null,
      q7: '',
      q8: '',
      q9: null,
      q10: null,
    },
    total: TOTAL_QUESTIONS,
    clientId: generateClientId(),
  }),
  actions: {
    startSurvey() {
      // Всегда начинаем заново: очищаем ответы и ставим первый вопрос
      this.stage = 'survey';
      this.index = 0;
      this.answers = { q1: null, q2: null, q3: null, q4: null, q5: null, q6: null, q7: '', q8: '', q9: null, q10: null };
      this.persist();
    },
    setAnswer(key, value) {
      this.answers[key] = value;
      this.persist();
    },
    next() {
      if (this.index < this.total - 1) this.index += 1;
      else this.stage = 'finish';
      this.persist();
    },
    prev() {
      if (this.index > 0) this.index -= 1;
      this.persist();
    },
    reset() {
      this.stage = 'start';
      this.index = 0;
      this.answers = { q1: null, q2: null, q3: null, q4: null, q5: null, q6: null, q7: '', q8: '', q9: null, q10: null };
      this.persist();
    },
    persist() {
      localStorage.setItem('survey_state', JSON.stringify({ stage: this.stage, index: this.index, answers: this.answers, clientId: this.clientId }));
    },
    restore() {
      const raw = localStorage.getItem('survey_state');
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        this.stage = data.stage || this.stage;
        this.index = typeof data.index === 'number' ? data.index : this.index;
        this.answers = { ...this.answers, ...(data.answers || {}) };
        this.clientId = data.clientId || this.clientId;
      } catch {}
    }
  }
});

function generateClientId() {
  const existing = localStorage.getItem('survey_client_id');
  if (existing) return existing;
  const id = 'client_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('survey_client_id', id);
  return id;
}

export function validateAnswer(key, value) {
  const buttonQs = ['q1','q2','q3','q4','q5','q6','q9','q10'];
  // q1 переведён на кнопки: принимаем непустую строку
  if (key === 'q1') return typeof value === 'string' && value.length > 0;
  if (buttonQs.includes(key)) return typeof value === 'string' && value.length > 0;
  if (key === 'q7' || key === 'q8') return typeof value === 'string' && value.trim().length > 3;
  return false;
}

export const QUESTIONS = [
  { key: 'q1', type: 'buttons', title: 'Насколько вам интересно анализировать свои сны?', options: ['Не очень интересно','Довольно интересно','Очень интересно'] },
  { key: 'q2', type: 'buttons', title: 'Сколько времени вы готовы уделять тестированию этого приложения?', options: ['Ежедневно','Несколько раз в неделю'] },
  { key: 'q3', type: 'buttons', title: 'Готовы ли вы предоставлять подробный отзыв о вашем опыте использования приложения?', options: ['Да','Нет'] },
  { key: 'q4', type: 'buttons', title: 'Как часто вы помните свои сны?', options: ['Ежедневно','Несколько раз в неделю','Редко'] },
  { key: 'q5', type: 'buttons', title: 'Насколько подробны ваши воспоминания о снах?', options: ['Очень подробно','Довольно подробно','Не очень подробно'] },
  { key: 'q6', type: 'buttons', title: 'Участвовали ли вы ранее в альфа- или бета-тестировании других приложений?', options: ['Да','Нет'] },
  { key: 'q7', type: 'text', title: 'Что вы ожидаете от инструмента анализа снов?' },
  { key: 'q8', type: 'text', title: 'Какие функции вы хотели бы видеть в приложении для анализа снов?' },
  { key: 'q9', type: 'buttons', title: 'Как вы предпочитаете предоставлять обратную связь?', options: ['Опросы','Интервью','Обратная связь в приложении'] },
  { key: 'q10', type: 'buttons', title: 'Готовы ли вы участвовать в дополнительных интервью или фокус-группах?', options: ['Да','Нет'] },
];



