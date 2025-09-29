import { defineStore } from 'pinia';

const TOTAL_QUESTIONS = 8;

export const useSurveyStore = defineStore('survey', {
  state: () => ({
    stage: 'start', // 'start' | 'survey' | 'finish'
    index: 0,
    sessionId: null,
    answers: {
      q1: null,
      q2: null,
      q3: null,
      q4: null,
      q6: null,
      q7: '',
      q8: '',
      q9: null,
    },
    total: TOTAL_QUESTIONS,
    clientId: generateClientId(),
  }),
  actions: {
    startSurvey() {
      // Всегда начинаем заново: очищаем ответы и ставим первый вопрос
      this.stage = 'survey';
      this.index = 0;
      this.sessionId = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      this.answers = { q1: null, q2: null, q3: null, q4: null, q6: null, q7: '', q8: '', q9: null };
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
      this.answers = { q1: null, q2: null, q3: null, q4: null, q6: null, q7: '', q8: '', q9: null };
      this.persist();
    },
    persist() {
      localStorage.setItem('survey_state', JSON.stringify({ stage: this.stage, index: this.index, answers: this.answers, clientId: this.clientId, sessionId: this.sessionId }));
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
        this.sessionId = data.sessionId || this.sessionId;
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
  const buttonQs = ['q1','q2','q3','q4','q6','q9'];
  if (buttonQs.includes(key)) return typeof value === 'string' && value.length > 0;
  if (key === 'q7' || key === 'q8') return typeof value === 'string' && value.trim().length > 3;
  return false;
}

export const QUESTIONS = [
  { key: 'q1', type: 'buttons', title: 'Как часто вы помните свои сны?', options: ['Никогда','Иногда','Часто','Почти каждый день'] },
  { key: 'q2', type: 'buttons', title: 'Записываете ли вы сны?', options: ['Нет','Иногда','Да, регулярно'] },
  { key: 'q3', type: 'buttons', title: 'Когда вы видите необычный сон, пытаетесь ли понять, что он может значить?', options: ['Нет','Иногда думаю','Часто стараюсь найти смысл'] },
  { key: 'q4', type: 'buttons', title: 'Сколько времени вы готовы уделять описанию сна в приложении?', options: ['До 5 минут','5–10 минут','10+ минут'] },
  { key: 'q6', type: 'buttons', title: 'Участвовали ли вы ранее в альфа- или бета-тестировании других приложений?', options: ['Да','Нет'] },
  { key: 'q7', type: 'text', title: 'Что вы ожидаете от инструмента анализа снов?' },
  { key: 'q8', type: 'text', title: 'Какие функции вы хотели бы видеть в приложении для анализа снов?' },
  { key: 'q9', type: 'buttons', title: 'Как вы предпочитаете предоставлять обратную связь?', options: ['Опросы','Интервью','Обратная связь в приложении'] },
];



