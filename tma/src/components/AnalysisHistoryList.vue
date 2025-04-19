<template>
  <div class="history-list">
    <!-- Используем v-for для итерации -->
    <template v-for="item in history" :key="item.id">
      <!-- Отображаем обычный анализ, если is_deep_analysis === false -->
      <details v-if="item && item.is_deep_analysis === false" class="history-item">
        <summary class="history-summary">
          <span>{{ formatDate(item.created_at) }}</span>
          <!-- Добавляем optional chaining на случай отсутствия dream_text -->
          <span class="dream-preview">{{ item.dream_text?.substring(0, 50) }}...</span>
        </summary>
        <div class="history-details">
          <p><strong>Сон:</strong></p>
          <p class="dream-text">{{ item.dream_text }}</p>
          <hr>
          <p><strong>Анализ:</strong></p>
          <p class="analysis-text">{{ item.analysis }}</p>
        </div>
      </details>
    </template>

    <!-- Отображаем глубокий анализ отдельно, если он есть -->
    <div v-if="deepAnalysis" class="deep-analysis-item">
      <h2>Глубокий анализ</h2>
      <div class="analysis-text" v-html="deepAnalysis.analysis"></div>
    </div>
  </div>
</template>

<script setup>
// Добавляем импорты onMounted и toRefs
import { computed, onMounted, toRefs } from 'vue';

const props = defineProps({
  history: {
    type: Array,
    required: true,
  },
});

// Используем toRefs для получения реактивной ссылки на пропсы
const { history } = toRefs(props);

// Логгируем данные, которые компонент получил при монтировании
onMounted(() => {
  console.log('[AnalysisHistoryList] History prop on mount:', JSON.stringify(history.value));
});

// Вычисляемое свойство для глубокого анализа стало немного безопаснее
const deepAnalysis = computed(() => history.value.find(item => item && item.is_deep_analysis === true));

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleString();
  } catch (e) {
    return dateString;
  }
};
</script>

<style scoped>
/* Стили остаются без изменений */
.history-list {
  max-height: 80vh;
  overflow: auto;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.history-item {
  border: 1px solid var(--tg-theme-hint-color);
  border-radius: 6px;
  margin-bottom: 8px;
  background-color: var(--tg-theme-bg-color);
}

.history-item[open] {
  background-color: var(--tg-theme-secondary-bg-color);
}

.history-summary {
  padding: 10px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  white-space: nowrap;
  width: 100%;
  box-sizing: border-box;
}

.history-summary:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.dream-preview {
  font-size: 0.9em;
  color: var(--tg-theme-hint-color);
  margin-left: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}

.history-details {
  padding: 0 15px 15px 15px;
  border-top: 1px solid var(--tg-theme-hint-color);
  margin-top: 10px;
}

.dream-text,
.analysis-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 0.95em;
  line-height: 1.5;
}

hr {
  border: none;
  border-top: 1px solid var(--tg-theme-hint-color);
  margin: 10px 0;
}

.deep-analysis-item {
  border: 2px solid var(--tg-theme-accent-text-color); /* Используем акцентный цвет для выделения */
  border-radius: 6px;
  margin-bottom: 8px;
  padding: 10px;
  background-color: var(--tg-theme-secondary-bg-color); /* Используем вторичный фон */
}

.deep-analysis-item h2 {
  margin-top: 0;
  color: var(--tg-theme-text-color); /* Цвет текста заголовка */
}
</style>
