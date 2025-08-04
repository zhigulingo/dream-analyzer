<template>
  <div class="history-list">
    <div v-for="item in history" :key="item.id" class="history-item">
      <div class="history-summary" @click="toggleItem(item.id)">
        <h3 class="dream-title">{{ getDreamTitle(item.dream_text) }}</h3>
        <span class="dream-date">{{ formatRelativeDate(item.created_at) }}</span>
      </div>
      <Transition name="expand">
        <div v-if="isItemOpen(item.id)" class="history-details">
          <div class="detail-section">
            <h4 class="detail-label">Сон:</h4>
            <p class="dream-text">{{ item.dream_text }}</p>
          </div>
          <div class="detail-divider"></div>
          <div class="detail-section">
            <h4 class="detail-label">Анализ:</h4>
            <p class="analysis-text">{{ item.analysis }}</p>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ru'

dayjs.extend(relativeTime)
dayjs.locale('ru')

const props = defineProps({
  history: {
    type: Array,
    required: true,
  },
  activeItem: {
    type: [String, Number],
    default: null,
  },
});

const emit = defineEmits(['toggle-item']);

const toggleItem = (itemId) => {
  emit('toggle-item', itemId);
};

const isItemOpen = (itemId) => {
  return props.activeItem === itemId;
};

const getDreamTitle = (dreamText) => {
  if (!dreamText) return 'Без названия'
  const title = dreamText.length > 50 ? dreamText.substring(0, 47) + '...' : dreamText
  return title
}

const formatRelativeDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = dayjs(dateString)
    const now = dayjs()
    const diffDays = now.diff(date, 'day')
    
    if (diffDays === 0) return 'Сегодня'
    if (diffDays === 1) return 'Вчера'
    if (diffDays < 7) return `${diffDays} дня назад`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} недели назад`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} месяца назад`
    return `${Math.floor(diffDays / 365)} года назад`
  } catch (e) {
    return dateString;
  }
};
</script>

<style scoped>
/* Transition styles */
.expand-enter-active, .expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to, .expand-leave-from {
  max-height: 500px;
  opacity: 1;
}

.history-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  max-width: 72rem;
  margin: 0 auto;
  width: 100%;
}

/* Адаптивная сетка */
@media (min-width: 768px) {
  .history-list {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (min-width: 1024px) {
  .history-list {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
}

@media (min-width: 1280px) {
  .history-list {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 32px;
  }
}

.history-item {
  background: #4A58FF;
  border-radius: 60px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  min-height: 120px;
  height: auto;
}

.history-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(74, 88, 255, 0.3);
}

.history-item:active {
  transform: scale(0.98);
}

.history-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 48px;
  color: white;
  flex: 1;
  min-height: 100px;
}

.dream-title {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 20px;
  line-height: 1.2;
  color: #FFFFFF;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 24px;
  text-align: left;
}

.dream-date {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
}

.history-details {
  padding: 0 48px 32px;
  color: white;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-label {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 16px;
  color: #FFFFFF;
  margin: 0 0 8px 0;
}

.detail-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 20px 0;
}

.dream-text, .analysis-text {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

/* Responsive styles */
@media (max-width: 768px) {
  .history-summary {
    padding: 24px 32px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .dream-title {
    font-size: 18px;
    margin-right: 0;
    white-space: normal;
    text-overflow: unset;
    overflow: visible;
  }
  
  .dream-date {
    font-size: 14px;
    align-self: flex-end;
  }
  
  .history-details {
    padding: 0 32px 24px;
  }
  
  .detail-label {
    font-size: 14px;
  }
  
  .dream-text, .analysis-text {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .history-summary {
    padding: 20px 24px;
  }
  
  .dream-title {
    font-size: 16px;
  }
  
  .dream-date {
    font-size: 12px;
    padding: 6px 12px;
  }
  
  .history-details {
    padding: 0 24px 20px;
  }
  
  .dream-text, .analysis-text {
    font-size: 12px;
  }
}
</style>
