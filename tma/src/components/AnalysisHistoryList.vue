<template>
  <div class="history-list">
    <details v-for="item in history" :key="item.id" class="history-item" :class="{ 'deep-analysis': isDeepAnalysis }">
      <summary class="history-summary" v-if="isDeepAnalysis">
          Глубокий анализ твоих снов
      </summary>
      <summary class="history-summary" v-else>
          <span>{{ formatDate(item.created_at) }}</span>
        <span class="dream-preview">{{ item.dream_text.substring(0, 50) }}...</span>
      </summary>
      <div class="history-details">
        <template v-if="isDeepAnalysis">
          <p><strong>Анализ:</strong><br><span class="analysis-text">{{ item.analysis }}</span></p>
          <p><strong>Общие символы:</strong><br><span class="analysis-text">{{ item.common_symbols }}</span></p>
        </template>
        <template v-else>
        <p class="dream-text">{{ item.dream_text }}</p>
        <hr>
        <p><strong>Анализ:</strong></p>
        <p class="analysis-text">{{ item.analysis }}</p>
        </template>
      </div>
    </details>
  </div>
</template>

<script setup>
defineProps({
  history: {
    type: Array,
    required: true,
  },
  isDeepAnalysis: {
    type: Boolean,
    default: false,
  },
});

// Функция форматирования даты/времени
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    // Показываем дату и время
    return new Date(dateString).toLocaleString();
  } catch (e) {
    return dateString;
  }
};
</script>

<style scoped>
.history-list {
  max-height: 400px; /* Ограничим высоту, чтобы не было слишком длинно */
  overflow-y: auto; /* Добавим скролл */
}
.history-item {
  border: 1px solid var(--tg-theme-hint-color); /* Граница для аккордеона */
  border-radius: 6px;
  margin-bottom: 8px;
  background-color: var(--tg-theme-bg-color); /* Фон элемента */
}
.history-item.deep-analysis {
  border-color: #3498db; /* Синий контур для глубокого анализа */
  order: -1; /* Всегда наверху списка */
}

.history-item[open] { /* Стиль для открытого аккордеона */
     background-color: var(--tg-theme-secondary-bg-color);
}

.history-summary {
  padding: 10px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}
.history-summary:hover {
    background-color: rgba(0,0,0,0.05);
}
.dream-preview {
    font-size: 0.9em;
    color: var(--tg-theme-hint-color);
    margin-left: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 60%; /* Ограничим ширину превью */
}

.history-details {
  padding: 0 15px 15px 15px; /* Отступы для контента */
  border-top: 1px solid var(--tg-theme-hint-color);
  margin-top: 10px; /* Отступ сверху */
}
.dream-text, .analysis-text {
    white-space: pre-wrap; /* Сохраняем переносы строк */
    word-wrap: break-word; /* Переносим длинные слова */
    font-size: 0.95em;
    line-height: 1.5;
}
hr {
    border: none;
    border-top: 1px solid var(--tg-theme-hint-color);
    margin: 10px 0;
}
</style>
