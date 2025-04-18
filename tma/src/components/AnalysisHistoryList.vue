<template>
  <div class="history-list">
    <details v-for="item in history" :key="item.id" class="history-item" v-if="!item.is_deep_analysis">
      <summary class="history-summary">
        <span>{{ formatDate(item.created_at) }}</span>
        <span class="dream-preview">{{ item.dream_text.substring(0, 50) }}...</span>
      </summary>
      <div class="history-details">
        <p><strong>Сон:</strong></p>
        <p class="dream-text">{{ item.dream_text }}</p>
        <hr>
        <p><strong>Анализ:</strong></p>
        <p class="analysis-text">{{ item.analysis }}</p>
      </div>
    </details>
    <div v-if="deepAnalysis" class="deep-analysis-item">
      <h2>Глубокий анализ</h2>
      <div class="analysis-text" v-html="deepAnalysis.analysis"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  history: {
    type: Array,
    required: true,
  },
});

const deepAnalysis = computed(() => props.history.find(item => item.is_deep_analysis));
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
  border: 2px solid var(--tg-theme-accent-text-color);
  border-radius: 6px;
  margin-bottom: 8px;
  padding: 10px;
  background-color: var(--tg-theme-secondary-bg-color);
}

.deep-analysis-item h2 {
  margin-top: 0;
}
</style>
